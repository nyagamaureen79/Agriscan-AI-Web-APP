#financial_entry.py
from datetime import datetime
from sqlalchemy import Column, Integer, Enum, String, DECIMAL, Date, DateTime, ForeignKey, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base  # your existing SQLAlchemy Base

class FinancialEntry(Base):
    __tablename__ = "financialentries"

    id = Column(Integer, primary_key=True, index=True)
    FarmerRegistrationId = Column(Integer, ForeignKey("FarmerRegistration.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False) 
    EntryType = Column(Enum("Income", "Expense", name="entry_type_enum"), nullable=False)
    CategoryId = Column(Integer, ForeignKey("EntryCategory.id"), nullable=False)
    Amount = Column(DECIMAL(12, 2), nullable=False)
    EntryDate = Column(Date, nullable=False)
    Notes = Column(String(255), nullable=True)
    Status = Column(Enum("Paid", "Pending", name="entry_status_enum"), nullable=False, server_default="Paid")
    CreatedOn = Column(DateTime(timezone=True), server_default=func.now())
    ModifiedOn = Column(DateTime(timezone=True), onupdate=func.now())
    CreatedById = Column(Integer, ForeignKey("users.id"), nullable=True)
    ModifiedById = Column(Integer, ForeignKey("users.id"), nullable=True)

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    payment_transaction = relationship("PaymentTransaction", back_populates="expense", uselist=False)

class Revenue(Base):
    __tablename__ = "revenues"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)