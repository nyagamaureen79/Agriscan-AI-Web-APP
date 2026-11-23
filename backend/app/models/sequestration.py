from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, TIMESTAMP, SmallInteger
from app.database import Base

class SequestrationRecord(Base):
    __tablename__ = "SequestrationRecord"

    sequestration_record_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("FarmerRegistration.id"))
    farmer_sequestration_id = Column(Integer)
    raw_carbon_removed = Column(DECIMAL(14, 6))
    uncertainty_pct = Column(DECIMAL(5, 2))
    creditable_carbon_removed = Column(DECIMAL(14, 6))
    carbon_removed = Column(DECIMAL(14, 6))
    co2e_value = Column(DECIMAL(24, 6))
    reporting_year = Column(Integer)
    reporting_month = Column(SmallInteger)
    permanence_years = Column(Integer)
    created_at = Column(TIMESTAMP)
