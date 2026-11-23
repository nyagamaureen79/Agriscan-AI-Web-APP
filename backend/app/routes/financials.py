# financials.py
from http.client import HTTPException
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.financial_entry import FinancialEntry
from app.schemas.financial_entry import FinancialStats, MonthlyFinancialData
from sqlalchemy import func, extract, desc, case
from calendar import month_abbr
from datetime import datetime
from sqlalchemy import Integer
from datetime import date
from app.auth import get_current_user
from app.models.users import User
from app.models.farmer import FarmerRegistration
from app.models.entry_category import EntryCategory
from app.models.county import CountyTbl

router = APIRouter(prefix="/api/financials", tags=["Financials"])


def get_last_month_totals(db: Session, tenant_id: int):
    today = date.today()
    current_month = today.month
    current_year = today.year

    if current_month == 1:
        prev_month = 12
        prev_year = current_year - 1
    else:
        prev_month = current_month - 1
        prev_year = current_year

    last_month_revenue = db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0)) \
                           .filter(FinancialEntry.tenant_id == tenant_id,
                                   extract('month', FinancialEntry.EntryDate) == prev_month,
                                   extract('year', FinancialEntry.EntryDate) == prev_year,
                                   FinancialEntry.EntryType == "Income").scalar()

    last_month_expenses = db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0)) \
                            .filter(FinancialEntry.tenant_id == tenant_id,
                                    extract('month', FinancialEntry.EntryDate) == prev_month,
                                    extract('year', FinancialEntry.EntryDate) == prev_year,
                                    FinancialEntry.EntryType == "Expense").scalar()

    last_month_revenue = float(last_month_revenue)
    last_month_expenses = float(last_month_expenses)
    last_month_profit = last_month_revenue - last_month_expenses

    return last_month_revenue, last_month_expenses, last_month_profit


@router.get("/stats", response_model=FinancialStats)
def get_financial_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id

    total_revenue = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.EntryType == "Income",
            FinancialEntry.tenant_id == tenant_id
        )
        .scalar()
    )

    total_expenses = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.EntryType == "Expense",
            FinancialEntry.tenant_id == tenant_id
        )
        .scalar()
    )

    total_transactions = db.query(func.count(FinancialEntry.id)).filter(
        FinancialEntry.tenant_id == tenant_id
    ).scalar()

    net_profit = total_revenue - total_expenses

    # ── Current vs last month, for real percent-change trends ──
    today = date.today()
    current_month = today.month
    current_year = today.year

    current_month_revenue = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Income",
            extract("month", FinancialEntry.EntryDate) == current_month,
            extract("year", FinancialEntry.EntryDate) == current_year,
        )
        .scalar()
    )

    current_month_expenses = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Expense",
            extract("month", FinancialEntry.EntryDate) == current_month,
            extract("year", FinancialEntry.EntryDate) == current_year,
        )
        .scalar()
    )

    current_month_profit = current_month_revenue - current_month_expenses

    current_month_transactions = (
        db.query(func.count(FinancialEntry.id))
        .filter(
            FinancialEntry.tenant_id == tenant_id,
            extract("month", FinancialEntry.EntryDate) == current_month,
            extract("year", FinancialEntry.EntryDate) == current_year,
        )
        .scalar()
    )

    last_month_revenue, last_month_expenses, last_month_profit = get_last_month_totals(db, tenant_id)

    if today.month == 1:
        last_month_num, last_month_year = 12, current_year - 1
    else:
        last_month_num, last_month_year = current_month - 1, current_year

    last_month_transactions = (
        db.query(func.count(FinancialEntry.id))
        .filter(
            FinancialEntry.tenant_id == tenant_id,
            extract("month", FinancialEntry.EntryDate) == last_month_num,
            extract("year", FinancialEntry.EntryDate) == last_month_year,
        )
        .scalar()
    )

    def pct_change(current: float, previous: float) -> float:
        """Percent change vs last month. Returns 0 if there's no
        previous-month baseline to compare against (avoids NaN/Infinity)."""
        if previous == 0:
            return 0.0
        return round(((current - previous) / abs(previous)) * 100, 1)

    trend_revenue = pct_change(current_month_revenue, last_month_revenue)
    trend_expenses = pct_change(current_month_expenses, last_month_expenses)
    trend_profit = pct_change(current_month_profit, last_month_profit)
    trend_transactions = pct_change(current_month_transactions, last_month_transactions)

    return FinancialStats(
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_profit=net_profit,
        total_transactions=total_transactions,
        trend_revenue=trend_revenue,
        trend_expenses=trend_expenses,
        trend_profit=trend_profit,
        trend_transactions=trend_transactions,
    )

