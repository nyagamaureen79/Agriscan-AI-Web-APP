# app/routes/system_code.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import SystemCodeDetail
from app.schemas.system_code import SystemCodeCreate, SystemCodeRead, SystemCodeUpdate

router = APIRouter(
    prefix="/system-codes",
    tags=["System Codes"]
)

# 🔹 Get all system codes
@router.get("/", response_model=List[SystemCodeRead])
def get_system_codes(db: Session = Depends(get_db)):
    codes = db.query(SystemCodeDetail).all()
    return codes

# 🔹 Get system codes by type
@router.get("/type/{code_type}", response_model=List[SystemCodeRead])
def get_system_codes_by_type(code_type: str, db: Session = Depends(get_db)):
    codes = db.query(SystemCodeDetail).filter(SystemCodeDetail.code_type == code_type).all()
    if not codes:
        raise HTTPException(status_code=404, detail="No codes found for this type")
    return codes

# 🔹 Create a new system code
@router.post("/", response_model=SystemCodeRead, status_code=status.HTTP_201_CREATED)
def create_system_code(code_in: SystemCodeCreate, db: Session = Depends(get_db)):
    # Optional: prevent duplicate code_type + code_value
    existing = db.query(SystemCodeDetail).filter(
        SystemCodeDetail.code_type == code_in.code_type,
        SystemCodeDetail.code_value == code_in.code_value
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")

    new_code = SystemCodeDetail(
        code_type=code_in.code_type,
        code_value=code_in.code_value,
        description=code_in.description
    )
    db.add(new_code)
    db.commit()
    db.refresh(new_code)
    return new_code

# 🔹 Update an existing system code
@router.put("/{code_id}", response_model=SystemCodeRead)
def update_system_code(code_id: int, code_in: SystemCodeUpdate, db: Session = Depends(get_db)):
    code = db.query(SystemCodeDetail).filter(SystemCodeDetail.id == code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")

    for field, value in code_in.dict(exclude_unset=True).items():
        setattr(code, field, value)

    db.commit()
    db.refresh(code)
    return code

# 🔹 Delete a system code
@router.delete("/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_code(code_id: int, db: Session = Depends(get_db)):
    code = db.query(SystemCodeDetail).filter(SystemCodeDetail.id == code_id).first()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")

    db.delete(code)
    db.commit()
    return None