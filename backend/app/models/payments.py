from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Numeric,ForeignKey
from datetime import datetime
from app.database import Base
from sqlalchemy.orm import relationship

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, index=True)
    farmer_name = Column(String(255), nullable=True)
    phone = Column(String(20))
    amount = Column(Numeric(10, 2))  # More accurate for currency
    reference = Column(String(255), nullable=True)
    payment_method = Column(String(100), nullable=True)
    purpose = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending, success, failed, timeout
    transaction_id = Column(String(255), nullable=True)
    checkout_request_id = Column(String(255), nullable=True)
    conversation_id = Column(String(255), nullable=True)
    initiator_name = Column(String(255), nullable=True)
    mpesa_transaction_id = Column(String(255), nullable=True)
    raw_response = Column(Text, nullable=True)

    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    expense = relationship("Expense", back_populates="payment_transaction")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
