from calendar import monthrange
from datetime import date
from http.client import HTTPException

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from app.auth import get_current_user  # already imported in your file
from app.models.users import User

from app.database import get_db
from app.models import (
    CropProductionData,
    FarmerRegistration,
    SystemCodeDetail,
    CountyTbl
)
from math import ceil


router = APIRouter(prefix="/yield/report", tags=["Yield Reports"])

# Separate router because the frontend calls /yield/trends (no "/report"),
# which doesn't fit under the /yield/report prefix above.
# Register this in app/main.py alongside the existing router:
#   app.include_router(yield_reports.router)
#   app.include_router(yield_reports.yield_trends_router)
yield_trends_router = APIRouter(prefix="/yield", tags=["Yield Reports"])

# ── Expected yield potential (kg per acre), per crop ────────────────────────
# Source: KALRO TIMP Portal / standard Kenyan agricultural benchmarks,
# using the LOW END of each published range (converted to per-acre kg).
# These still reflect Good Agricultural Practice (GAP) conditions, just the
# more conservative end — achievement_pct may still read low for farmers
# without certified inputs, irrigation, etc. Treat as "vs. potential," not
# "vs. peers."
#
# NOTE: Beans uses the LOCAL seed benchmark (low end: 3 bags/acre), not
# Improved/Certified — matches typical smallholder seed stock.
#
# NOTE: Tea, Coffee, and Sugarcane figures are annual/per-cycle yields
# (sugarcane specifically per 14–18 month cycle) — multiple harvest log
# entries within one cycle for the same crop may distort achievement_pct.
EXPECTED_YIELD_PER_ACRE = {
    "Maize":                  1800,   # low end: 20 bags (90kg)
    "Rice":                   2200,   # low end: 2.2 t/acre (Mwea irrigation schemes)
    "Millet":                  450,   # low end: 5 bags (90kg)
    "Sorghum":                1400,   # low end: 1.4 t/acre
    "Beans":                   270,   # Local seed, low end: 3 bags (90kg)
    "Potato":                 4000,   # low end: 80 bags (50kg)
    "SweetPotato":            4000,   # low end: 4 t/acre
    "Cassava":                8000,   # low end: 8 t/acre
    "Tomato":                15000,   # low end: 15 t/acre
    "Onion":                 12000,   # low end: 12 t/acre
    "Cabbage":                20000,  # low end: 20 t/acre
    "Kale":                   16000,  # low end: 16 t/acre
    "Watermelon":             15000,  # low end: 15 t/acre
    "Cucumber":               8000,   # low end: 8 t/acre
    "Pumpkin":                6000,   # low end: 6 t/acre
    "Banana":                 12000,  # low end: 12 t/acre
    "Citrus":                 8000,   # low end: 8 t/acre
    "Mango":                  10000,  # low end: 10 t/acre
    "Avocado":                8000,   # low end: 8 t/acre
    "Tea":                    3500,   # low end: 3,500 kg/acre annually
    "Coffee":                 1500,   # low end: 1,500 kg/acre annually
    "Sugarcane":              30000,  # low end: 30 t/acre per harvest cycle
    "Wheat":                  1350,   # low end: 15 bags (90kg), high-altitude regions
    "AfricanLeafyVegetables": 6000,   # low end: 6 t/acre (continuous picking, 2–3 mo window)
}
DEFAULT_EXPECTED_YIELD_PER_ACRE = 2500  # fallback for any crop not in the dict above


def get_expected_rate(crop_name: str) -> float:
    """Expected kg/acre for a given crop, falling back to the default."""
    return EXPECTED_YIELD_PER_ACRE.get(crop_name, DEFAULT_EXPECTED_YIELD_PER_ACRE)


def _rate_case():
    """SQL CASE expression applying the per-crop rate inside an aggregate query."""
    return case(
        {crop_name: rate for crop_name, rate in EXPECTED_YIELD_PER_ACRE.items()},
        value=SystemCodeDetail.code_value,
        else_=DEFAULT_EXPECTED_YIELD_PER_ACRE
    )

    
