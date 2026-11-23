# app/routers/transactions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import SessionLocal
from app.models.payments import PaymentTransaction
from app.models.farmer import FarmerRegistration
from app.models.financial_entry import Expense, Revenue
import pytz

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@router.get("/recent")
def get_recent_transactions(db: Session = Depends(get_db)):
    """
    Fetch recent transactions from both Expenses and Revenues,
    merged into one list, sorted by date descending.
    """
    eat = pytz.timezone("Africa/Nairobi")

    expenses = db.query(Expense).order_by(Expense.created_at.desc()).limit(50).all()
    revenues = db.query(Revenue).order_by(Revenue.created_at.desc()).limit(50).all()

    expense_data = []
    for e in expenses:
        # Try to get related PaymentTransaction
        tx = db.query(PaymentTransaction).filter(PaymentTransaction.expense_id == e.id).first()
        farmer_name = "Unknown"
        if tx and tx.farmer_id:
            farmer = db.query(FarmerRegistration).filter(FarmerRegistration.id == tx.farmer_id).first()
            if farmer:
                farmer_name = f"{farmer.FirstName or ''} {farmer.Surname or ''}".strip()

        expense_data.append({
            "id": f"EXP-{e.id}",
            "type": "expense",
            "category": e.category or e.title or "General Expense",
            "person": farmer_name,
            "datetime": e.created_at.astimezone(eat).strftime("%I:%M:%S %p, %m/%d/%Y"),
            "amount": f"- KES {float(e.amount):,.0f}",
            "description": e.description or "Expense record",
        })

    revenue_data = [
        {
            "id": f"REV-{r.id}",
            "type": "payment",
            "category": r.source or "Revenue",
            "person": "Customer" if "sale" in (r.description or "").lower() else "External Source",
            "datetime": r.created_at.astimezone(eat).strftime("%I:%M:%S %p, %m/%d/%Y"),
            "amount": f"+ KES {float(r.amount):,.0f}",
            "description": r.description or "Revenue record",
        }
        for r in revenues
    ]

    all_transactions = expense_data + revenue_data
    all_transactions.sort(
        key=lambda x: datetime.strptime(x["datetime"], "%I:%M:%S %p, %m/%d/%Y"),
        reverse=True,
    )

    return {"transactions": all_transactions, "total": len(all_transactions)}
