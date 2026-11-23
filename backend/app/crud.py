from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import List, Optional, Tuple
from datetime import datetime

from . import models, schemas


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user_in: schemas.UserCreate, hashed_password: str) -> models.User:
    db_user = models.User(
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role,
        is_approved=user_in.is_approved if user_in.is_approved is not None else False,
        tenant_id=user_in.tenant_id,
        status=user_in.status or "active",
        last_active=None
        # created_at is handled by server_default=func.now()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user: models.User, user_in: schemas.UserUpdate) -> models.User:
    data = user_in.model_dump(exclude_unset=True)

    field_map = {
        "firstName": "first_name",
        "lastName": "last_name",
        "phoneNumber": "phone_number",
        "isApproved": "is_approved"
    }

    for k, v in data.items():
        db_field = field_map.get(k, k)

        if db_field in {"tenant_id", "created_at", "hashed_password"}:
            continue

        setattr(user, db_field, v)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: models.User):
    db.delete(user)
    db.commit()
    return True


def list_users(
    db: Session,
    tenant_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_field: str = "created_at",
    sort_dir: str = "desc",
    skip: int = 0,
    limit: int = 50
) -> Tuple[List[models.User], int]:
    q = db.query(models.User)
    if tenant_id is not None:
        q = q.filter(models.User.tenant_id == tenant_id)

    if search:
        s = f"%{search}%"
        q = q.filter(
            or_(
                models.User.first_name.ilike(s),
                models.User.last_name.ilike(s),
                models.User.email.ilike(s),
                models.User.role.ilike(s)
            )
        )

    total = q.count()

    sort_col = getattr(models.User, sort_field, models.User.created_at)
    if sort_dir == "asc":
        q = q.order_by(asc(sort_col))
    else:
        q = q.order_by(desc(sort_col))

    results = q.offset(skip).limit(limit).all()
    return results, total


def get_stats(db: Session, tenant_id: Optional[int] = None):
    q = db.query(models.User)
    if tenant_id is not None:
        q = q.filter(models.User.tenant_id == tenant_id)

    total_users = q.count()
    admins = q.filter(models.User.role.ilike("admin")).count()
    active_users = q.filter(models.User.status == "active").count()

    last_active_row = db.query(models.func.max(models.User.last_active))
    if tenant_id is not None:
        last_active_row = last_active_row.filter(models.User.tenant_id == tenant_id)
    last_active = last_active_row.scalar()

    return {
        "total_users": total_users,
        "admins": admins,
        "active_users": active_users,
        "last_active": last_active
    }


def touch_last_active(db: Session, user: models.User, when: datetime = None):
    user.last_active = when or datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_tenant_by_serial_code(db: Session, serial_code: str):
    return db.query(models.Tenant).filter(models.Tenant.serial_code == serial_code).first()