from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database import Base

class CountyTbl(Base):
    __tablename__ = "CountyTbl"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    countycode = Column(String(3), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    farmers = relationship("FarmerRegistration", back_populates="county")