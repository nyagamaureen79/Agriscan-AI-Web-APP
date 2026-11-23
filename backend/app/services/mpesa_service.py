# app/services/mpesa_service.py
import os
import time
import base64
import logging
from typing import Optional, Dict, Any
import requests
from requests.auth import HTTPBasicAuth

# For encryption
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

logger = logging.getLogger("mpesa_service")
logger.setLevel(logging.INFO)

# Config from environment
MPESA_ENV = os.getenv("MPESA_ENV", "sandbox").lower()
MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET")
MPESA_B2C_SHORTCODE = os.getenv("MPESA_B2C_SHORTCODE")
MPESA_INITIATOR_NAME = os.getenv("MPESA_INITIATOR_NAME")
# optional: either provide MPESA_SECURITY_CREDENTIAL (precomputed base64) OR MPESA_CERT_FILE to build it
MPESA_SECURITY_CREDENTIAL = os.getenv("MPESA_SECURITY_CREDENTIAL")
MPESA_CERT_FILE = os.getenv("MPESA_CERT_FILE")  # path to safaricom public cert (pem / cer)
MPESA_RESULT_URL = os.getenv("MPESA_RESULT_URL")
MPESA_TIMEOUT_URL = os.getenv("MPESA_TIMEOUT_URL")

SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

BASE_URL = SANDBOX_BASE_URL if MPESA_ENV == "sandbox" else PRODUCTION_BASE_URL

# In-memory token cache
_token_cache: Dict[str, Any] = {"access_token": None, "expires_at": 0}


def _now_ts() -> int:
    return int(time.time())


def get_access_token() -> str:
    """
    Get and cache an OAuth access token for Daraja.
    """
    global _token_cache
    if _token_cache.get("access_token") and _token_cache.get("expires_at", 0) > _now_ts() + 10:
        return _token_cache["access_token"]

    url = f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(url, auth=HTTPBasicAuth(MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET), timeout=15)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    expires_in = int(data.get("expires_in", 3600))
    _token_cache["access_token"] = token
    _token_cache["expires_at"] = _now_ts() + expires_in
    logger.info("Fetched new access token, expires in %s seconds", expires_in)
    return token


def encrypt_initiator_password(plain_password: str, cert_file: Optional[str] = None) -> str:
    """
    Encrypt initiator password using Safaricom public key certificate (PKCS#1 v1.5).
    Returns base64-encoded encrypted blob (SecurityCredential).
    You can supply MPESA_SECURITY_CREDENTIAL directly in .env to skip this at runtime.
    """
    if not cert_file:
        raise ValueError("cert_file is required to encrypt initiator password")

    with open(cert_file, "rb") as f:
        cert_data = f.read()

    # Try loading a PEM public key block or certificate containing the public key
    try:
        # If it's a .cer or certificate, try loading as public key
        public_key = serialization.load_pem_public_key(cert_data)
    except Exception:
        # Try to parse as certificate containing public key
        from cryptography import x509

        cert = x509.load_pem_x509_certificate(cert_data)
        public_key = cert.public_key()

    # Encrypt using RSA PKCS1 v1.5
    encrypted = public_key.encrypt(
        plain_password.encode("utf-8"),
        padding.PKCS1v15()
    )
    return base64.b64encode(encrypted).decode("utf-8")


def _prepare_security_credential() -> str:
    """
    Return a security credential: prefer precomputed MPESA_SECURITY_CREDENTIAL env var,
    otherwise require MPESA_CERT_FILE + initiator password env var (MPESA_INITIATOR_PASSWORD).
    NOTE: Many integrations compute this once and store the base64 in env rather than compute at runtime.
    """
    if MPESA_SECURITY_CREDENTIAL:
        return MPESA_SECURITY_CREDENTIAL

    initiator_password = os.getenv("MPESA_INITIATOR_PASSWORD")
    if not initiator_password:
        raise ValueError("MPESA_INITIATOR_PASSWORD must be set if MPESA_SECURITY_CREDENTIAL not provided")

    if not MPESA_CERT_FILE:
        raise ValueError("MPESA_CERT_FILE must be set to generate SecurityCredential")

    return encrypt_initiator_password(initiator_password, MPESA_CERT_FILE)


def initiate_b2c_payment(phone: str, amount: int, remarks: str = "Payment", command_id: str = "BusinessPayment", max_retries: int = 2) -> Dict[str, Any]:
    """
    Initiate B2C payment.
    phone: 2547XXXXXXXX format recommended (function will normalize).
    amount: integer KES
    command_id: Typically "BusinessPayment"
    """
    # normalize phone
    phone = phone.strip()
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    if phone.startswith("+"):
        phone = phone.lstrip("+")

    access_token = get_access_token()
    url = f"{BASE_URL}/mpesa/b2c/v1/paymentrequest"

    security_credential = _prepare_security_credential()

    payload = {
        "InitiatorName": MPESA_INITIATOR_NAME,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "Amount": int(amount),
        "PartyA": int(MPESA_B2C_SHORTCODE),
        "PartyB": phone,
        "Remarks": remarks[:100],
        "QueueTimeOutURL": MPESA_TIMEOUT_URL,
        "ResultURL": MPESA_RESULT_URL,
        "Occasion": "AgriPay"
    }

    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=20)
            resp.raise_for_status()
            logger.info("B2C request successful: %s", resp.text)
            return resp.json()
        except requests.HTTPError as e:
            # log response body if available
            body = ""
            try:
                body = e.response.json()
            except Exception:
                body = e.response.text if e.response else str(e)
            logger.warning("B2C HTTPError attempt %s: %s", attempt, body)
            last_exc = e
            # If it's client error (4xx) don't retry except 429
            status = getattr(e.response, "status_code", None)
            if status and 400 <= status < 500 and status != 429:
                break
        except Exception as e:
            logger.exception("B2C request attempt %s failed: %s", attempt, e)
            last_exc = e

    # raise last exception for caller to handle
    raise last_exc or RuntimeError("Unknown error initiating B2C")


def transaction_status_query(original_conversation_id: str, party_a: Optional[str] = None) -> Dict[str, Any]:
    """
    Query transaction status using TransactionStatus API.
    Use OriginalConversationID when TransactionID missing in callback.
    """
    access_token = get_access_token()
    url = f"{BASE_URL}/mpesa/transactionstatus/v1/query"  # endpoint path per Daraja
    security_credential = _prepare_security_credential()

    payload = {
        "Initiator": MPESA_INITIATOR_NAME,
        "SecurityCredential": security_credential,
        "CommandID": "TransactionStatusQuery",
        "PartyA": int(party_a) if party_a else int(MPESA_B2C_SHORTCODE),
        "IdentifierType": "4",  # 1=MSISDN, 2=Till, 4=Shortcode - using shortcode is common
        "ResultURL": MPESA_RESULT_URL,
        "QueueTimeOutURL": MPESA_TIMEOUT_URL,
        "ConversationID": original_conversation_id,  # some docs call it OriginalConversationID
        "Remarks": "AgriPay reconciliation",
        "Occasion": "Query"
    }

    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    resp = requests.post(url, json=payload, headers=headers, timeout=20)
    resp.raise_for_status()
    return resp.json()
