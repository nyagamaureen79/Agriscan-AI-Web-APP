# app/models/emission_factor.py
from sqlalchemy import Column, Integer, ForeignKey, String, DECIMAL, TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base

class EmissionFactor(Base):
    __tablename__ = "EmissionFactor"

    emission_factor_id = Column(Integer, primary_key=True, index=True)
    activity_type_id = Column(
        Integer,
        ForeignKey("ActivityType.activity_type_id"),  #  THIS IS REQUIRED
        nullable=False
    )
    climate_class_id = Column(Integer, ForeignKey("ClimateClass.id"), nullable=False)
    gas = Column(String(10), nullable=False)
    factor_value = Column(DECIMAL(14,6), nullable=False)
    unit = Column(String(100), nullable=True)
    source = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, server_default="CURRENT_TIMESTAMP")

    # relationships
    climate_class = relationship("ClimateClass", back_populates="emission_factors")
    # EmissionFactor model
    activity_type = relationship("ActivityType", back_populates="emission_factors")