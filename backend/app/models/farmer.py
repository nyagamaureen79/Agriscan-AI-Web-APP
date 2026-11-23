#farmer.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class FarmerRegistration(Base):
    __tablename__ = "FarmerRegistration"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    tenant_serial_code = Column(String(6))  
    farmer_lookup_code = Column(String(50), unique=True, index=True)
    # Firebase uid of the mobile app account for this farmer. Written by the
    # mobile backend; nullable so web-managed farmers stay valid. Added by
    # migration a3c9e1f2d4b6 - run it before deploying this model.
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    # Personal Info
    FirstName = Column(String(100))
    MiddleName = Column(String(100))
    Surname = Column(String(100))
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    PhoneNumber = Column(String(20))
    NationalId = Column(String(50))
    DOB = Column(DateTime)
    HouseholdSize = Column(Integer)

    # System Codes
    SexId = Column(Integer, ForeignKey("systemcodedetails.id"))
    MaritalStatusId = Column(Integer, ForeignKey("systemcodedetails.id"))
    EducationLevelId = Column(Integer, ForeignKey("systemcodedetails.id"))
    DisabilityStatusId = Column(Integer, ForeignKey("systemcodedetails.id"))
    PrimaryOccupationId = Column(Integer, ForeignKey("systemcodedetails.id"))
    SecondaryOccupationId = Column(Integer, ForeignKey("systemcodedetails.id"))
    AnnualIncomeBracketId = Column(Integer, ForeignKey("systemcodedetails.id"))
    FarmerCooperativeId = Column(Integer, ForeignKey("systemcodedetails.id"))
    InsuranceAccessCurrentlyId = Column(Integer, ForeignKey("systemcodedetails.id"))
    LeadFarmer = Column(String(100))

    CreditAccessId = Column(Integer)

    OtherPrimaryOccupation = Column(Integer, ForeignKey("systemcodedetails.id"))
    OtherSecondaryOccupation = Column(Integer, ForeignKey("systemcodedetails.id"))
    MembersFarmerCooperative = Column(Boolean)
    

    # Location
    county_id = Column(Integer, ForeignKey("CountyTbl.id"))        
    subcounty_id = Column(Integer, ForeignKey("SubCountyTbl.id"))  
    Location = Column(String(255))
    GPSCoordinates = Column(String(100))

    # Crops
    Crops = Column(Text)

    # Documents
    IDPhoto = Column(String(255))
    FarmerPhoto = Column(String(255))

    # Audit
    Status = Column(String(50))
    # Approval workflow
    is_approved = Column(Boolean, default=False, nullable=False)
    CreatedOn = Column(DateTime)
    ModifiedOn = Column(DateTime)
    LastVisit = Column(DateTime)
    profile_completed = Column(Boolean)

    # Relationships
    tenant = relationship("Tenant")
    Sex = relationship("SystemCodeDetail", foreign_keys=[SexId])
    MaritalStatus = relationship("SystemCodeDetail", foreign_keys=[MaritalStatusId])
    EducationLevel = relationship("SystemCodeDetail", foreign_keys=[EducationLevelId])
    DisabilityStatus = relationship("SystemCodeDetail", foreign_keys=[DisabilityStatusId])
    PrimaryOccupation = relationship("SystemCodeDetail", foreign_keys=[PrimaryOccupationId])
    SecondaryOccupation = relationship("SystemCodeDetail", foreign_keys=[SecondaryOccupationId])
    OtherPrimaryOccupationRel = relationship(
    "SystemCodeDetail",
    foreign_keys=[OtherPrimaryOccupation])

    OtherSecondaryOccupationRel = relationship(
    "SystemCodeDetail",
    foreign_keys=[OtherSecondaryOccupation])
    AnnualIncomeBracket = relationship("SystemCodeDetail", foreign_keys=[AnnualIncomeBracketId])
    FarmerCooperative = relationship("SystemCodeDetail", foreign_keys=[FarmerCooperativeId])
    InsuranceAccessCurrently = relationship("SystemCodeDetail", foreign_keys=[InsuranceAccessCurrentlyId])

    county = relationship("CountyTbl", back_populates="farmers")
    sub_county = relationship("SubCountyTbl", back_populates="farmers")

    FarmProfile = relationship(
        "FarmProfile",
        back_populates="Farmer",
        uselist=False
    )
    activities = relationship("FarmerActivity", back_populates="farmer")
    crop_productions = relationship(
    "CropProductionData",
    back_populates="farmer",
    foreign_keys="[CropProductionData.FarmerRegistrationId]"
)
    
    @property
    def full_name(self):
      return " ".join(filter(None, [
        self.FirstName,
        self.MiddleName,
        self.Surname
    ]))