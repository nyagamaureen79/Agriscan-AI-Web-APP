# app/routers/mpesa.py
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from app.schemas.payments import PaymentRequest, InitiateResponse
from app.services.mpesa_service import initiate_b2c_payment, transaction_status_query
from app.models.payments import PaymentTransaction
from app.models.financial_entry import Expense
from app.database import SessionLocal
from app.models.farmer import FarmerRegistration
from typing import Any, Optional
from datetime import datetime
import pytz
import logging
from requests.auth import HTTPBasicAuth
import requests, os, pytz
from dotenv import load_dotenv

logger = logging.getLogger("mpesa_router")
load_dotenv()

router = APIRouter(prefix="/api/mpesa/b2c", tags=["mpesa-b2c"])

MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET")
MPESA_ENV = os.getenv("MPESA_ENV", "sandbox")
MPESA_B2C_SHORTCODE = os.getenv("MPESA_B2C_SHORTCODE")
MPESA_INITIATOR_NAME = os.getenv("MPESA_INITIATOR_NAME")
MPESA_SECURITY_CREDENTIAL = os.getenv("MPESA_SECURITY_CREDENTIAL")
MPESA_RESULT_URL = os.getenv("MPESA_RESULT_URL")
MPESA_TIMEOUT_URL = os.getenv("MPESA_TIMEOUT_URL")




