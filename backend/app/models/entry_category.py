from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey,String, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class EntryCategory(Base):
    __tablename__ = "EntryCategory"

    id = Column(Integer, primary_key=True, index=True)

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    name = Column(String(150), nullable=False)

    EntryType = Column(Enum("Income", "Expense", name="entry_type_enum"), nullable=False)

    is_active = Column(Integer, default=1)

    CreatedOn = Column(DateTime(timezone=True), server_default=func.now())