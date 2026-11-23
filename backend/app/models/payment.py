from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(255), unique=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    amount = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)  # paid, pending, overdue, failed
    payment_method = Column(String(100), nullable=False)
    due_date = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True) 
    # description = Column(String, nullable=True)
    
    tenant = relationship("Tenant", back_populates="payments")