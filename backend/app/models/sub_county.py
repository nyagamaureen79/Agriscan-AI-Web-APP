from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class SubCountyTbl(Base):
    __tablename__ = "SubCountyTbl"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    county_id = Column(Integer, ForeignKey("CountyTbl.id"), nullable=False)

    climate_class_id = Column(Integer, ForeignKey("ClimateClass.id"), nullable=False)

    climate_class = relationship("ClimateClass", back_populates="sub_counties")
    farmers = relationship("FarmerRegistration", back_populates="sub_county")