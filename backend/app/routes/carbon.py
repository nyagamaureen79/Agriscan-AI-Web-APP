from typing import Optional
from sqlalchemy import case

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session,  joinedload
from sqlalchemy import func
from sqlalchemy import extract
from datetime import datetime
from app.database import get_db
from app.models.farmer import FarmerRegistration
from app.models.farm_profile import FarmProfile
from app.models.sequestration import SequestrationRecord
from app.models.sub_county import SubCountyTbl
from app.models.emission import EmissionRecord
from app.models.farmer_sequestration import FarmerSequestrationActivity
from app.models.sequestration_type import SequestrationType
from calendar import month_abbr
from app.auth import get_current_user
from app.models.users import User
from app.models.tenant import Tenant  
from app.models.county import CountyTbl
from app.models.system_code import SystemCodeDetail
from app.routes.farmers import calculate_age
from app.models.activity_type import ActivityType
from app.models.farmer_activity import FarmerActivity




router = APIRouter(prefix="/carbon", tags=["carbon"])

def month_year_pair(dt: datetime):
    """Return previous month and year for trend calculation."""
    month = dt.month - 1
    year = dt.year
    if month == 0:
        month = 12
        year -= 1
    return month, year

def calculate_trend(current: float, previous: float) -> str:
    """Return trend with + or - percentage compared to previous."""
    if previous == 0:
        return "+" + str(round(current, 2)) if current else "-"
    try:
        change = ((current - previous) / previous) * 100
        sign = "+" if change >= 0 else "-"
        return f"{sign}{abs(round(change, 2))}%"
    except Exception:
        return "-"
    
@router.get("/carbon-stats")
def get_carbon_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    total_removed_kg = db.query(
        func.coalesce(func.sum(SequestrationRecord.carbon_removed), 0)
    ).filter(
        SequestrationRecord.tenant_id == current_user.tenant_id
    ).scalar()

    unique_farmers = db.query(
        func.count(func.distinct(SequestrationRecord.farmer_id))
    ).filter(
        SequestrationRecord.tenant_id == current_user.tenant_id
    ).scalar()

    avg_per_farmer_kg = total_removed_kg / unique_farmers if unique_farmers else 0

    total_raw_kg = db.query(
        func.coalesce(func.sum(SequestrationRecord.raw_carbon_removed), 0)
    ).filter(
        SequestrationRecord.tenant_id == current_user.tenant_id
    ).scalar()

    current_reduction = (
        round((total_removed_kg / total_raw_kg) * 100, 2)
        if total_raw_kg else 0
    )

    return {
        "totalCO2e": round(total_removed_kg, 2),
        "avgPerFarmer": round(avg_per_farmer_kg, 2),
        "currentReduction": current_reduction
    }


@router.get("/top-farmers")
def get_top_farmers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    subquery = (
        db.query(
            SequestrationRecord.farmer_id,
            func.coalesce(func.sum(SequestrationRecord.carbon_removed), 0).label("total_carbon_removed"),
            func.coalesce(func.sum(SequestrationRecord.raw_carbon_removed), 0).label("total_raw_carbon")
        )
        .filter(SequestrationRecord.tenant_id == current_user.tenant_id)
        .group_by(SequestrationRecord.farmer_id)
        .subquery()
    )

    # Query full FarmerRegistration objects and eagerly load sub_county
    top_farmers_query = (
        db.query(FarmerRegistration, subquery.c.total_carbon_removed, subquery.c.total_raw_carbon)
        .options(joinedload(FarmerRegistration.sub_county))
        .join(subquery, FarmerRegistration.id == subquery.c.farmer_id)
        .order_by(subquery.c.total_carbon_removed.desc())
        .limit(8)
        .all()
    )

    top_farmers = []
    for idx, (farmer, total_carbon_removed, total_raw_carbon) in enumerate(top_farmers_query, start=1):
        # Calculate reduction %
        reduction = round((total_carbon_removed / total_raw_carbon) * 100, 2) if total_raw_carbon else 0
        # Convert carbon_removed to tons
        carbon_tons = round(total_carbon_removed / 1000, 2)
        # Sub-county name
        subcounty_name = farmer.sub_county.name if farmer.sub_county else "N/A"

        top_farmers.append({
            "id": farmer.id,
            "rank": idx,
            "name": f"{farmer.FirstName} {farmer.Surname}",
            "subCounty": subcounty_name,
            "carbonScore": carbon_tons,
            "carbonUnit": "t",   # total carbon removed in tons
            "reduction": reduction,      # %
            "progressPercentage": reduction  # can use same as reduction
        })

    return {"topFarmers": top_farmers}



