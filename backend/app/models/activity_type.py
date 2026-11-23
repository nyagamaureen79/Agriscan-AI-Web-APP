# app/models/activity_type.py
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base

class ActivityType(Base):
    __tablename__ = "ActivityType"

    activity_type_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    unit = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    # relationships
    emission_factors = relationship(
        "EmissionFactor",
        back_populates="activity_type",
        cascade="all, delete-orphan"
    )
    farmer_activities = relationship("FarmerActivity", back_populates="activity_type")