from sqlalchemy import Column, Integer, Numeric, SmallInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FarmerActivity(Base):
    __tablename__ = "FarmerActivity"

    farmer_activity_id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("FarmerRegistration.id"), nullable=False)
    activity_type_id = Column(Integer, ForeignKey("ActivityType.activity_type_id"), nullable=False)
    value = Column(Numeric(12, 4))
    reporting_year = Column(Integer)  # you can also use SmallInteger or YEAR type
    reporting_month = Column(SmallInteger)
    created_at = Column(DateTime)

    # Relationships
    farmer = relationship("FarmerRegistration", back_populates="activities")
    activity_type = relationship("ActivityType", back_populates="farmer_activities")