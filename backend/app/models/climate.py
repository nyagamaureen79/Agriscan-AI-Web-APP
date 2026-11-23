# app/models/climate.py
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base

class ClimateClass(Base):
    __tablename__ = "ClimateClass"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    ipcc_zone = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    # relationships
    emission_factors = relationship("EmissionFactor", back_populates="climate_class")
    sub_counties = relationship("SubCountyTbl", back_populates="climate_class")