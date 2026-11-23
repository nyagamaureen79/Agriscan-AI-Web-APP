from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime, timedelta, timezone

EAT = timezone(timedelta(hours=3)) 


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    is_approved = Column(Boolean, nullable=False, default=False)

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    status = Column(String(50), nullable=False, default="active")
    last_active = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(EAT),
    onupdate=lambda: datetime.now(EAT),
    nullable=True
)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(EAT)) 
    failed_login_attempts = Column(Integer, default=0)
    captcha_required_until = Column(DateTime, nullable=True)

    # Backref to Tenant
    tenant = relationship("Tenant", back_populates="users")


    @property
    def name(self):
        return f"{self.first_name} {self.last_name}"