# ── NEW: real filter options for the report dropdowns ───────────────────────
# The frontend previously hardcoded its County and Crop dropdown lists.
# The County list included town names (Eldoret, Thika, Malindi, Kitale)
# that are NOT how they're stored in CountyTbl.name — those are towns
# inside Uasin Gishu, Kiambu, Kilifi, and Trans Nzoia counties respectively.
# Filtering by them silently returns zero rows. The Crop list was also
# missing most crops defined in EXPECTED_YIELD_PER_ACRE (Potato, Tomato,
# Banana, etc.), so those crops could never be filtered on at all.
# This endpoint returns the real, tenant-scoped, actually-present values.
@router.get("/filters")
def report_filters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    counties = (
        db.query(CountyTbl.name)
        .join(FarmerRegistration, FarmerRegistration.county_id == CountyTbl.id)
        .join(CropProductionData, CropProductionData.FarmerRegistrationId == FarmerRegistration.id)
        .filter(CropProductionData.tenant_id == current_user.tenant_id)
        .distinct()
        .order_by(CountyTbl.name)
        .all()
    )

    crops = (
        db.query(SystemCodeDetail.code_value)
        .join(CropProductionData, CropProductionData.MainCropId == SystemCodeDetail.id)
        .filter(
            SystemCodeDetail.code_type == "MainCrop",
            CropProductionData.tenant_id == current_user.tenant_id,
        )
        .distinct()
        .order_by(SystemCodeDetail.code_value)
        .all()
    )

    return {
        "counties": [c[0] for c in counties if c[0]],
        "crops": [c[0] for c in crops if c[0]],
    }


