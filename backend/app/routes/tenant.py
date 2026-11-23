from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.tenant import Tenant
from app.models.users import User
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantOut, TenantEmailRequest
from app.schemas.users import UserOut
from datetime import datetime
from fastapi.responses import JSONResponse
from sqlalchemy import extract, func
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random


router = APIRouter(prefix="/tenants", tags=["Tenants"])

def generate_unique_serial_code(db: Session):
    while True:
        code = str(random.randint(100000, 999999))  # Always 6 digits
        exists = db.query(Tenant).filter(Tenant.serial_code == code).first()
        if not exists:
            return code

@router.post("/", response_model=TenantOut)
def create_tenant(tenant: TenantCreate, db: Session = Depends(get_db)):
    # Check if company name already exists
    if db.query(Tenant).filter(Tenant.company_name == tenant.company_name).first():
        raise HTTPException(status_code=400, detail="Company already exists.")

    # Check if contact email already exists
    if db.query(Tenant).filter(Tenant.contact_email == tenant.contact_email).first():
        raise HTTPException(status_code=400, detail="Email already in use.")

    # Check if slug URL already exists
    if db.query(Tenant).filter(Tenant.slug_url == tenant.slug_url).first():
        raise HTTPException(status_code=400, detail="Tenant with this slug already exists.")

    # Always generate serial code automatically
    serial_code = generate_unique_serial_code(db)

    db_tenant = Tenant(
        company_name=tenant.company_name,
        contact_email=tenant.contact_email,
        slug_url=tenant.slug_url,
        contact_phone=tenant.contact_phone,
        billing_address=tenant.billing_address,
        monthly_fee=tenant.monthly_fee,
        max_users=tenant.max_users,
        status=tenant.status,
        serial_code=serial_code,
        plan=tenant.plan,       
        country=tenant.country,
    )

    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
   

    return db_tenant


# Get all tenants
@router.get("/", response_model=List[TenantOut])
def get_all_tenants(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).all()
    tenant_list = []

    for tenant in tenants:
        user = db.query(User).filter(User.email == tenant.contact_email).first()
        tenant_data = tenant.__dict__.copy()
        tenant_data["first_name"] = user.first_name if user else ""
        tenant_data["last_name"] = user.last_name if user else ""
        tenant_list.append(tenant_data)

    return tenant_list


