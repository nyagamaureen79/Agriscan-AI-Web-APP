from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import extract, func
from app.models.financials import Expense, Revenue
from app.models.payments import PaymentTransaction
from calendar import month_abbr

def compute_financial_summary(db: Session):
    total_revenue = db.query(func.sum(Revenue.amount)).scalar() or 0
    total_expenses = db.query(func.sum(Expense.amount)).scalar() or 0
    mpesa_revenue = db.query(func.sum(PaymentTransaction.amount)).filter(PaymentTransaction.status == "success").scalar() or 0

    total_revenue += mpesa_revenue
    net_profit = total_revenue - total_expenses
    total_transactions = db.query(PaymentTransaction).count()

    # Mock trends (you can make dynamic later)
    trend_revenue = "+12% from last month"
    trend_expenses = "+21% from last month"
    trend_profit = "-9% vs last month"

    return {
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "total_transactions": total_transactions,
        "trend_revenue": trend_revenue,
        "trend_expenses": trend_expenses,
        "trend_profit": trend_profit
    }

def get_monthly_data(db: Session):
    months = [m for m in month_abbr if m][0:12]
    revenue_data = []
    expense_data = []
    profit_data = []

    current_year = datetime.now().year

    for i in range(1, 13):
        rev_sum = db.query(func.sum(Revenue.amount)).filter(extract('month', Revenue.date) == i, extract('year', Revenue.date) == current_year).scalar() or 0
        exp_sum = db.query(func.sum(Expense.amount)).filter(extract('month', Expense.date) == i, extract('year', Expense.date) == current_year).scalar() or 0
        mpesa_rev = db.query(func.sum(PaymentTransaction.amount)).filter(extract('month', PaymentTransaction.created_at) == i, extract('year', PaymentTransaction.created_at) == current_year, PaymentTransaction.status == "success").scalar() or 0
        rev_sum += mpesa_rev

        revenue_data.append(float(rev_sum))
        expense_data.append(float(exp_sum))
        profit_data.append(float(rev_sum - exp_sum))

    return {
        "months": months,
        "revenue": revenue_data,
        "expenses": expense_data,
        "profit": profit_data
    }