BASE_URL = (
    "https://api.safaricom.co.ke"
    if MPESA_ENV == "production"
    else "https://sandbox.safaricom.co.ke"
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_access_token():
    url = f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(url, auth=HTTPBasicAuth(MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET))
    resp.raise_for_status()
    return resp.json().get("access_token")

def initiate_b2c_payment(phone: str, amount: int, remarks: str = "Payment"):
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("+"):
        phone = phone.lstrip("+")

    token = get_access_token()
    url = f"{BASE_URL}/mpesa/b2c/v1/paymentrequest"

    payload = {
        "InitiatorName": MPESA_INITIATOR_NAME,
        "SecurityCredential": MPESA_SECURITY_CREDENTIAL,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": int(MPESA_B2C_SHORTCODE),
        "PartyB": phone,
        "Remarks": remarks,
        "QueueTimeOutURL": MPESA_TIMEOUT_URL,
        "ResultURL": MPESA_RESULT_URL,
        "Occasion": "FarmerPayment"
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    resp = requests.post(url, json=payload, headers=headers)
    resp.raise_for_status()
    return resp.json()

# -- Get farmer phone ---
def get_farmer_phone(db: Session, farmer_id: int) -> str | None:
    farmer = db.query(FarmerRegistration).filter(FarmerRegistration.id == farmer_id).first()
    if not farmer:
        return None

    phone = getattr(farmer, "PhoneNumber", None) or getattr(farmer, "phone", None)
    if not phone:
        return None

    phone = phone.strip()
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("+"):
        phone = phone.lstrip("+")
    return phone

# --- Main endpoint: initiate payment --
@router.post("/initiate", response_model=InitiateResponse)
def initiate_payment(req: PaymentRequest, db: Session = Depends(get_db)):
    phone = get_farmer_phone(db, req.farmer_id)
    if not phone:
        raise HTTPException(status_code=404, detail="Farmer or phone number not found")
    
    farmer = db.query(FarmerRegistration).filter(FarmerRegistration.id == req.farmer_id).first()
    if not farmer:
       raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer_full_name = f"{farmer.FirstName or ''} {farmer.Surname or ''}".strip()
    reference_text = req.reference or "General Expense"
    
    expense = Expense(
    title=reference_text,
    category=reference_text,  # use the reference as the category
    description=f"M-Pesa B2C payment to {farmer_full_name}",
    amount=float(req.amount),
    date=datetime.utcnow(),
    created_at=datetime.utcnow(),
)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    tx = PaymentTransaction(
        farmer_id=req.farmer_id,
        farmer_name=farmer_full_name,
        phone=phone,
        amount=float(req.amount),
        reference=reference_text,
        status="pending",
        initiator_name=MPESA_INITIATOR_NAME,
        created_at=datetime.utcnow(),
        expense_id=expense.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    try:
        mpesa_resp = initiate_b2c_payment(phone=phone, amount=int(req.amount),  remarks=reference_text)

        tx.raw_response = str(mpesa_resp)
        tx.conversation_id = mpesa_resp.get("ConversationID")
        tx.initiator_name = MPESA_INITIATOR_NAME
        db.commit()

    except requests.HTTPError as e:
        tx.status = "failed"
        tx.raw_response = str(e.response.json() if e.response else e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"M-Pesa request failed: {e}")

    return InitiateResponse(
        message="B2C request sent successfully. Await callback for confirmation.",
        transaction_id=tx.id,
        mpesa_response=mpesa_resp
    )

# --- Callback (Result URL) --
@router.post("/result")
async def b2c_result(request: Request, db: Session = Depends(get_db)):
    """
    Handle M-Pesa B2C Result Callback
    """
    try:
        data = await request.json()
        print(" B2C Result Callback:", data)

        result = data.get("Result", {})
        result_code = result.get("ResultCode")
        result_desc = result.get("ResultDesc")

        # Both possible conversation IDs
        conv_id = result.get("ConversationID")
        originator_conv_id = result.get("OriginatorConversationID")

        # Match by either ConversationID or OriginatorConversationID
        rec = (
            db.query(PaymentTransaction)
            .filter(
                (PaymentTransaction.conversation_id == conv_id) |
                (PaymentTransaction.conversation_id == originator_conv_id)
            )
            .order_by(PaymentTransaction.created_at.desc())
            .first()
        )

        if not rec:
            print(f"No matching transaction found for ConversationID={conv_id} or OriginatorConversationID={originator_conv_id}")
            return {"ResultCode": 1, "ResultDesc": "No matching transaction found"}

        # Extract details if transaction succeeded
        rec.status = "success" if result_code == 0 else "failed"
        rec.raw_response = str(result)
        rec.updated_at = datetime.utcnow()

        # Optional fields from ResultParameters
        params = result.get("ResultParameters", {}).get("ResultParameter", [])
        param_map = {p["Key"]: p["Value"] for p in params if "Key" in p and "Value" in p}

        rec.mpesa_transaction_id = param_map.get("TransactionReceipt")
        rec.amount = param_map.get("TransactionAmount", rec.amount)
        rec.notes = result_desc

        db.commit()
        print(f" Transaction {rec.id} updated as {rec.status} ({rec.mpesa_transaction_id})")

        return {"ResultCode": 0, "ResultDesc": "Callback processed successfully"}

    except Exception as e:
        db.rollback()
        print(f" Error in B2C result processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Timeout callback ---
@router.post("/timeout")
async def b2c_timeout(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    print(" Timeout Payload:", payload)

    try:
        conv_id = payload.get("ConversationID")
        rec = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.conversation_id == conv_id)
            .order_by(PaymentTransaction.created_at.desc())
            .first()
        )
        if rec:
            rec.status = "timeout"
            rec.raw_response = str(payload)
            db.commit()

    except Exception as e:
        print("Error processing timeout:", e)

    return {"ResultCode": 0, "ResultDesc": "Timeout received"}

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    eat = pytz.timezone("Africa/Nairobi")
    txs = db.query(PaymentTransaction).order_by(PaymentTransaction.created_at.desc()).all()
    out = []
    for t in txs:
        farmer = db.query(FarmerRegistration).filter(FarmerRegistration.id == t.farmer_id).first()
        farmer_name = f"{getattr(farmer, 'FirstName', '')} {getattr(farmer, 'Surname', '')}".strip() if farmer else "Unknown"
        farmer_location = getattr(farmer, "Location", "Unknown") if farmer else "Unknown"
        date_eat = t.created_at.astimezone(eat).strftime("%Y-%m-%d %H:%M:%S") if t.created_at else None
        out.append({
            "id": t.id,
            "date": date_eat,
            "mpesa_transaction_id": t.mpesa_transaction_id,
            "farmer": {"name": farmer_name or "Unknown", "location": farmer_location},
            "amount": t.amount,
            "method": "M-Pesa",
            "status": t.status
        })
    return out


@router.get("/admin/query_status")
def admin_query_status(conversation_id: str = Query(..., description="OriginalConversationID/ConversationID"),
                       db: Session = Depends(get_db)):
    """
    Admin endpoint: force a TransactionStatus query using OriginalConversationID.
    Useful for reconciliation when callbacks were missed.
    """
    try:
        resp = transaction_status_query(original_conversation_id=conversation_id)
    except Exception as e:
        logger.exception("Transaction status query failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    # Optionally: attempt to match response to your PaymentTransaction entries (left for implementer)
    return {"status_query_response": resp}


@router.get("/farmer/{farmer_id}/history")
def get_farmer_payment_history(farmer_id: int, db: Session = Depends(get_db)):
    """
    Fetch all payment transactions for a specific farmer.
    """
    eat = pytz.timezone("Africa/Nairobi")
   
    # Query payments belonging to this farmer
    payments = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.farmer_id == farmer_id)
        .order_by(PaymentTransaction.created_at.desc())
        .all()
    )

    if not payments:
        raise HTTPException(status_code=404, detail="No payment history found for this farmer.")

    farmer = db.query(FarmerRegistration).filter(FarmerRegistration.id == farmer_id).first()
    farmer_name = (
        f"{getattr(farmer, 'FirstName', '')} {getattr(farmer, 'Surname', '')}".strip()
        if farmer else "Unknown Farmer"
    )
    farmer_phone = getattr(farmer, "PhoneNumber", None) or getattr(farmer, "phone", None)

    # Format transactions for frontend
    result = []
    for t in payments:
        result.append({
            "id": t.id,
            "date": t.created_at.astimezone(eat).strftime("%Y-%m-%d"),
            "amount": float(t.amount or 0),
            "purpose": t.reference or "Farmer Payment",
            "method": "M-Pesa",
            "status": t.status or "unknown",
            "reference": t.mpesa_transaction_id or "N/A",
        })

    return {
        "farmer": {
            "id": farmer_id,
            "name": farmer_name,
            "phone": farmer_phone,
        },
        "payments": result,
    }

@router.get("/stats")
def get_mpesa_stats(db: Session = Depends(get_db)):
    """
    Returns key M-Pesa / payment statistics for the dashboard.
    """
    # --- Query totals ---
    total_disbursed = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.status == "success")
        .with_entities(
            (PaymentTransaction.amount)
        )
        .all()
    )
    total_disbursed_amount = sum([float(x[0]) for x in total_disbursed]) if total_disbursed else 0

    total_transactions = db.query(PaymentTransaction).count()
    active_beneficiaries = (
        db.query(FarmerRegistration)
        .join(PaymentTransaction, PaymentTransaction.farmer_id == FarmerRegistration.id)
        .distinct(FarmerRegistration.id)
        .count()
    )

    # Example: You could fetch total funds from a DB table or .env
    total_funds_available = float(os.getenv("TOTAL_FUNDS_AVAILABLE", 800000))  # configurable

    # Calculate remaining balance
    remaining_balance = total_funds_available - total_disbursed_amount

    return {
        "Total Funds Available": f"KES {remaining_balance:,.2f}",
        "Total Disbursed": f"KES {total_disbursed_amount:,.2f}",
        "Total Transactions": total_transactions,
        "Active Beneficiaries": active_beneficiaries,
    }
