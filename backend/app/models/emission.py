from sqlalchemy import Column, Integer, ForeignKey, String, DECIMAL, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EmissionRecord(Base):
    __tablename__ = "EmissionRecord"

    emission_record_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    farmer_id = Column(Integer, ForeignKey("FarmerRegistration.id"), nullable=False)
    farmer_activity_id = Column(Integer, nullable=True)
    activity_type_id = Column(Integer, nullable=True)

    gas = Column(String(10), nullable=False)  # e.g. CO2, CH4, N2O

    emission_value = Column(DECIMAL(14, 6), nullable=False)   # raw emission
    co2e_value = Column(DECIMAL(14, 6), nullable=False)       # converted CO2e

    reporting_year = Column(Integer, nullable=False)
    reporting_month = Column(Integer, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationship
    farmer = relationship("FarmerRegistration", backref="emissions")