@router.get("/farmer/{farmer_id}/stats")
def get_farmer_financial_stats(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Financial KPIs for a single farmer (tenant-scoped)."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    tenant_id = current_user.tenant_id

    total_revenue = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Income",
        ).scalar()
    )
    total_expenses = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Expense",
        ).scalar()
    )
    net_profit = total_revenue - total_expenses

    total_transactions = (
        db.query(func.count(FinancialEntry.id))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
        ).scalar()
    )

    today = date.today()
    current_month = today.month
    current_year = today.year
    prev_month = current_month - 1 if current_month > 1 else 12
    prev_year = current_year if current_month > 1 else current_year - 1

    def month_sum(entry_type: str, month: int, year: int) -> float:
        return float(
            db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
            .filter(
                FinancialEntry.FarmerRegistrationId == farmer_id,
                FinancialEntry.tenant_id == tenant_id,
                FinancialEntry.EntryType == entry_type,
                extract("month", FinancialEntry.EntryDate) == month,
                extract("year",  FinancialEntry.EntryDate) == year,
            ).scalar()
        )

    cur_rev  = month_sum("Income",  current_month, current_year)
    cur_exp  = month_sum("Expense", current_month, current_year)
    prev_rev = month_sum("Income",  prev_month, prev_year)
    prev_exp = month_sum("Expense", prev_month, prev_year)

    cur_tx = float(
        db.query(func.count(FinancialEntry.id))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
            extract("month", FinancialEntry.EntryDate) == current_month,
            extract("year",  FinancialEntry.EntryDate) == current_year,
        ).scalar()
    )
    prev_tx = float(
        db.query(func.count(FinancialEntry.id))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
            extract("month", FinancialEntry.EntryDate) == prev_month,
            extract("year",  FinancialEntry.EntryDate) == prev_year,
        ).scalar()
    )

    def pct_change(current: float, previous: float):
        """
        Returns percent change vs last month.
        - Both 0      → None  (no badge — nothing happened either month)
        - previous 0, current > 0 → +100.0  (new activity this month)
        - previous > 0, current 0 → -100.0  (activity dropped to zero)
        - Otherwise   → normal percent change, rounded to 1 dp
        """
        if current == 0 and previous == 0:
            return None
        if previous == 0:
            return 100.0
        if current == 0:
            return -100.0
        return round(((current - previous) / abs(previous)) * 100, 1)

    return {
        "total_revenue":      total_revenue,
        "total_expenses":     total_expenses,
        "net_profit":         net_profit,
        "total_transactions": total_transactions,
        "trend_revenue":      pct_change(cur_rev,              prev_rev),
        "trend_expenses":     pct_change(cur_exp,              prev_exp),
        "trend_profit":       pct_change(cur_rev - cur_exp,    prev_rev - prev_exp),
        "trend_transactions": pct_change(cur_tx,               prev_tx),
    }


