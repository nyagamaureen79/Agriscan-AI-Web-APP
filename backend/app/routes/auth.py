from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import users as schemas
# from app.schemas.users import ChangePasswordRequest
from app import auth,database
from app.models import users,tenant
from sqlalchemy import func
from datetime import datetime

from app.auth import get_current_user
from app.models.users import User
from app.routes.users import to_user_out
from datetime import datetime, timedelta
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
import requests
from fastapi import Body

EAT = timezone(timedelta(hours=3)) 
load_dotenv()  

router = APIRouter()


RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")


MAX_ATTEMPTS_BEFORE_CAPTCHA = 3
CAPTCHA_TIMEOUT = timedelta(minutes=10)


def verify_captcha(captcha_response: str) -> bool:
    secret = RECAPTCHA_SECRET_KEY  # use the variable, not the string
    payload = {"secret": secret, "response": captcha_response}
    r = requests.post("https://www.google.com/recaptcha/api/siteverify", data=payload)
    result = r.json()
    return result.get("success", False)


@router.post("/signup", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.SignupRequest, db: Session = Depends(database.get_db)):
    tenant_obj = db.query(tenant.Tenant).filter(tenant.Tenant.serial_code == payload.tenant_code).first()
    if not tenant_obj:
        raise HTTPException(status_code=404, detail="Invalid tenant code")

    existing = db.query(users.User).filter(users.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="This email is already registered")

    current_user_count = db.query(users.User).filter(
        users.User.tenant_id == tenant_obj.id,
        users.User.is_approved == True
    ).count()
    if current_user_count >= tenant_obj.max_users:
        raise HTTPException(
            status_code=403,
            detail="This organization has reached its maximum number of users. Please contact your admin."
        )

    hashed_pw = auth.hash_password(payload.password)

    new_user = users.User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone_number=payload.phone_number,
        hashed_password=hashed_pw,
        tenant_id=tenant_obj.id,
        role="user",
        is_approved=False,
        status="active",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return to_user_out(new_user)

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(users.User).filter(users.User.email == user.email).first()

    if db_user:
        # Check if CAPTCHA is required
        if db_user.failed_login_attempts >= MAX_ATTEMPTS_BEFORE_CAPTCHA:
            if not user.captcha_response:  # assume you get CAPTCHA response in login schema
                raise HTTPException(
                    status_code=403,
                    detail="Please solve CAPTCHA to continue."
                )
            # Verify CAPTCHA
            if not verify_captcha(user.captcha_response):
                raise HTTPException(
                    status_code=403,
                    detail="Invalid CAPTCHA. Please try again."
                )

    # Invalid credentials
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        if db_user:
            db_user.failed_login_attempts += 1
            db.add(db_user)
            db.commit()

        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Successful login: reset attempts
    db_user.failed_login_attempts = 0
    db_user.captcha_required_until = None
    db_user.last_active = datetime.now()
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    if db_user.status == "inactive":
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    if not db_user.is_approved:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending approval. Please wait for an administrator to approve your account."
        )

    token = auth.create_access_token({
        "sub": db_user.email,
        "role": db_user.role,
        "tenant_id": db_user.tenant_id,
    })

    refresh_token = auth.create_refresh_token({
        "sub": db_user.email   # 🔧 FIXED: use db_user.email instead of user.email
    })

    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name,
            "email": db_user.email,
            "role": db_user.role,
            "is_approved": db_user.is_approved,
            "status": db_user.status,
            "tenant_id": db_user.tenant_id,
        },
    }



@router.post("/refresh")
def refresh_token(refresh_token: str = Body(...), db: Session = Depends(database.get_db)):
    payload = auth.decode_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    email = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access_token = auth.create_access_token({"sub": user.email})
    new_refresh_token =auth. create_refresh_token({"sub": user.email})  # optional: rotate refresh token

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }
# @router.post("/change-password")
# def change_password(
#     payload: ChangePasswordRequest,
#     db: Session = Depends(database.get_db),
#     current_user: users.User = Depends(get_current_user),
    
# ):
    # 1. Verify current password
    # if not auth.verify_password(payload.current_password, current_user.hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="The current password is incorrect"
    #     )

    # 2. Prevent reusing same password
    # if auth.verify_password(payload.new_password, current_user.hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="New password must be different from current password"
    #     )

    # 3. Backend-side validation (optional but good practice)
    # if len(payload.new_password) < 8 or len(payload.new_password) > 128:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Password must be between 8 and 128 characters"
    #     )
    # if not any(c.islower() for c in payload.new_password):
    #     raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    # if not any(c.isupper() for c in payload.new_password):
    #     raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    # if not any(c.isdigit() for c in payload.new_password):
    #     raise HTTPException(status_code=400, detail="Password must contain at least one number")
    # if not any(c in "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?"
    #            for c in payload.new_password):
    #     raise HTTPException(status_code=400, detail="Password must contain at least one special character")

    # 4. Hash and update
    # hashed_pw = auth.hash_password(payload.new_password)
    # current_user.hashed_password = hashed_pw

    # db.add(current_user)
    # db.commit()
    # send_email(
    #         to_email=current_user.email,
    #         subject="Vala.ai – Password Reset Successful",
    #         html_content=f"""
    #             <html>
    #             <body style="font-family: Arial, sans-serif; color: black; line-height: 1.6;">
    #                 <p>Hi {current_user.first_name or 'User'},</p>
    #                 <p>Your password for <strong>Vala.ai</strong> has been successfully reset.</p>
    #                 <p>If you did not make this change, please contact our support team immediately.</p>
    #                 <p>Warm regards,<br>
    #                    Vala.ai Support<br>
    #                    <a href="mailto:vala.ai@goodpartnerske.org">vala.ai@goodpartnerske.org</a>
    #                 </p>
    #                 <hr>
    #                 <p style="font-size: 12px; color: #888;">
    #                     Sent from Vala.ai | {datetime.now().strftime('%b %d, %Y - %I:%M %p %Z')}<br>
    #                     Need help? Contact us at: 
    #                     <a href="mailto:vala.ai@goodpartnerske.org">vala.ai@goodpartnerske.org</a><br>
    #                     This is an automated message. Do not reply directly to this email.
    #                 </p>
    #             </body>
    #             </html>
    #         """
    #     )
    # db.refresh(current_user)
    # return {"message": "Password changed successfully"}
