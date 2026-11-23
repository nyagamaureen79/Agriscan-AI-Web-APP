from sqlalchemy import Column, Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CropProductionData(Base):
    __tablename__ = "CropProductionData"

    id = Column(Integer, primary_key=True, index=True)

    FarmerRegistrationId = Column(
        Integer,
        ForeignKey("FarmerRegistration.id"),
        nullable=False
    )

    MainCropId = Column(
        Integer,
        ForeignKey("systemcodedetails.id"),
        nullable=False
    )

    CropVarietyId = Column(Integer, ForeignKey("systemcodedetails.id"))
    PlantingSeasonId = Column(Integer, ForeignKey("systemcodedetails.id"))

    AcreagePerCrop = Column(DECIMAL(10, 2))
    YieldQuantityInKg = Column(DECIMAL(10, 2))

    CreatedOn = Column(DateTime, server_default=func.now())
    ModifiedOn = Column(DateTime, onupdate=func.now())

    tenant_id = Column(Integer, nullable=False)

    farmer = relationship(
        "FarmerRegistration",
        back_populates="crop_productions",
        foreign_keys=[FarmerRegistrationId]
    )

    main_crop = relationship(
        "SystemCodeDetail",
        foreign_keys=[MainCropId]
    )