@router.get("/monthly", response_model=MonthlyFinancialData)
def get_monthly_financials(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    #  Get latest transaction date
    max_date = db.query(func.max(FinancialEntry.EntryDate))\
    .filter(FinancialEntry.tenant_id == current_user.tenant_id)\
    .scalar()

    if not max_date:
        # No data
        return MonthlyFinancialData(
            months=[],
            revenue=[],
            expenses=[],
            profit=[]
        )

    end_year = max_date.year
    end_month = max_date.month

    #  Build last 6 months (rolling)
    months_range = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months_range.append((y, m))

    #  Group all financial entries by year & month
    rows = db.query(
    extract("year", FinancialEntry.EntryDate).cast(Integer),
    extract("month", FinancialEntry.EntryDate).cast(Integer),
    FinancialEntry.EntryType,
    func.coalesce(func.sum(FinancialEntry.Amount), 0)
).filter(
    FinancialEntry.tenant_id == current_user.tenant_id
).group_by(
    extract("year", FinancialEntry.EntryDate).cast(Integer),
    extract("month", FinancialEntry.EntryDate).cast(Integer),
    FinancialEntry.EntryType
).all()

    #  Convert to dictionary
    data_dict = {}
    for year, month, entry_type, total in rows:
        key = (year, month)
        if key not in data_dict:
            data_dict[key] = {"Income": 0, "Expense": 0}
        data_dict[key][entry_type] = float(total)

    months = []
    revenue = []
    expenses = []
    profit = []

    #  Build response for last 6 months
    for year, month in months_range:
        months.append(f"{month_abbr[month]} {year}")

        income = data_dict.get((year, month), {}).get("Income", 0)
        expense = data_dict.get((year, month), {}).get("Expense", 0)

        revenue.append(income)
        expenses.append(expense)
        profit.append(income - expense)

    return MonthlyFinancialData(
        months=months,
        revenue=revenue,
        expenses=expenses,
        profit=profit
    )

@router.get("/revenue-sources")
def get_revenue_sources(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns revenue sources with total per category
    """
    results = (
    db.query(
        EntryCategory.name,
        func.sum(FinancialEntry.Amount).label("amount")
    )
    .join(EntryCategory, FinancialEntry.CategoryId == EntryCategory.id)
    .filter(
        FinancialEntry.EntryType == "Income",
        FinancialEntry.tenant_id == current_user.tenant_id
    )
    .group_by(EntryCategory.name)
    .all()
)

    color_palette = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#E91E63", "#00BCD4"]

    sources = []
    total_revenue = 0.0
    for i, r in enumerate(results):
        amount = float(r.amount)
        total_revenue += amount
        sources.append({
            "name": r.name,
            "amount": amount,
            "color": color_palette[i % len(color_palette)]
        })

    return {
        "total": total_revenue,
        "sources": sources
    }


@router.get("/expense-sources")
def get_expense_sources(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns expense sources with total per category
    """
    results = (
    db.query(
        EntryCategory.name,
        func.sum(FinancialEntry.Amount).label("amount")
    )
    .join(EntryCategory, FinancialEntry.CategoryId == EntryCategory.id)
    .filter(
        FinancialEntry.EntryType == "Expense",
        FinancialEntry.tenant_id == current_user.tenant_id
    )
    .group_by(EntryCategory.name)
    .all()
)

    color_palette = ["#F44336", "#FF9800", "#2196F3", "#9C27B0", "#E91E63", "#00BCD4"]

    sources = []
    total_expense = 0.0
    for i, r in enumerate(results):
        amount = float(r.amount)
        total_expense += amount
        sources.append({
            "name": r.name,
            "amount": amount,
            "color": color_palette[i % len(color_palette)]
        })

    return {
        "total": total_expense,
        "sources": sources
    }




@router.get("/recent")
def get_recent_transactions(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    tenant_id = current_user.tenant_id

    rows = (
        db.query(
            FinancialEntry,
            FarmerRegistration,
            EntryCategory
        )
        .select_from(FinancialEntry)
        .join(
            FarmerRegistration,
            FinancialEntry.FarmerRegistrationId == FarmerRegistration.id
        )
        .join(
            EntryCategory,
            FinancialEntry.CategoryId == EntryCategory.id
        )
        .filter(FinancialEntry.tenant_id == tenant_id)
        .order_by(desc(FinancialEntry.EntryDate))
        .limit(limit)
        .all()
    )

    transactions = []


    for row in rows:

        entry = row[0]
        farmer = row[1]
        category = row[2]

        # safe farmer name
        full_name = " ".join(
            filter(None, [
                getattr(farmer, "FirstName", None),
                getattr(farmer, "MiddleName", None),
                getattr(farmer, "Surname", None)
            ])
        ) if farmer else "Unknown Farmer"

        transactions.append({
            "id": entry.id,
            "category": category.name if category else "Uncategorized",
            "type": (entry.EntryType or "").lower(),
            "amount": float(entry.Amount or 0),
            "person": full_name,
            "status": (entry.Status or "paid").lower(),
            "datetime": entry.EntryDate.strftime("%Y-%m-%d") if entry.EntryDate else None,
            "description": entry.Notes or ""
        })

    total_transactions = (
        db.query(func.count(FinancialEntry.id))
        .filter(FinancialEntry.tenant_id == tenant_id)
        .scalar()
    )

    return {
        "transactions": transactions,
        "total": total_transactions
    }



@router.get("/report/summary")
def get_financial_summary_report(
    county: str = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    query = (
        db.query(
            CountyTbl.name.label("county"),

            func.sum(
                case(
                    (FinancialEntry.EntryType == "Income", FinancialEntry.Amount),
                    else_=0
                )
            ).label("total_income"),

            func.sum(
                case(
                    (FinancialEntry.EntryType == "Expense", FinancialEntry.Amount),
                    else_=0
                )
            ).label("total_expenses"),

            func.count(
                func.distinct(FarmerRegistration.id)
            ).label("active_farmers")
        )

        .select_from(FinancialEntry)

        .join(
            FarmerRegistration,
            FinancialEntry.FarmerRegistrationId == FarmerRegistration.id
        )

        .outerjoin(
            CountyTbl,
            FarmerRegistration.county_id == CountyTbl.id
        )

        .filter(
            FinancialEntry.tenant_id == current_user.tenant_id
        )
    )

    # County filter
    if county and county != "All Counties":
        query = query.filter(
            CountyTbl.name == county
        )

    # Date filters
    if date_from:
        query = query.filter(
            FinancialEntry.EntryDate >= datetime.strptime(
                date_from,
                "%Y-%m-%d"
            ).date()
        )

    if date_to:
        query = query.filter(
            FinancialEntry.EntryDate <= datetime.strptime(
                date_to,
                "%Y-%m-%d"
            ).date()
        )

    rows = (
        query
        .group_by(
            CountyTbl.name
        )
        .all()
    )

    data = []

    for row in rows:

        total_income = float(row.total_income or 0)
        total_expenses = float(row.total_expenses or 0)
        active_farmers = row.active_farmers or 0

        avg_income_per_farmer = (
            round(total_income / active_farmers, 2)
            if active_farmers > 0
            else 0
        )

        # Top expense category for this county
        top_driver_query = (
            db.query(
                EntryCategory.name,
                func.sum(FinancialEntry.Amount).label("amount")
            )
            .join(
                FinancialEntry,
                FinancialEntry.CategoryId == EntryCategory.id
            )
            .join(
                FarmerRegistration,
                FinancialEntry.FarmerRegistrationId == FarmerRegistration.id
            )
            .outerjoin(
                CountyTbl,
                FarmerRegistration.county_id == CountyTbl.id
            )
            .filter(
                FinancialEntry.EntryType == "Expense",
                FinancialEntry.tenant_id == current_user.tenant_id
            )
        )

        if row.county:
            top_driver_query = top_driver_query.filter(
                CountyTbl.name == row.county
            )

        if date_from:
            top_driver_query = top_driver_query.filter(
                FinancialEntry.EntryDate >= datetime.strptime(
                    date_from,
                    "%Y-%m-%d"
                ).date()
            )

        if date_to:
            top_driver_query = top_driver_query.filter(
                FinancialEntry.EntryDate <= datetime.strptime(
                    date_to,
                    "%Y-%m-%d"
                ).date()
            )

        top_driver = (
            top_driver_query
            .group_by(EntryCategory.name)
            .order_by(desc(func.sum(FinancialEntry.Amount)))
            .first()
        )

        data.append({
            "county": row.county or "Unknown",

            "active_farmers": active_farmers,

            "avg_income_per_farmer": avg_income_per_farmer,

            "total_income": total_income,

            "total_expenses": total_expenses,

            "net_profit_loss": total_income - total_expenses,

            "top_cost_drivers": (
                top_driver.name
                if top_driver
                else "N/A"
            )
        })

    return {
        "data": data
    }
@router.get("/report/detailed")
def get_financial_detailed_report(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1),

    county: str = Query(None),
    transaction_type: str = Query(None),

    date_from: str = Query(None),
    date_to: str = Query(None),

    name: str = Query(None),
    reg_no: str = Query(None),

    category: str = Query(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    query = (
        db.query(
            FinancialEntry,
            FarmerRegistration,
            EntryCategory,
            CountyTbl
        )

        .select_from(FinancialEntry)

        .join(
            FarmerRegistration,
            FinancialEntry.FarmerRegistrationId == FarmerRegistration.id
        )

        .join(
            EntryCategory,
            FinancialEntry.CategoryId == EntryCategory.id
        )

        .outerjoin(
            CountyTbl,
            FarmerRegistration.county_id == CountyTbl.id
        )

        .filter(
            FinancialEntry.tenant_id == current_user.tenant_id
        )
    )

    # County filter
    if county and county != "All Counties":
        query = query.filter(
            CountyTbl.name == county
        )

    # Transaction type filter
    if transaction_type and transaction_type != "All Types":
        query = query.filter(
            FinancialEntry.EntryType == transaction_type
        )

    # Category filter
    if category and category != "All Categories":
        query = query.filter(
            EntryCategory.name == category
        )

    # Date filters
    if date_from:
        query = query.filter(
            FinancialEntry.EntryDate >= datetime.strptime(
                date_from,
                "%Y-%m-%d"
            ).date()
        )

    if date_to:
        query = query.filter(
            FinancialEntry.EntryDate <= datetime.strptime(
                date_to,
                "%Y-%m-%d"
            ).date()
        )

    # Farmer name filter
    if name:
        full_name_expr = func.concat(
            FarmerRegistration.FirstName,
            " ",
            func.coalesce(FarmerRegistration.MiddleName, ""),
            " ",
            FarmerRegistration.Surname
        )

        query = query.filter(
            full_name_expr.ilike(f"%{name}%")
        )

    # Registration number filter
    if reg_no:
        query = query.filter(
            FarmerRegistration.farmer_lookup_code.ilike(f"%{reg_no}%")
        )

    total = query.count()

    rows = (
        query
        .order_by(desc(FinancialEntry.EntryDate))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data = []

    for entry, farmer, category_obj, county_obj in rows:

        full_name = " ".join(
            filter(None, [
                farmer.FirstName,
                farmer.MiddleName,
                farmer.Surname
            ])
        )

        data.append({
            "id": entry.id,

            "reg_no": farmer.farmer_lookup_code,

            "farmer_name": full_name,

            "county": (
                county_obj.name
                if county_obj
                else "Unknown"
            ),

            "transaction_date": (
                entry.EntryDate.strftime("%Y-%m-%d")
                if entry.EntryDate
                else None
            ),

            "transaction_type": entry.EntryType,

            "category": (
                category_obj.name
                if category_obj
                else "Uncategorized"
            ),

            "description": (
                entry.Notes
                or ""
            ),

            "amount": float(entry.Amount or 0)
        })

    return {
        "data": data,

        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }



@router.get("/outstanding")
def get_outstanding_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns total outstanding (unpaid/pending) payments and count.
    Requires a `Status` column on FinancialEntry (see migration note below).
    If the column doesn't exist yet, this returns zeros safely.
    """
    tenant_id = current_user.tenant_id
 
    if not hasattr(FinancialEntry, "Status"):
        return {"total_outstanding": 0.0, "pending_count": 0}
 
    pending_rows = (
        db.query(FinancialEntry)
        .filter(
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Income",
            FinancialEntry.Status == "Pending",
        )
        .all()
    )
 
    total_outstanding = sum(float(r.Amount or 0) for r in pending_rows)
 
    return {
        "total_outstanding": total_outstanding,
        "pending_count": len(pending_rows),
    }
 
 
# ── 3. NEW: Financial Forecast (server-side, simple linear projection) ──
@router.get("/forecast")
def get_financial_forecast(
    months_ahead: int = Query(3, ge=1, le=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Shows the last 6 actual months of data, then projects forward from
    TODAY's calendar month (not from the last transaction date) for
    `months_ahead` months. Growth rate is computed from real historical
    data. If there's a gap between the last entry and today, the model
    silently compounds through the gap months (not shown) so the visible
    forecast always reflects "from now," e.g. if it's June, the user sees
    Jul/Aug/Sep regardless of when the last entry was logged.
    """
    tenant_id = current_user.tenant_id
 
    max_date = (
        db.query(func.max(FinancialEntry.EntryDate))
        .filter(FinancialEntry.tenant_id == tenant_id)
        .scalar()
    )
 
    if not max_date:
        return {
            "months": [],
            "revenue": [],
            "expenses": [],
            "profit": [],
            "split_index": 0,
        }
 
    end_year, end_month = max_date.year, max_date.month
 
    # Last 6 actual months of real data, ending at the most recent entry
    months_range = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months_range.append((y, m))
 
    rows = (
        db.query(
            extract("year", FinancialEntry.EntryDate).cast(Integer),
            extract("month", FinancialEntry.EntryDate).cast(Integer),
            FinancialEntry.EntryType,
            func.coalesce(func.sum(FinancialEntry.Amount), 0),
        )
        .filter(FinancialEntry.tenant_id == tenant_id)
        .group_by(
            extract("year", FinancialEntry.EntryDate).cast(Integer),
            extract("month", FinancialEntry.EntryDate).cast(Integer),
            FinancialEntry.EntryType,
        )
        .all()
    )
 
    data_dict = {}
    for year, month, entry_type, total in rows:
        key = (year, month)
        data_dict.setdefault(key, {"Income": 0, "Expense": 0})
        data_dict[key][entry_type] = float(total)
 
    months, revenue, expenses = [], [], []
    for year, month in months_range:
        months.append(f"{month_abbr[month]} {year}")
        revenue.append(data_dict.get((year, month), {}).get("Income", 0))
        expenses.append(data_dict.get((year, month), {}).get("Expense", 0))
 
    # Average month-over-month growth rate from real data, clamped to
    # avoid wild compounding off one noisy month
    def avg_growth(series):
        growths = []
        for i in range(1, len(series)):
            if series[i - 1] > 0:
                growths.append(series[i] / series[i - 1])
        if not growths:
            return 1.0
        avg = sum(growths) / len(growths)
        return max(0.5, min(avg, 1.5))
 
    rev_growth = avg_growth(revenue)
    exp_growth = avg_growth(expenses)
 
    last_rev = revenue[-1] if revenue else 0
    last_exp = expenses[-1] if expenses else 0
 
    # ── Walk forward from the last real month to TODAY's month ──
    # These "gap" months are computed (to keep compounding correct)
    # but not included in the visible output.
    today = date.today()
    cur_year, cur_month = months_range[-1]
 
    months_to_today = (today.year - cur_year) * 12 + (today.month - cur_month)
    months_to_today = max(0, months_to_today)
 
    for _ in range(months_to_today):
        cur_month += 1
        if cur_month > 12:
            cur_month = 1
            cur_year += 1
        last_rev = round(last_rev * rev_growth, 2)
        last_exp = round(last_exp * exp_growth, 2)
 
    # ── Now project the visible forecast window: next `months_ahead`
    #    months starting from today's month ──
    forecast_months = list(months)
    forecast_revenue = list(revenue)
    forecast_expenses = list(expenses)
 
    for _ in range(months_ahead):
        cur_month += 1
        if cur_month > 12:
            cur_month = 1
            cur_year += 1
        forecast_months.append(f"{month_abbr[cur_month]} {cur_year}*")
        last_rev = round(last_rev * rev_growth, 2)
        last_exp = round(last_exp * exp_growth, 2)
        forecast_revenue.append(last_rev)
        forecast_expenses.append(last_exp)
 
    forecast_profit = [r - e for r, e in zip(forecast_revenue, forecast_expenses)]
 
    return {
        "months": forecast_months,
        "revenue": forecast_revenue,
        "expenses": forecast_expenses,
        "profit": forecast_profit,
        "split_index": len(months),  # index where projected (*) months begin
        "data_as_of": max_date.isoformat(),  # how stale the underlying data is
    }
 
@router.get("/cashflow")
def get_cash_flow_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns inflow/outflow totals plus a breakdown by category for the
    Sankey diagram, instead of the frontend faking percentages of totals.
    """
    tenant_id = current_user.tenant_id

    # ── Month count for accurate avg inflow/outflow calculation ──
    active_months = db.query(
        extract("year", FinancialEntry.EntryDate),
        extract("month", FinancialEntry.EntryDate)
    ).filter(
        FinancialEntry.tenant_id == tenant_id
    ).distinct().count()

    month_count = active_months if active_months > 0 else 1

    total_inflow = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(FinancialEntry.tenant_id == tenant_id, FinancialEntry.EntryType == "Income")
        .scalar()
    )
    total_outflow = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(FinancialEntry.tenant_id == tenant_id, FinancialEntry.EntryType == "Expense")
        .scalar()
    )

    income_by_category = (
        db.query(EntryCategory.name, func.sum(FinancialEntry.Amount))
        .join(EntryCategory, FinancialEntry.CategoryId == EntryCategory.id)
        .filter(FinancialEntry.tenant_id == tenant_id, FinancialEntry.EntryType == "Income")
        .group_by(EntryCategory.name)
        .order_by(desc(func.sum(FinancialEntry.Amount)))
        .limit(3)
        .all()
    )

    expense_by_category = (
        db.query(EntryCategory.name, func.sum(FinancialEntry.Amount))
        .join(EntryCategory, FinancialEntry.CategoryId == EntryCategory.id)
        .filter(FinancialEntry.tenant_id == tenant_id, FinancialEntry.EntryType == "Expense")
        .group_by(EntryCategory.name)
        .order_by(desc(func.sum(FinancialEntry.Amount)))
        .limit(4)
        .all()
    )

    return {
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "net_cash_flow": total_inflow - total_outflow,
        "month_count": month_count,
        "income_sources": [{"label": n, "amount": float(a)} for n, a in income_by_category],
        "expense_categories": [{"label": n, "amount": float(a)} for n, a in expense_by_category],
    }

# ── Farmer-scoped financial stats ──────────────────────────────────────────────
@router.get("/farmer/{farmer_id}/stats")
def get_farmer_financial_stats(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Financial KPIs for a single farmer (tenant-scoped)."""
    # Verify farmer belongs to this tenant
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    tenant_id = current_user.tenant_id

    total_revenue = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Income",
        ).scalar()
    )
    total_expenses = float(
        db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
            FinancialEntry.EntryType == "Expense",
        ).scalar()
    )
    net_profit = total_revenue - total_expenses

    total_transactions = (
        db.query(func.count(FinancialEntry.id))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == tenant_id,
        ).scalar()
    )

    # Month-over-month trends
    today = date.today()
    current_month, current_year = today.month, today.year
    prev_month = current_month - 1 or 12
    prev_year = current_year if current_month > 1 else current_year - 1

    def month_sum(entry_type, month, year):
        return float(
            db.query(func.coalesce(func.sum(FinancialEntry.Amount), 0))
            .filter(
                FinancialEntry.FarmerRegistrationId == farmer_id,
                FinancialEntry.tenant_id == tenant_id,
                FinancialEntry.EntryType == entry_type,
                extract("month", FinancialEntry.EntryDate) == month,
                extract("year", FinancialEntry.EntryDate) == year,
            ).scalar()
        )

    cur_rev  = month_sum("Income",  current_month, current_year)
    cur_exp  = month_sum("Expense", current_month, current_year)
    prev_rev = month_sum("Income",  prev_month, prev_year)
    prev_exp = month_sum("Expense", prev_month, prev_year)

    def pct(cur, prev):
        if prev == 0:
            return 0.0
        return round(((cur - prev) / abs(prev)) * 100, 1)

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "total_transactions": total_transactions,
        "trend_revenue":  pct(cur_rev, prev_rev),
        "trend_expenses": pct(cur_exp, prev_exp),
        "trend_profit":   pct(cur_rev - cur_exp, prev_rev - prev_exp),
        "trend_transactions": 0.0,
    }

@router.get("/farmer/{farmer_id}/outstanding")
def get_farmer_outstanding(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Outstanding (Pending) income entries for one farmer."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    if not hasattr(FinancialEntry, "Status"):
        return {"total_outstanding": 0.0, "pending_count": 0}

    pending_rows = (
        db.query(FinancialEntry)
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == current_user.tenant_id,
            FinancialEntry.EntryType == "Income",
            FinancialEntry.Status == "Pending",
        )
        .all()
    )

    total_outstanding = sum(float(r.Amount or 0) for r in pending_rows)

    return {
        "total_outstanding": total_outstanding,
        "pending_count": len(pending_rows),
    }


@router.get("/farmer/{farmer_id}/monthly")
def get_farmer_monthly_financials(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Last 6 months of income/expense/profit for one farmer."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    max_date = (
        db.query(func.max(FinancialEntry.EntryDate))
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == current_user.tenant_id,
        ).scalar()
    )

    if not max_date:
        return {"months": [], "revenue": [], "expenses": [], "profit": []}

    end_year, end_month = max_date.year, max_date.month
    months_range = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months_range.append((y, m))

    rows = (
        db.query(
            extract("year",  FinancialEntry.EntryDate).cast(Integer),
            extract("month", FinancialEntry.EntryDate).cast(Integer),
            FinancialEntry.EntryType,
            func.coalesce(func.sum(FinancialEntry.Amount), 0),
        )
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == current_user.tenant_id,
        )
        .group_by(
            extract("year",  FinancialEntry.EntryDate).cast(Integer),
            extract("month", FinancialEntry.EntryDate).cast(Integer),
            FinancialEntry.EntryType,
        )
        .all()
    )

    data_dict = {}
    for year, month, entry_type, total in rows:
        data_dict.setdefault((year, month), {"Income": 0, "Expense": 0})
        data_dict[(year, month)][entry_type] = float(total)

    months, revenue, expenses, profit = [], [], [], []
    for year, month in months_range:
        months.append(f"{month_abbr[month]} {year}")
        inc = data_dict.get((year, month), {}).get("Income", 0)
        exp = data_dict.get((year, month), {}).get("Expense", 0)
        revenue.append(inc)
        expenses.append(exp)
        profit.append(inc - exp)

    return {"months": months, "revenue": revenue, "expenses": expenses, "profit": profit}