#  GET specific tenant by ID (this was missing)
@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant_by_id(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user = db.query(User).filter(User.email == tenant.contact_email).first()

    # Manually construct the response to include additional fields
    tenant_data = tenant.__dict__.copy()
    tenant_data["first_name"] = user.first_name if user else ""
    tenant_data["last_name"] = user.last_name if user else ""

    return tenant_data



# Get users under a tenant
@router.get("/{tenant_id}/users", response_model=List[UserOut])
def get_users_by_tenant(tenant_id: int, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    return users


# @router.get("/tenants/{tenant_id}/payments", response_model=List[PaymentOut])
# def get_payments_by_tenant(tenant_id: int, db: Session = Depends(get_db)):
#     payments = db.query(Payment).filter(Payment.tenant_id == tenant_id).all()
    
#     if not payments:
#         raise HTTPException(status_code=404, detail="No payments found for this tenant.")
    
#     return payments


@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(tenant_id: int, tenant: TenantUpdate, db: Session = Depends(get_db)):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    changes = []  # Track what was updated

    # Check for duplicate company name (if updating and it's different)
    if tenant.company_name and tenant.company_name != db_tenant.company_name:
        if db.query(Tenant).filter(Tenant.company_name == tenant.company_name, Tenant.id != tenant_id).first():
            raise HTTPException(status_code=400, detail="Company name already exists.")
        changes.append(f"Company Name: {db_tenant.company_name} → {tenant.company_name}")
        db_tenant.company_name = tenant.company_name

    # Check for duplicate contact email
    if tenant.contact_email and tenant.contact_email != db_tenant.contact_email:
        if db.query(Tenant).filter(Tenant.contact_email == tenant.contact_email, Tenant.id != tenant_id).first():
            raise HTTPException(status_code=400, detail="Email already in use.")
        changes.append(f"Contact Email: {db_tenant.contact_email} → {tenant.contact_email}")
        db_tenant.contact_email = tenant.contact_email

    # Check for duplicate slug URL
    if tenant.slug_url and tenant.slug_url != db_tenant.slug_url:
        if db.query(Tenant).filter(Tenant.slug_url == tenant.slug_url, Tenant.id != tenant_id).first():
            raise HTTPException(status_code=400, detail="Slug URL already in use.")
        changes.append(f"Slug URL: {db_tenant.slug_url} → {tenant.slug_url}")
        db_tenant.slug_url = tenant.slug_url

    # Check for duplicate serial code
    if tenant.serial_code and tenant.serial_code != db_tenant.serial_code:
        if len(tenant.serial_code) != 6 or not tenant.serial_code.isdigit():
            raise HTTPException(status_code=400, detail="Serial code must be a 6-digit number.")
        if db.query(Tenant).filter(Tenant.serial_code == tenant.serial_code, Tenant.id != tenant_id).first():
            raise HTTPException(status_code=400, detail="Serial code already in use.")
        changes.append(f"Serial Code: {db_tenant.serial_code} → {tenant.serial_code}")
        db_tenant.serial_code = tenant.serial_code

    # Update other fields (no need for uniqueness checks)
    if tenant.contact_phone is not None and tenant.contact_phone != db_tenant.contact_phone:
        changes.append(f"Contact Phone: {db_tenant.contact_phone} → {tenant.contact_phone}")
        db_tenant.contact_phone = tenant.contact_phone

    if tenant.billing_address is not None and tenant.billing_address != db_tenant.billing_address:
        changes.append(f"Billing Address: {db_tenant.billing_address} → {tenant.billing_address}")
        db_tenant.billing_address = tenant.billing_address

    if tenant.monthly_fee is not None and tenant.monthly_fee != db_tenant.monthly_fee:
        changes.append(f"Monthly Fee: {db_tenant.monthly_fee} → {tenant.monthly_fee}")
        db_tenant.monthly_fee = tenant.monthly_fee

    if tenant.max_users is not None and tenant.max_users != db_tenant.max_users:
        changes.append(f"Max Users: {db_tenant.max_users} → {tenant.max_users}")
        db_tenant.max_users = tenant.max_users

    if tenant.status is not None and tenant.status != db_tenant.status:
        changes.append(f"Status: {db_tenant.status} → {tenant.status}")
        db_tenant.status = tenant.status

    if tenant.plan is not None and tenant.plan != db_tenant.plan:
        changes.append(f"Plan: {db_tenant.plan} → {tenant.plan}")
        db_tenant.plan = tenant.plan

    if tenant.country is not None and tenant.country != db_tenant.country:
        changes.append(f"Country: {db_tenant.country} → {tenant.country}")
        db_tenant.country = tenant.country

    db.commit()
    db.refresh(db_tenant)

    
    return db_tenant



# Delete a tenant
@router.delete("/{tenant_id}")
def delete_tenant(tenant_id: int, db: Session = Depends(get_db)):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    db.delete(db_tenant)
    db.commit()
    return {"message": "Tenant deleted successfully"}

@router.get("/dashboard/overview")
def get_tenant_dashboard_data(db: Session = Depends(get_db)):
    # Fetch all tenants
    tenants = db.query(Tenant).all()
    total_tenants = len(tenants)
    active_tenants = [t for t in tenants if t.status == "active"]

    # Recent tenants (last 5 created)
    recent_tenants = sorted(tenants, key=lambda t: t.created_at or datetime.min, reverse=True)[:5]

    return {
        "total_tenants": total_tenants,
        "active_tenants_count": len(active_tenants),
        "recent_tenants": [
            {
                "id": t.id,
                "company_name": t.company_name,
                "contact_email": t.contact_email,
                "monthly_fee": t.monthly_fee,
                "status": t.status,
                "created_at": t.created_at,
            }
            for t in recent_tenants
        ],
    }