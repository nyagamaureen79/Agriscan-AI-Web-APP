from sqlalchemy import Column, Integer, String, DECIMAL, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime

# models/tenant.py
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name = Column(String(150), nullable=False, unique=True)
    contact_email = Column(String(150), nullable=False, unique=True)
    slug_url = Column(String(150), nullable=False, unique=True)
    contact_phone = Column(String(50), nullable=False)
    billing_address = Column(String(255), nullable=False)
    monthly_fee = Column(DECIMAL(10, 2), nullable=False)
    max_users = Column(Integer, nullable=False)
    status = Column(String(20), default="active")
    serial_code = Column(String(6), nullable=False, unique=True)
    plan = Column(String(50), default="basic")
    country = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="tenant", cascade="all, delete")
    payments = relationship("Payment", back_populates="tenant")