@router.get("/monthly-emissions")
def get_monthly_emissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.utcnow()
    tenant_id = current_user.tenant_id

    # Always anchor the 6-month window to the current calendar month,
    # not to the latest row in EmissionRecord. Anchoring to the latest
    # data row means the chart silently lags behind whenever data entry
    # falls behind real time (e.g. stuck showing Dec-May when it's
    # actually June) instead of showing June with 0 until data lands.
    end_year, end_month = today.year, today.month

    months = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    window_start_year, window_start_month = months[0]

    rows = (
        db.query(
            EmissionRecord.reporting_year,
            EmissionRecord.reporting_month,
            func.coalesce(func.sum(EmissionRecord.emission_value), 0)
        )
        .filter(
            EmissionRecord.tenant_id == tenant_id,
            (
                (EmissionRecord.reporting_year > window_start_year) |
                (
                    (EmissionRecord.reporting_year == window_start_year) &
                    (EmissionRecord.reporting_month >= window_start_month)
                )
            )
        )
        .group_by(
            EmissionRecord.reporting_year,
            EmissionRecord.reporting_month
        )
        .all()
    )

    data = {
        (year, month): float(total)
        for year, month, total in rows
    }

    labels = []
    values = []

    for year, month in months:
        labels.append(f"{month_abbr[month]} {year}")
        values.append(round(data.get((year, month), 0) / 1000, 2))  # kg -> tons

    return {
        "labels": labels,
        "values": values
    }


@router.get("/all")
def get_all_carbon_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Restrict to super admin
    if current_user.role != "super_admin":
        return {"error": "Unauthorized"}

    # 🔹 Aggregate sequestration per farmer per tenant
    subquery = (
        db.query(
            SequestrationRecord.tenant_id,
            SequestrationRecord.farmer_id,
            func.sum(SequestrationRecord.carbon_removed).label("total_carbon"),
            func.sum(SequestrationRecord.raw_carbon_removed).label("total_raw"),
            func.max(SequestrationRecord.created_at).label("last_recorded"),
        )
        .group_by(
            SequestrationRecord.tenant_id,
            SequestrationRecord.farmer_id
        )
        .subquery()
    )

    # 🔹 Main query
    rows = (
        db.query(
            subquery.c.tenant_id,
            subquery.c.farmer_id,
            subquery.c.total_carbon,
            subquery.c.total_raw,
            subquery.c.last_recorded,

            FarmerRegistration.FirstName,
            FarmerRegistration.Surname,

            SubCountyTbl.name.label("subcounty"),

            Tenant.company_name.label("tenant_name")
        )
        .join(FarmerRegistration, FarmerRegistration.id == subquery.c.farmer_id)

        # ✅ FIX: correct column name
        .outerjoin(SubCountyTbl, FarmerRegistration.subcounty_id == SubCountyTbl.id)

        .outerjoin(Tenant, Tenant.id == subquery.c.tenant_id)
        .all()
    )

    # 🔹 Build response
    results = []

    for r in rows:
        total_carbon = float(r.total_carbon or 0)
        total_raw = float(r.total_raw or 0)

        reduction = round((total_carbon / total_raw) * 100, 2) if total_raw else 0

        results.append({
            "id": f"{r.tenant_id}-{r.farmer_id}",

            "farmer_id": r.farmer_id,
            "name": f"{r.FirstName or ''} {r.Surname or ''}".strip(),

            "tenant_id": r.tenant_id,
            "tenant_name": r.tenant_name,

            "region": r.subcounty,

            "carbon_score": round(total_carbon, 2),
            "reduction": reduction,

            "recorded_at": (
                r.last_recorded.strftime("%Y-%m-%d")
                if r.last_recorded else None
            ),
        })

    return {"records": results}

