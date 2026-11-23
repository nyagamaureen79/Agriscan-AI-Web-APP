from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from passlib.context import CryptContext

from .. import schemas, crud, models
from ..database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def to_user_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        name=f"{user.first_name} {user.last_name}",
        firstName=user.first_name,
        lastName=user.last_name,
        email=user.email,
        phoneNumber=user.phone_number,
        role=user.role,
        status=user.status,
        isApproved=user.is_approved,
        tenantId=user.tenant_id,
        createdAt=user.created_at,
        lastActive=user.last_active
    )


@router.get("/me", response_model=schemas.UserOut)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    return to_user_out(current_user)



@router.put("/me", response_model=schemas.UserOut)
def update_my_profile(
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # role protection
    if user_in.role is not None and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot change role")

    # approval protection (FIXED)
    if user_in.isApproved is not None and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot change approval status")

    # email uniqueness
    if user_in.email:
        existing = crud.get_user_by_email(db, user_in.email)
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=409, detail="Email already in use")

    updated = crud.update_user(db, current_user, user_in)
    return to_user_out(updated)



@router.put("/me/password")
def change_password(
    req: schemas.PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not pwd_context.verify(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    hashed = pwd_context.hash(req.new_password)
    current_user.hashed_password = hashed
    db.commit()
    db.refresh(current_user)
    return {"message": "Password updated successfully"}


@router.get("/", response_model=List[schemas.UserOut])
def list_users(
    search: Optional[str] = Query(None),
    sort_field: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id  # always use current user tenant
    users, total = crud.list_users(
        db,
        tenant_id=tenant_id,
        search=search,
        sort_field=sort_field,
        sort_dir=sort_dir,
        skip=skip,
        limit=limit
    )
    return [to_user_out(u) for u in users]


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    u = crud.get_user(db, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if u.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot access users from another tenant")

    return to_user_out(u)



@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, user_in: schemas.UserUpdate, db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update users")

    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot manage users from another tenant")

    if user_in.email:
        existing = crud.get_user_by_email(db, user_in.email)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Email already in use")

    updated = crud.update_user(db, user, user_in)
    return to_user_out(updated)



@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot delete users from another tenant")

    crud.delete_user(db, user)
    return None


@router.post("/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user_route(user_in: schemas.UserCreate, db: Session = Depends(get_db),
                      current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users")

    # force tenant to current user's tenant
    user_in.tenant_id = current_user.tenant_id

    existing = crud.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already in use")

    hashed_password = pwd_context.hash(user_in.password)
    new_user = crud.create_user(db, user_in, hashed_password)
    return to_user_out(new_user)


@router.put("/approve/{user_id}", response_model=schemas.UserOut)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve users")

    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot approve users from another tenant")

    user.is_approved = True
    db.commit()
    db.refresh(user)
    return to_user_out(user)

@router.post("/{user_id}/touch", response_model=schemas.UserOut)
def touch_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot touch users from another tenant")

    user = crud.touch_last_active(db, user)
    return to_user_out(user)
