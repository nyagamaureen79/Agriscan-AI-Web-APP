# app/models/scan_diagnosis.py
from sqlalchemy import (
    BigInteger, Column, Integer, String, Text,
    ForeignKey, DateTime, DECIMAL, SmallInteger
)
from sqlalchemy.orm import relationship
from app.database import Base


class ScanDiagnosis(Base):
    __tablename__ = "ScanDiagnosis"

    id              = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    disease_id      = Column(BigInteger, ForeignKey("Disease.id"), nullable=True)
    confidence_score= Column(DECIMAL(5, 2))
    model_version   = Column(String(50))
    mismatch_flag   = Column(SmallInteger, default=0)   # tinyint(1)
    created_on      = Column(DateTime)
    farmer_id       = Column(Integer, ForeignKey("FarmerRegistration.id"), nullable=True)
    tenant_id       = Column(BigInteger, ForeignKey("tenants.id"), nullable=False)
    diagnosis_description = Column(Text)
    crop_type_id    = Column(Integer)

    # Relationships
    disease = relationship("Disease", back_populates="scan_diagnoses", foreign_keys=[disease_id])
    farmer  = relationship("FarmerRegistration", foreign_keys=[farmer_id])
    tenant  = relationship("Tenant", foreign_keys=[tenant_id]) 