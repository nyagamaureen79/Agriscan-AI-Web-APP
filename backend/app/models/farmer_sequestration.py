from sqlalchemy import DECIMAL, TIMESTAMP, Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FarmerSequestrationActivity(Base):
    __tablename__ = "FarmerSequestrationActivity"

    farmer_sequestration_id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("FarmerRegistration.id"))
    sequestration_type_id = Column(Integer, ForeignKey("SequestrationType.sequestration_type_id"))

    value = Column(DECIMAL(12, 4))
    reporting_year = Column(Integer)
    reporting_month = Column(Integer)
    created_at = Column(TIMESTAMP)

    sequestration_type = relationship("SequestrationType")