# ── Farmer-scoped recent transactions ──────────────────────────────────────────
@router.get("/farmer/{farmer_id}/recent")
def get_farmer_recent_transactions(
    farmer_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Most recent financial entries for one farmer."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    rows = (
        db.query(FinancialEntry, EntryCategory)
        .join(EntryCategory, FinancialEntry.CategoryId == EntryCategory.id)
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == current_user.tenant_id,
        )
        .order_by(desc(FinancialEntry.EntryDate))
        .limit(limit)
        .all()
    )

    transactions = []
    for entry, category in rows:
        transactions.append({
            "id": entry.id,
            "date": entry.EntryDate.strftime("%Y-%m-%d") if entry.EntryDate else None,
            "description": entry.Notes or category.name or "",
            "category": category.name if category else "Uncategorized",
            "type": (entry.EntryType or "").lower(),
            "amount": float(entry.Amount or 0),
            "status": (entry.Status or "paid").lower(),
            "payment_method": "M-Pesa",
        })

    return transactions


@router.get("/farmer/{farmer_id}/revenue-sources")
def get_farmer_revenue_sources(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earnings broken down by category for one farmer."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    results = (
        db.query(
            EntryCategory.name,
            func.sum(FinancialEntry.Amount).label("amount")
        )
        .join(EntryCategory, FinancialEntry.CategoryId == EntryCategory.id)
        .filter(
            FinancialEntry.FarmerRegistrationId == farmer_id,
            FinancialEntry.tenant_id == current_user.tenant_id,
            FinancialEntry.EntryType == "Income"
        )
        .group_by(EntryCategory.name)
        .order_by(func.sum(FinancialEntry.Amount).desc())
        .all()
    )

    color_palette = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#E91E63", "#00BCD4"]

    total = sum(float(r.amount) for r in results)

    categories = []
    for i, r in enumerate(results):
        amount = float(r.amount)
        categories.append({
            "label": r.name,
            "amount": amount,
            "pct": round((amount / total) * 100, 1) if total else 0,
            "color": color_palette[i % len(color_palette)]
        })

    return {
        "total": total,
        "categories": categories
    }