@router.get("/emission-sources")
def get_emission_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 🔹 Step 1: Aggregate emissions per activity type (tenant-specific)
        rows = (
            db.query(
                ActivityType.name.label("source"),
                func.coalesce(func.sum(EmissionRecord.co2e_value), 0).label("total")
            )
            .select_from(EmissionRecord)  # anchor query here
            .join(
                FarmerActivity,
                FarmerActivity.farmer_activity_id == EmissionRecord.farmer_activity_id
            )
            .join(
                ActivityType,
                ActivityType.activity_type_id == FarmerActivity.activity_type_id
            )
            .filter(EmissionRecord.tenant_id == current_user.tenant_id)
            .group_by(ActivityType.name)
            .order_by(func.sum(EmissionRecord.co2e_value).desc())
            .all()
        )

        # 🔹 Step 2: Calculate total emissions (for percentages)
        total_emissions = sum(float(row.total or 0) for row in rows)

        # 🔹 Step 3: Build response
        colors = ["#4CAF50", "#FF9800", "#2196F3", "#F44336", "#9C27B0"]

        sources = []
        for i, row in enumerate(rows):
            amount = float(row.total or 0)

            sources.append({
                "name": row.source,
                "amount": round(amount, 2),
                "percentage": round((amount / total_emissions) * 100, 2) if total_emissions else 0,
                "color": colors[i % len(colors)]
            })

        return {
            "totalEmissions": round(total_emissions, 2),
            "sources": sources
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch emission sources")


# ── Sequestration Stats ────────────────────────────────────────────────────────
@router.get("/sequestration-stats")
def get_sequestration_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    KPIs for the Sequestration tab:
      - totalSequestered  : sum of co2e_value across all SequestrationRecords (kg)
      - avgPerFarmer      : totalSequestered / distinct farmers with records
      - netBalance        : totalSequestered - totalEmissions (both co2e_value, kg)
    """
    tenant_id = current_user.tenant_id

    # Total sequestered CO2e (kg)
    total_sequestered = float(
        db.query(func.coalesce(func.sum(SequestrationRecord.co2e_value), 0))
        .filter(SequestrationRecord.tenant_id == tenant_id)
        .scalar()
    )

    # Distinct farmers who have sequestration records
    unique_farmers = db.query(
        func.count(func.distinct(SequestrationRecord.farmer_id))
    ).filter(
        SequestrationRecord.tenant_id == tenant_id
    ).scalar() or 0

    avg_per_farmer = round(total_sequestered / unique_farmers, 2) if unique_farmers else 0

    # Total emissions CO2e for this tenant (kg)
    total_emissions = float(
        db.query(func.coalesce(func.sum(EmissionRecord.co2e_value), 0))
        .filter(EmissionRecord.tenant_id == tenant_id)
        .scalar()
    )

    net_balance = round(total_sequestered - total_emissions, 2)

    return {
        "totalSequestered": round(total_sequestered, 2),
        "avgPerFarmer":     avg_per_farmer,
        "netBalance":       net_balance,
    }


# ── Monthly Sequestration ──────────────────────────────────────────────────────
@router.get("/monthly-sequestration")
def get_monthly_sequestration(
    year: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns month-by-month sequestered CO2e (kg) for the requested year.
    Defaults to the current calendar year if ?year= is omitted.
    All 12 months are always returned; months with no data show 0.
    """
    tenant_id = current_user.tenant_id
    target_year = year or datetime.utcnow().year

    rows = (
        db.query(
            SequestrationRecord.reporting_month,
            func.coalesce(func.sum(SequestrationRecord.co2e_value), 0).label("total")
        )
        .filter(
            SequestrationRecord.tenant_id == tenant_id,
            SequestrationRecord.reporting_year == target_year,
        )
        .group_by(SequestrationRecord.reporting_month)
        .all()
    )

    # Build a lookup {month_int: value}
    data = {int(month): float(total) for month, total in rows}

    labels = []
    values = []
    for m in range(1, 13):
        labels.append(month_abbr[m])          # "Jan", "Feb", …
        values.append(round(data.get(m, 0), 2))

    return {
        "year":   target_year,
        "labels": labels,
        "values": values,
    }




# ── Sequestration Sources ──────────────────────────────────────────────────────
@router.get("/sequestration-sources")
def get_sequestration_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
 

    try:
        rows = (
            db.query(
                SequestrationType.name.label("source"),
                func.abs(
                    func.coalesce(func.sum(SequestrationRecord.co2e_value), 0)
                ).label("total")
            )
            .select_from(SequestrationRecord)
            .join(
                FarmerSequestrationActivity,
                FarmerSequestrationActivity.farmer_sequestration_id
                == SequestrationRecord.farmer_sequestration_id
            )
            .join(
                SequestrationType,
                SequestrationType.sequestration_type_id
                == FarmerSequestrationActivity.sequestration_type_id
            )
            .filter(SequestrationRecord.tenant_id == current_user.tenant_id)
            .group_by(SequestrationType.name)
            .order_by(func.abs(func.sum(SequestrationRecord.co2e_value)).desc())
            .all()
        )

        grand_total = sum(float(r.total or 0) for r in rows)

        colors = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336"]


        sources = []
        for i, row in enumerate(rows):
            amount = float(row.total or 0)
            sources.append({
                "name":       row.source,
                "amount":     round(amount, 2),
                "percentage": round((amount / grand_total) * 100, 2) if grand_total else 0,
                "color":      colors[i % len(colors)],
            })

        return {
            "totalSequestered": round(grand_total, 2),
            "sources":          sources,
        }

    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch sequestration sources")
    


@router.get("/sequestration-activity-types")
def get_sequestration_activity_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = (
        db.query(SequestrationType.name)
        .join(
            FarmerSequestrationActivity,
            FarmerSequestrationActivity.sequestration_type_id
            == SequestrationType.sequestration_type_id,
        )
        .join(
            SequestrationRecord,
            SequestrationRecord.farmer_sequestration_id
            == FarmerSequestrationActivity.farmer_sequestration_id,
        )
        .filter(
            SequestrationRecord.tenant_id == current_user.tenant_id
        )
        .distinct()
        .order_by(SequestrationType.name.asc())
        .all()
    )

    return {
        "activities": [
            activity.name for activity in activities
        ]
    }

@router.get("/emission-activity-types")
def get_emission_activity_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = (
        db.query(ActivityType.name)
        .join(
            FarmerActivity,
            FarmerActivity.activity_type_id
            == ActivityType.activity_type_id,
        )
        .join(
            EmissionRecord,
            EmissionRecord.farmer_activity_id
            == FarmerActivity.farmer_activity_id,
        )
        .filter(
            EmissionRecord.tenant_id == current_user.tenant_id
        )
        .distinct()
        .order_by(ActivityType.name.asc())
        .all()
    )

    return {
        "activities": [
            activity.name for activity in activities
        ]
    }

    
@router.get("/summary")
def carbon_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    county: Optional[str] = Query(None)
):
    try:
        # 🔹 Emissions per farmer
        emissions_subq = (
            db.query(
                EmissionRecord.farmer_id,
                func.sum(EmissionRecord.co2e_value).label("total_emissions")
            )
            .group_by(EmissionRecord.farmer_id)
            .subquery()
        )

        # 🔹 Sequestration per farmer
        sequestration_subq = (
            db.query(
                SequestrationRecord.farmer_id,
                func.sum(SequestrationRecord.co2e_value).label("total_sequestered")
            )
            .group_by(SequestrationRecord.farmer_id)
            .subquery()
        )
        top_seq_subq = (
            db.query(
                SequestrationRecord.farmer_id,
                SequestrationType.name.label("activity_name"),
                func.sum(SequestrationRecord.co2e_value).label("total"),
                func.row_number().over(
                    partition_by=SequestrationRecord.farmer_id,
                    order_by=func.sum(SequestrationRecord.co2e_value).desc()
            ).label("rn")
        )
        .join(
            FarmerSequestrationActivity,
            FarmerSequestrationActivity.farmer_sequestration_id
            == SequestrationRecord.farmer_sequestration_id
        )
        .join(
            SequestrationType,
            SequestrationType.sequestration_type_id
            == FarmerSequestrationActivity.sequestration_type_id
        )
        .filter(
            SequestrationRecord.tenant_id == current_user.tenant_id
        )
        .group_by(
            SequestrationRecord.farmer_id,
            SequestrationType.name
        )
        .subquery()
    )

        top_emit_subq = (
        db.query(
            EmissionRecord.farmer_id,
            ActivityType.name.label("activity_name"),
            func.sum(EmissionRecord.co2e_value).label("total"),
            func.row_number().over(
            partition_by=EmissionRecord.farmer_id,
            order_by=func.sum(EmissionRecord.co2e_value).desc()
        ).label("rn")
    )
    .join(
        FarmerActivity,
        FarmerActivity.farmer_activity_id
        == EmissionRecord.farmer_activity_id
    )
    .join(
        ActivityType,
        ActivityType.activity_type_id
        == FarmerActivity.activity_type_id
    )
    .filter(
        EmissionRecord.tenant_id == current_user.tenant_id
    )
    .group_by(
        EmissionRecord.farmer_id,
        ActivityType.name
    )
    .subquery()
)

        query = (
            db.query(
                CountyTbl.name.label("county"),

                func.coalesce(func.sum(emissions_subq.c.total_emissions), 0).label("total_emissions"),
                func.coalesce(func.sum(sequestration_subq.c.total_sequestered), 0).label("total_sequestered"),

                func.count(func.distinct(FarmerRegistration.id)).label("farmer_count"),

                func.sum(
                    case(
                        (
                            func.coalesce(sequestration_subq.c.total_sequestered, 0)
                            >
                            func.coalesce(emissions_subq.c.total_emissions, 0),
                            1
                        ),
                        else_=0
                    )
                ).label("eligible_farms"),

                func.max(top_seq_subq.c.activity_name).label("top_seq_activity"),

                func.max(top_emit_subq.c.activity_name).label("top_emit_activity"),
            )
            .join(CountyTbl, CountyTbl.id == FarmerRegistration.county_id)
            .outerjoin(emissions_subq, emissions_subq.c.farmer_id == FarmerRegistration.id)
            .outerjoin(sequestration_subq, sequestration_subq.c.farmer_id == FarmerRegistration.id
            )
            .outerjoin(
    top_seq_subq,
    (top_seq_subq.c.farmer_id == FarmerRegistration.id)
    &
    (top_seq_subq.c.rn == 1)
)
.outerjoin(
    top_emit_subq,
    (top_emit_subq.c.farmer_id == FarmerRegistration.id)
    &
    (top_emit_subq.c.rn == 1)
)
            .filter(FarmerRegistration.tenant_id == current_user.tenant_id)
        )

        if county and county != "All Counties":
            query = query.filter(CountyTbl.name == county)

        query = query.group_by(CountyTbl.name)

        rows = query.all()

        results = []
        for row in rows:
            total_emissions = float(row.total_emissions or 0)
            total_sequestered = float(row.total_sequestered or 0)
            farmer_count = row.farmer_count or 0

            results.append({
                "county": row.county,
                "totalEmissions": total_emissions,
                "avgEmissionsPerFarmer": round(total_emissions / farmer_count, 2) if farmer_count else 0,
                "totalSequestered": total_sequestered,
                "avgSequesteredPerFarmer": round(total_sequestered / farmer_count, 2) if farmer_count else 0,
                "netBalance": total_sequestered - total_emissions,
                "eligibleFarms": int(row.eligible_farms or 0),

                "topSeqActivity": row.top_seq_activity or "-",
                "topEmitActivity": row.top_emit_activity or "-",
            })

        return results

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/detailed")
def carbon_detailed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    county: Optional[str] = Query(None),
    cropType: Optional[str] = Query(None),
    sequestrationActivity: Optional[str] = Query(None),
    emissionActivity: Optional[str] = Query(None),
    page: int = 1,
    pageSize: int = 10
):
    try:
        # 🔹 Emissions per farmer
        emissions_subq = (
            db.query(
                EmissionRecord.farmer_id,
                func.sum(EmissionRecord.co2e_value).label("total_emissions")
            )
            .group_by(EmissionRecord.farmer_id)
            .subquery()
        )

        # 🔹 Sequestration per farmer
        sequestration_subq = (
            db.query(
                SequestrationRecord.farmer_id,
                func.sum(SequestrationRecord.co2e_value).label("total_sequestered")
            )
            .group_by(SequestrationRecord.farmer_id)
            .subquery()
        )
        top_seq_subq = (
    db.query(
        SequestrationRecord.farmer_id.label("farmer_id"),
        SequestrationType.name.label("activity"),
        func.sum(SequestrationRecord.co2e_value).label("total"),
        func.row_number().over(
            partition_by=SequestrationRecord.farmer_id,
            order_by=func.sum(SequestrationRecord.co2e_value).desc(),
        ).label("rn"),
    )
    .join(
        FarmerSequestrationActivity,
        FarmerSequestrationActivity.farmer_sequestration_id
        == SequestrationRecord.farmer_sequestration_id,
    )
    .join(
        SequestrationType,
        SequestrationType.sequestration_type_id
        == FarmerSequestrationActivity.sequestration_type_id,
    )
    .filter(
        SequestrationRecord.tenant_id == current_user.tenant_id,
    )
    .group_by(
        SequestrationRecord.farmer_id,
        SequestrationType.name,
    )
    .subquery()
)
        
        top_emit_subq = (
    db.query(
        EmissionRecord.farmer_id.label("farmer_id"),
        ActivityType.name.label("activity"),
        func.sum(EmissionRecord.co2e_value).label("total"),
        func.row_number().over(
            partition_by=EmissionRecord.farmer_id,
            order_by=func.sum(EmissionRecord.co2e_value).desc(),
        ).label("rn"),
    )
    .join(
        FarmerActivity,
        FarmerActivity.farmer_activity_id
        == EmissionRecord.farmer_activity_id,
    )
    .join(
        ActivityType,
        ActivityType.activity_type_id
        == FarmerActivity.activity_type_id,
    )
    .filter(
        EmissionRecord.tenant_id == current_user.tenant_id,
    )
    .group_by(
        EmissionRecord.farmer_id,
        ActivityType.name,
    )
    .subquery()
)

        query = (
            db.query(
                FarmerRegistration.id,
                FarmerRegistration.FirstName,
                FarmerRegistration.Surname,
                FarmerRegistration.Crops,
                FarmerRegistration.CreatedOn,
                FarmProfile.TotalFarmSize,

                func.coalesce(emissions_subq.c.total_emissions, 0).label("total_emissions"),
                func.coalesce(sequestration_subq.c.total_sequestered, 0).label("total_sequestered"),

                (
                    func.coalesce(sequestration_subq.c.total_sequestered, 0) -
                    func.coalesce(emissions_subq.c.total_emissions, 0)
                ).label("net_balance"),
                top_seq_subq.c.activity.label("top_seq_activity"),
                top_emit_subq.c.activity.label("top_emit_activity"),
            )
            .join(FarmProfile, FarmProfile.FarmerRegistrationId == FarmerRegistration.id)
            .outerjoin(emissions_subq, emissions_subq.c.farmer_id == FarmerRegistration.id)
            .outerjoin(sequestration_subq, sequestration_subq.c.farmer_id == FarmerRegistration.id)
            .outerjoin(
    top_seq_subq,
    (top_seq_subq.c.farmer_id == FarmerRegistration.id)
    &
    (top_seq_subq.c.rn == 1),
)
.outerjoin(
    top_emit_subq,
    (top_emit_subq.c.farmer_id == FarmerRegistration.id)
    &
    (top_emit_subq.c.rn == 1),
)
            .outerjoin(CountyTbl, CountyTbl.id == FarmerRegistration.county_id)
            .filter(FarmerRegistration.tenant_id == current_user.tenant_id)
        )

        # 🔹 Filters
        if county and county != "All Counties":
            query = query.filter(CountyTbl.name == county)

        if cropType and cropType != "All Crops":
            query = query.filter(FarmerRegistration.Crops.ilike(f"%{cropType}%"))

        if sequestrationActivity and sequestrationActivity != "All":
            query = query.filter(
                 top_seq_subq.c.activity == sequestrationActivity
            )

        if emissionActivity and emissionActivity != "All":
            query = query.filter(
                top_emit_subq.c.activity == emissionActivity
            )

        total = query.count()

        # 🔹 Pagination
        rows = query.offset((page - 1) * pageSize).limit(pageSize).all()

        results = []
        for row in rows:
            crops = row.Crops.split(",") if row.Crops else []

            results.append({
                "id": row.id,
                "regNo": f"FRN-{row.CreatedOn.year}{str(row.id).zfill(3)}"
          if row.CreatedOn
          else f"FRN-{str(row.id).zfill(3)}",
                "name": f"{row.FirstName} {row.Surname}",
                "cropType": crops[0] if crops else "N/A",  # frontend expects single value
                "farmSize": float(row.TotalFarmSize or 0),

                "totalEmissions": float(row.total_emissions),
                "totalSequestered": float(row.total_sequestered),
                "netBalance": float(row.net_balance),

                # placeholders
                "topSeqActivity": row.top_seq_activity or "-",
"topEmitActivity": row.top_emit_activity or "-",
            })

        return {
            "data": results,
            "total": total,
            "page": page,
            "pageSize": pageSize
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# from calendar import month_abbr
# from datetime import datetime

# @router.get("/monthly-emissions")
# def get_monthly_emissions(db: Session = Depends(get_db)):
#     today = datetime.utcnow()

    
#     months = []
#     for i in range(5, -1, -1):
#         m = today.month - i
#         y = today.year
#         if m <= 0:
#             m += 12
#             y -= 1
#         months.append((y, m))

#     rows = (
#         db.query(
#             EmissionRecord.reporting_year,
#             EmissionRecord.reporting_month,
#             func.coalesce(func.sum(EmissionRecord.emission_value), 0)
#         )
#         .group_by(
#             EmissionRecord.reporting_year,
#             EmissionRecord.reporting_month
#         )
#         .all()
#     )

#     data = {
#         (year, month): float(total)
#         for year, month, total in rows
#     }

#     labels = []
#     values = []

#     for year, month in months:
#         labels.append(f"{month_abbr[month]} {year}")
#         values.append(round(data.get((year, month), 0) / 1000, 2))  

#     return {
#         "labels": labels,
#         "values": values
#     }



# @router.get("/carbon-stats")
# def get_carbon_stats(db: Session = Depends(get_db)):
#     now = datetime.utcnow()
#     prev_month, prev_year = month_year_pair(now)

   
#     total_co2e = db.query(func.coalesce(func.sum(SequestrationRecord.co2e_value), 0)).scalar()

   
#     unique_farmers = db.query(func.count(func.distinct(SequestrationRecord.farmer_id))).scalar()
#     avg_per_farmer = total_co2e / unique_farmers if unique_farmers else 0

    
#     total_prev = db.query(func.coalesce(func.sum(SequestrationRecord.co2e_value), 0)).filter(
#         SequestrationRecord.reporting_month == prev_month,
#         SequestrationRecord.reporting_year == prev_year
#     ).scalar()

#     current_reduction = calculate_trend(total_co2e, total_prev)

#     return {
#         "totalCO2e": f"{round(total_co2e, 2)} kg" if total_co2e else "-",
#         "avgPerFarmer": f"{round(avg_per_farmer, 2)} kg" if avg_per_farmer else "-",
#         "currentReduction": current_reduction
#     }


# ── Farmer-scoped carbon stats ─────────────────────────────────────────────────
@router.get("/farmer/{farmer_id}/carbon-stats")
def get_farmer_carbon_stats(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Carbon KPIs for a single farmer with real month-over-month trends."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    today = datetime.utcnow()
    current_month = today.month
    current_year  = today.year
    prev_month    = current_month - 1 if current_month > 1 else 12
    prev_year     = current_year if current_month > 1 else current_year - 1

    def seq_sum(column, month: int, year: int) -> float:
        return float(
            db.query(func.coalesce(func.sum(column), 0))
            .filter(
                SequestrationRecord.farmer_id == farmer_id,
                SequestrationRecord.tenant_id == current_user.tenant_id,
                SequestrationRecord.reporting_month == month,
                SequestrationRecord.reporting_year  == year,
            ).scalar()
        )

    def seq_sum_all(column) -> float:
        return float(
            db.query(func.coalesce(func.sum(column), 0))
            .filter(
                SequestrationRecord.farmer_id == farmer_id,
                SequestrationRecord.tenant_id == current_user.tenant_id,
            ).scalar()
        )

    def pct_change(current: float, previous: float):
        if current == 0 and previous == 0:
            return None
        if previous == 0:
            return 100.0
        if current == 0:
            return -100.0
        return round(((current - previous) / abs(previous)) * 100, 1)

    # ── Totals (lifetime) ──────────────────────────────────────────────────────
    # Use abs() so display is always positive regardless of how values
    # are stored — confirm with the SQL check above whether this is needed
    carbon_reduced     = abs(seq_sum_all(SequestrationRecord.carbon_removed))
    carbon_sequestered = abs(seq_sum_all(SequestrationRecord.co2e_value))
    total_raw          = abs(seq_sum_all(SequestrationRecord.raw_carbon_removed))
    net_impact         = carbon_reduced + carbon_sequestered

    reduction_pct = round((carbon_reduced / total_raw) * 100, 2) if total_raw else 0

    # ── Current month ──────────────────────────────────────────────────────────
    cur_reduced = abs(seq_sum(SequestrationRecord.carbon_removed, current_month, current_year))
    cur_seq     = abs(seq_sum(SequestrationRecord.co2e_value,     current_month, current_year))
    cur_impact  = cur_reduced + cur_seq

    # ── Previous month ────────────────────────────────────────────────────────
    prev_reduced = abs(seq_sum(SequestrationRecord.carbon_removed, prev_month, prev_year))
    prev_seq     = abs(seq_sum(SequestrationRecord.co2e_value,     prev_month, prev_year))
    prev_impact  = prev_reduced + prev_seq

    # ── Trends ────────────────────────────────────────────────────────────────
    trend_reduced = pct_change(cur_reduced, prev_reduced)
    trend_seq     = pct_change(cur_seq,     prev_seq)
    trend_impact  = pct_change(cur_impact,  prev_impact)

    return {
        # Values
        "carbon_reduced":     round(carbon_reduced, 2),
        "carbon_sequestered": round(carbon_sequestered, 2),
        "netImpact":          round(net_impact, 2),
        "totalReductions":    round(carbon_reduced, 2),
        "totalSequestered":   round(carbon_sequestered, 2),
        "currentReduction":   reduction_pct,
        # Trends (None = no badge, number = real % change)
        "trend_reduced":      trend_reduced,
        "trend_seq":          trend_seq,
        "trend_impact":       trend_impact,
    }


# ── Farmer-scoped monthly carbon ───────────────────────────────────────────────
@router.get("/farmer/{farmer_id}/monthly-emissions")
def get_farmer_monthly_emissions(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Last 6 months of reduced + sequestered carbon for one farmer,
    window anchored to today (not to the last data row)."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    today = datetime.utcnow()
    end_year, end_month = today.year, today.month

    months = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    window_start_year, window_start_month = months[0]

    # Carbon reduced (SequestrationRecord.carbon_removed)
    reduced_rows = (
        db.query(
            SequestrationRecord.reporting_year,
            SequestrationRecord.reporting_month,
            func.coalesce(func.sum(SequestrationRecord.carbon_removed), 0),
        )
        .filter(
            SequestrationRecord.farmer_id == farmer_id,
            SequestrationRecord.tenant_id == current_user.tenant_id,
            (
                (SequestrationRecord.reporting_year > window_start_year) |
                (
                    (SequestrationRecord.reporting_year == window_start_year) &
                    (SequestrationRecord.reporting_month >= window_start_month)
                )
            ),
        )
        .group_by(
            SequestrationRecord.reporting_year,
            SequestrationRecord.reporting_month,
        )
        .all()
    )

    # Carbon sequestered (SequestrationRecord.co2e_value)
    seq_rows = (
        db.query(
            SequestrationRecord.reporting_year,
            SequestrationRecord.reporting_month,
            func.coalesce(func.sum(SequestrationRecord.co2e_value), 0),
        )
        .filter(
            SequestrationRecord.farmer_id == farmer_id,
            SequestrationRecord.tenant_id == current_user.tenant_id,
            (
                (SequestrationRecord.reporting_year > window_start_year) |
                (
                    (SequestrationRecord.reporting_year == window_start_year) &
                    (SequestrationRecord.reporting_month >= window_start_month)
                )
            ),
        )
        .group_by(
            SequestrationRecord.reporting_year,
            SequestrationRecord.reporting_month,
        )
        .all()
    )

    reduced_dict = {(y, m): float(v) for y, m, v in reduced_rows}
    seq_dict     = {(y, m): float(v) for y, m, v in seq_rows}

    labels, reduced_values, seq_values = [], [], []
    for year, month in months:
        labels.append(f"{month_abbr[month]} {year}")
        reduced_values.append(round(reduced_dict.get((year, month), 0), 2))
        seq_values.append(round(seq_dict.get((year, month), 0), 2))

    return {
        "labels": labels,
        "reducedValues": reduced_values,
        "seqValues": seq_values,
    }