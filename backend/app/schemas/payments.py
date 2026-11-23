# app/schemas/payments.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PaymentRequest(BaseModel):
    farmer_id: int = Field(..., example=1)
    amount: float = Field(..., example=1000.0)
    reference: Optional[str] = None


class InitiateResponse(BaseModel):
    message: str
    transaction_id: int
    mpesa_response: dict | None = None


# Generic callback payload — accept any JSON and store it (structure varies)
class CallbackPayload(BaseModel):
    payload: dict



class PaymentTransactionBase(BaseModel):
    farmer_id: Optional[int] = None
    farmer_name: Optional[str] = None
    amount: float
    payment_method: Optional[str] = "M-Pesa"
    purpose: Optional[str] = None
    notes: Optional[str] = None
    initiator_name: Optional[str] = None  # New field

class PaymentTransactionCreate(PaymentTransactionBase):
    pass

class PaymentTransactionResponse(PaymentTransactionBase):
    id: int
    status: str
    transaction_id: Optional[str]
    checkout_request_id: Optional[str]
    conversation_id: Optional[str]  #  New field
    created_at: datetime

    class Config:
        orm_mode = True

