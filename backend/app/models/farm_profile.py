from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class FarmProfile(Base):
    __tablename__ = "FarmProfile"

    id = Column(Integer, primary_key=True, index=True)

    FarmerRegistrationId = Column(Integer, ForeignKey("FarmerRegistration.id"))

    TotalFarmSize = Column(DECIMAL(10, 2))

    LandTenureId = Column(Integer, ForeignKey("systemcodedetails.id"))
    IrrigationTypeId = Column(Integer, ForeignKey("systemcodedetails.id"))
    SoilTypeId = Column(Integer, ForeignKey("systemcodedetails.id"))
    WaterAccessId = Column(Integer, ForeignKey("systemcodedetails.id"))

    CreatedOn = Column(DateTime, default=datetime.utcnow)
    ModifiedOn = Column(DateTime, default=datetime.utcnow)

    Farmer = relationship(
    "FarmerRegistration",
    back_populates="FarmProfile"
)

    LandTenure = relationship("SystemCodeDetail", foreign_keys=[LandTenureId])
    IrrigationType = relationship("SystemCodeDetail", foreign_keys=[IrrigationTypeId])
    SoilType = relationship("SystemCodeDetail", foreign_keys=[SoilTypeId])
    WaterAccess = relationship("SystemCodeDetail", foreign_keys=[WaterAccessId])