@router.get("/summary")
def summary(
    county: str = Query(None),
    crop: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rate_case = _rate_case()

    query = (
        db.query(
            CountyTbl.name.label("county"),
            SystemCodeDetail.code_value.label("crop_type"),

            func.sum(CropProductionData.AcreagePerCrop * rate_case).label("expected"),

            func.sum(CropProductionData.YieldQuantityInKg).label("actual"),

            (
                func.sum(CropProductionData.YieldQuantityInKg) /
                func.nullif(func.sum(CropProductionData.AcreagePerCrop * 0.404686), 0)
            ).label("avg_per_hectare")
        )
        .select_from(CropProductionData)

        .join(FarmerRegistration, FarmerRegistration.id == CropProductionData.FarmerRegistrationId)

        .join(CountyTbl, CountyTbl.id == FarmerRegistration.county_id)

        .join(SystemCodeDetail, SystemCodeDetail.id == CropProductionData.MainCropId)

        .filter(
            SystemCodeDetail.code_type == "MainCrop",
            CropProductionData.tenant_id == current_user.tenant_id,
        )
    )

    if county:
        query = query.filter(CountyTbl.name == county)

    if crop:
        query = query.filter(SystemCodeDetail.code_value == crop)

    rows = query.group_by(
        CountyTbl.name,
        SystemCodeDetail.code_value
    ).all()

    result = []

    for i, r in enumerate(rows, start=1):

        expected = float(r.expected or 0)
        actual = float(r.actual or 0)

        achievement = round((actual / expected * 100), 2) if expected else None

        if achievement is None:
            rating = "No data"
        elif achievement >= 80:
            rating = "Excellent"
        elif achievement >= 50:
            rating = "Moderate"
        else:
            rating = "Low"

        result.append({
            "id": i,
            "county": r.county,
            "crop_type": r.crop_type,
            "total_expected_yield": round(expected, 2),
            "total_actual_yield": round(actual, 2),
            "achievement_pct": achievement,
            "avg_yield_per_hectare": round(float(r.avg_per_hectare or 0), 2),
            "top_performing": rating,
        })

    return {"data": result}


@router.get("/detailed")
def detailed(
    page: int = 1,
    page_size: int = 10,
    county: str = Query(None),
    crop: str = Query(None),
    name: str = Query(None),
    reg_no: str = Query(None),
    sort_by: str = Query(None, description="One of: regNo, farmerName, cropType, county, farmSizeHa, expectedYield, actualYield, achievementPct"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rate_case = _rate_case()

    query = (
        db.query(
            CropProductionData,
            FarmerRegistration,
            SystemCodeDetail,
            CountyTbl
        )
        .select_from(CropProductionData)
        .join(FarmerRegistration, FarmerRegistration.id == CropProductionData.FarmerRegistrationId)
        .join(CountyTbl, CountyTbl.id == FarmerRegistration.county_id)
        .join(SystemCodeDetail, SystemCodeDetail.id == CropProductionData.MainCropId)
        .filter(
            SystemCodeDetail.code_type == "MainCrop",
            CropProductionData.tenant_id == current_user.tenant_id,
        )
    )

    if county:
        query = query.filter(CountyTbl.name == county)

    if crop:
        query = query.filter(SystemCodeDetail.code_value == crop)

    if name:
        # BUGFIX: FirstName + MiddleName + Surname breaks for any farmer with a
        # NULL MiddleName — string concatenation with NULL returns NULL in SQL,
        # so the whole ilike() comparison silently evaluates to false and those
        # farmers never match a name search. coalesce() treats NULL as "".
        query = query.filter(
            (FarmerRegistration.FirstName + " " +
             func.coalesce(FarmerRegistration.MiddleName, "") + " " +
             FarmerRegistration.Surname
            ).ilike(f"%{name}%")
        )

    if reg_no:
        query = query.filter(FarmerRegistration.farmer_lookup_code.ilike(f"%{reg_no}%"))

    total = query.count()

    # BUGFIX: previously there was no server-side sort at all, so the frontend's
    # "sort by column" clicks only reordered the 10-50 rows already on the current
    # page — not the full filtered dataset. Sort here, before pagination, instead.
    expected_expr = CropProductionData.AcreagePerCrop * rate_case
    achievement_expr = case(
        (expected_expr > 0, CropProductionData.YieldQuantityInKg / expected_expr * 100),
        else_=None,
    )
    sortable_columns = {
        "regNo": FarmerRegistration.farmer_lookup_code,
        "farmerName": (
            FarmerRegistration.FirstName + " " +
            func.coalesce(FarmerRegistration.MiddleName, "") + " " +
            FarmerRegistration.Surname
        ),
        "cropType": SystemCodeDetail.code_value,
        "county": CountyTbl.name,
        "farmSizeHa": CropProductionData.AcreagePerCrop * 0.404686,
        "expectedYield": expected_expr,
        "actualYield": CropProductionData.YieldQuantityInKg,
        "achievementPct": achievement_expr,
    }
    sort_col = sortable_columns.get(sort_by)
    if sort_col is not None:
        order_expr = sort_col.desc() if sort_dir == "desc" else sort_col.asc()
        # Missing-acreage rows have a NULL achievement — always push them to the
        # end regardless of direction rather than letting them sort as "0".
        query = query.order_by(order_expr.nullslast())
    else:
        query = query.order_by(CropProductionData.id.asc())

    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []

    for p, f, c, county_obj in rows:

        acreage = float(p.AcreagePerCrop or 0)
        has_acreage_data = acreage > 0

        expected_rate = get_expected_rate(c.code_value)
        expected = acreage * expected_rate
        actual = float(p.YieldQuantityInKg or 0)

        # BUGFIX: previously a missing/zero acreage record silently scored
        # achievement=0 and got labeled "Needs improvement" — indistinguishable
        # from a genuinely poor-performing farmer. That polluted the low-
        # performer list and the achievement distribution. Now it reports
        # achievement_pct=None with has_acreage_data=False so the frontend can
        # exclude it from performance stats and surface it as a data-quality
        # issue instead of a performance one.
        achievement = round((actual / expected * 100), 2) if expected else None

        farmer_name = " ".join(filter(None, [
            f.FirstName,
            f.MiddleName,
            f.Surname
        ])).strip()

        if achievement is None:
            notes = "Missing acreage data"
        elif achievement >= 80:
            notes = "High performing"
        elif achievement >= 50:
            notes = "Average performance"
        else:
            notes = "Needs improvement"

        result.append({
            "id": p.id,
            "reg_no": f.farmer_lookup_code,
            "farmer_name": farmer_name,
            "county": county_obj.name if county_obj else None,
            "crop_type": c.code_value,

            "farm_size": f"{acreage} acres",
            "farm_size_ha": round(acreage * 0.404686, 2),

            "expected_yield": round(expected, 2),
            "actual_yield": round(actual, 2),
            "achievement_pct": achievement,
            "has_acreage_data": has_acreage_data,

            "notes": notes,
        })

    return {
        "data": result,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": ceil(total / page_size) if total else 1
        }
    }


# ── Farmer-scoped harvest/crop-production records ──────────────────────────────
@router.get("/farmer/{farmer_id}/harvests")
def get_farmer_harvests(
    farmer_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """CropProductionData rows for one farmer (tenant-scoped)."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    rows = (
        db.query(CropProductionData, SystemCodeDetail)
        .join(
            SystemCodeDetail,
            CropProductionData.MainCropId == SystemCodeDetail.id
        )
        .filter(
            CropProductionData.FarmerRegistrationId == farmer_id,
            CropProductionData.tenant_id == current_user.tenant_id,
            SystemCodeDetail.code_type == "MainCrop",
        )
        .order_by(CropProductionData.CreatedOn.desc())
        .limit(limit)
        .all()
    )

    from collections import defaultdict
    crop_totals = defaultdict(lambda: {
        "quantity": 0.0,
        "acreage": 0.0,
        "latest_date": None,
        "count": 0,
    })

    for prod, crop_detail in rows:
        name = crop_detail.code_value
        qty  = float(prod.YieldQuantityInKg or 0)
        ac   = float(prod.AcreagePerCrop or 0)
        dt   = prod.CreatedOn

        crop_totals[name]["quantity"]    += qty
        crop_totals[name]["acreage"]     += ac
        crop_totals[name]["count"]       += 1
        if dt and (
            crop_totals[name]["latest_date"] is None
            or dt > crop_totals[name]["latest_date"]
        ):
            crop_totals[name]["latest_date"] = dt

    PRICE_PER_KG = 15  # KES placeholder — replace with real price table later

    results = []
    for crop_name, totals in crop_totals.items():
        qty      = totals["quantity"]
        acreage  = totals["acreage"]
        income   = round(qty * PRICE_PER_KG, 0)

        expected_rate = get_expected_rate(crop_name)
        expected = acreage * expected_rate
        achievement = round((qty / expected * 100), 1) if expected > 0 else None

        results.append({
            "crop":            crop_name,
            "quantity":        round(qty, 2),
            "unit":            "kg",
            "acreage":         round(acreage, 2),
            "date":            totals["latest_date"].strftime("%Y-%m-%d") if totals["latest_date"] else None,
            "field":           f"{totals['count']} record(s)",
            "status":          "Sold" if qty > 0 else "Stored",
            "income":          income,
            "achievement_pct": achievement,
        })

    results.sort(key=lambda x: x["date"] or "", reverse=True)

    total_yield    = sum(r["quantity"] for r in results)
    total_acreage  = sum(r["acreage"]  for r in results)
    avg_per_acre   = round(total_yield / total_acreage, 2) if total_acreage > 0 else 0
    latest_date    = results[0]["date"] if results else None

    return {
        "harvests":     results,
        "total_yield":  round(total_yield, 2),
        "avg_per_acre": avg_per_acre,
        "latest_date":  latest_date,
        "total_income": sum(r["income"] for r in results),
    }



@router.get("/low-performers")
def low_performers(
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lowest achievement_pct FARMERS (not crop records) for this tenant.
    A farmer is flagged if ANY of their crops falls below 50% achievement.
    Shows their worst-performing crop as the representative record."""
    rows = (
        db.query(CropProductionData, FarmerRegistration, SystemCodeDetail, CountyTbl)
        .join(FarmerRegistration, FarmerRegistration.id == CropProductionData.FarmerRegistrationId)
        .join(CountyTbl, CountyTbl.id == FarmerRegistration.county_id)
        .join(SystemCodeDetail, SystemCodeDetail.id == CropProductionData.MainCropId)
        .filter(
            CropProductionData.tenant_id == current_user.tenant_id,
            SystemCodeDetail.code_type == "MainCrop",
        )
        .all()
    )

    # Group every scored crop record by farmer first
    from collections import defaultdict
    by_farmer = defaultdict(list)

    for p, f, c, county_obj in rows:
        acreage = float(p.AcreagePerCrop or 0)
        if acreage <= 0:
            continue  # can't score fairly without acreage

        expected_rate = get_expected_rate(c.code_value)
        expected = acreage * expected_rate
        actual = float(p.YieldQuantityInKg or 0)
        if expected <= 0:
            continue

        achievement = round((actual / expected * 100), 1)
        farmer_name = " ".join(filter(None, [f.FirstName, f.MiddleName, f.Surname])).strip()

        by_farmer[f.id].append({
            "reg_no":          f.farmer_lookup_code,
            "farmer_name":     farmer_name,
            "county":          county_obj.name if county_obj else None,
            "crop_type":       c.code_value,
            "achievement_pct": achievement,
        })

    # Flag a farmer if ANY of their crops is below 50% — represent them
    # by their single worst-performing crop, plus a count of how many
    # crops in total are flagged for that farmer.
    flagged_farmers = []
    for farmer_id, crop_records in by_farmer.items():
        flagged = [r for r in crop_records if r["achievement_pct"] < 50]
        if not flagged:
            continue

        worst = min(flagged, key=lambda r: r["achievement_pct"])
        worst["flagged_crop_count"] = len(flagged)
        flagged_farmers.append(worst)

    flagged_farmers.sort(key=lambda x: x["achievement_pct"])
    return {"farmers": flagged_farmers[:limit], "total_flagged_farmers": len(flagged_farmers)}

# ── NEW: Acreage data-quality coverage ──────────────────────────────────────
@router.get("/acreage-coverage")
def acreage_coverage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """% of CropProductionData rows for this tenant that have acreage recorded.
    Used to warn when yield-per-hectare figures may be skewed by missing data."""
    total = (
        db.query(func.count(CropProductionData.id))
        .filter(CropProductionData.tenant_id == current_user.tenant_id)
        .scalar()
    ) or 0

    missing = (
        db.query(func.count(CropProductionData.id))
        .filter(
            CropProductionData.tenant_id == current_user.tenant_id,
            (CropProductionData.AcreagePerCrop == None) | (CropProductionData.AcreagePerCrop == 0)  # noqa: E711
        )
        .scalar()
    ) or 0

    coverage_pct = round(((total - missing) / total * 100), 1) if total > 0 else 0.0

    return {
        "total_records":   total,
        "missing_acreage": missing,
        "coverage_pct":    coverage_pct,
    }


# ── NEW: Season-over-season achievement comparison ──────────────────────────
def _get_season_boundaries(reference_date: date):
    """Kenya has two broad rain seasons: Long Rains (Mar–Aug) and
    Short Rains (Sep–Feb, spans a calendar year boundary). Given a
    reference date, return the current season's and previous season's
    label + date range."""
    m, y = reference_date.month, reference_date.year

    def feb_end(year: int) -> date:
        # monthrange handles leap years correctly (28 vs 29) instead of a
        # hardcoded 28, which used to silently drop Feb 29 data every leap year.
        return date(year, 2, monthrange(year, 2)[1])

    if 3 <= m <= 8:
        current  = {"label": f"Long Rains {y}",            "start": date(y, 3, 1),   "end": date(y, 8, 31)}
        previous = {"label": f"Short Rains {y - 1}/{y}",    "start": date(y - 1, 9, 1), "end": feb_end(y)}
    elif m >= 9:
        current  = {"label": f"Short Rains {y}/{y + 1}",    "start": date(y, 9, 1),   "end": feb_end(y + 1)}
        previous = {"label": f"Long Rains {y}",              "start": date(y, 3, 1),   "end": date(y, 8, 31)}
    else:  # Jan/Feb — still inside the short rains season that started last September
        current  = {"label": f"Short Rains {y - 1}/{y}",    "start": date(y - 1, 9, 1), "end": feb_end(y)}
        previous = {"label": f"Long Rains {y - 1}",          "start": date(y - 1, 3, 1), "end": date(y - 1, 8, 31)}

    return {"current": current, "previous": previous}


@router.get("/seasonal-comparison")
def seasonal_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rate_case = _rate_case()
    seasons = _get_season_boundaries(date.today())

    def achievement_for_range(start: date, end: date) -> float:
        row = (
            db.query(
                func.sum(CropProductionData.YieldQuantityInKg).label("actual"),
                func.sum(CropProductionData.AcreagePerCrop * rate_case).label("expected"),
            )
            .join(SystemCodeDetail, SystemCodeDetail.id == CropProductionData.MainCropId)
            .filter(
                CropProductionData.tenant_id == current_user.tenant_id,
                SystemCodeDetail.code_type == "MainCrop",
                CropProductionData.CreatedOn >= start,
                CropProductionData.CreatedOn <= end,
            )
            .first()
        )
        actual = float(row.actual or 0)
        expected = float(row.expected or 0)
        return round((actual / expected * 100), 1) if expected > 0 else 0.0

    current_pct  = achievement_for_range(seasons["current"]["start"],  seasons["current"]["end"])
    previous_pct = achievement_for_range(seasons["previous"]["start"], seasons["previous"]["end"])

    return {
        "current_season":  {"label": seasons["current"]["label"],  "achievement_pct": current_pct},
        "previous_season": {"label": seasons["previous"]["label"], "achievement_pct": previous_pct},
    }


# ── NEW: Monthly yield trend (expected vs. actual) ──────────────────────────
@yield_trends_router.get("/trends")
def yield_trends(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Monthly expected vs. actual yield totals for this tenant, most recent
    `months` first (returned oldest→newest for chart rendering)."""
    rate_case = _rate_case()

    rows = (
        db.query(
            extract("year",  CropProductionData.CreatedOn).label("yr"),
            extract("month", CropProductionData.CreatedOn).label("mo"),
            func.sum(CropProductionData.YieldQuantityInKg).label("actual"),
            func.sum(CropProductionData.AcreagePerCrop * rate_case).label("expected"),
        )
        .join(SystemCodeDetail, SystemCodeDetail.id == CropProductionData.MainCropId)
        .filter(
            CropProductionData.tenant_id == current_user.tenant_id,
            SystemCodeDetail.code_type == "MainCrop",
        )
        .group_by("yr", "mo")
        .order_by("yr", "mo")
        .all()
    )

    rows = rows[-months:]  # keep only the most recent N months

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    labels   = [month_names[int(r.mo) - 1] for r in rows]
    actual   = [round(float(r.actual or 0), 2) for r in rows]
    expected = [round(float(r.expected or 0), 2) for r in rows]

    return {"labels": labels, "actual": actual, "expected": expected}