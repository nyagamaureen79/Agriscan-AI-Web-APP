# FastAPI backend for Payment Management with Super Admin Access, Export to CSV/PDF, Filtering

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import csv
import io
from fpdf import FPDF
import logging

from app.database import get_db
from app.models.payment import Payment
from app.models.tenant import Tenant
from app.schemas.payment import PaymentOut, PaymentCreate, PaymentUpdate
# from app.auth import get_current_user
from app.models.users import User
from fastapi import status as http_status

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)

# def ensure_super_admin(user: User):
#     if user.role != "super_admin":
#         raise HTTPException(status_code=403, detail="Not authorized")

@router.get("/", response_model=List[PaymentOut])
def get_all_payments(
    status: Optional[str] = Query(None),
    date_filter: Optional[str] = Query(None),
    tenant: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    # Automatically mark overdue
    overdue_payments = db.query(Payment).filter(Payment.status != "paid", Payment.due_date < now).all()
    for p in overdue_payments:
        p.status = "overdue"
    db.commit()

    query = db.query(
        Payment.id,
        Payment.invoice_id,
        Payment.amount,
        Payment.status,
        Payment.payment_method,
        Payment.due_date,
        Payment.payment_date,
        Payment.tenant_id.label("tenant_id"),
        Tenant.company_name.label("tenant_name"),
        Tenant.contact_email.label("tenant_email"),
    ).join(Payment.tenant)

    if status:
        query = query.filter(Payment.status == status)
    if tenant:
        query = query.filter(Tenant.company_name.ilike(f"%{tenant}%"))
    if date_filter:
        if date_filter == "this_month":
            query = query.filter(Payment.payment_date >= now.replace(day=1))
        elif date_filter == "last_month":
            last_month = (now.replace(day=1) - timedelta(days=1)).replace(day=1)
            next_month = now.replace(day=1)
            query = query.filter(Payment.payment_date >= last_month, Payment.payment_date < next_month)
        elif date_filter == "this_quarter":
            quarter_start = datetime(now.year, (now.month - 1) // 3 * 3 + 1, 1)
            query = query.filter(Payment.payment_date >= quarter_start)
        elif date_filter == "this_year":
            query = query.filter(Payment.payment_date >= datetime(now.year, 1, 1))

    results = query.all()

    return [
        PaymentOut(
            id=row.id,
            invoice_id=row.invoice_id,
            tenant_id=row.tenant_id,
            tenant_name=row.tenant_name,
            tenant_email=row.tenant_email,
            amount=row.amount,
            status=row.status,
            payment_method=row.payment_method,
            due_date=row.due_date,
            payment_date=row.payment_date,
        )
        for row in results
    ]
