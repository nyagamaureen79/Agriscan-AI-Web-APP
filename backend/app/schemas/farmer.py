from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PersonalInfo(BaseModel):
    sex: Optional[str] = None
    dateOfBirth: Optional[str] = None
    age: Optional[str] = None
    gpsCoordinates: Optional[str] = None
    primaryOccupation: Optional[str] = None
    otherPrimaryOccupation: Optional[str] = None
    secondaryOccupation: Optional[str] = None
    otherSecondaryOccupation: Optional[str] = None
    annualIncomeBracket: Optional[str] = None
    nationalId: Optional[str] = None
    farmerCooperative: Optional[str] = None
    leadFarmer: Optional[str] = None
    idPhoto: Optional[str] = None

class FeatureUsed(BaseModel):
    name: str
    status: Optional[str]
    active: Optional[bool]

class RecentActivity(BaseModel):
    title: str
    description: Optional[str]
    time: Optional[str]

class FarmerOut(BaseModel):
    avatar: Optional[str]
    name: str
    phone: Optional[str]
    location: Optional[str]
    status: Optional[str]
    crops: List[str] = []
    joinedDate: Optional[str]
    farmSize: Optional[str]
    lastVisit: Optional[str]
    activities: Optional[str]
    personalInfo: PersonalInfo
    featuresUsed: List[FeatureUsed] = []
    recentActivity: List[RecentActivity] = []

    class Config:
        orm_mode = True

class FarmerUpdate(BaseModel):
    avatar: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    crops: Optional[List[str]] = None
    joinedDate: Optional[str] = None
    # farmSize: Optional[str] = None
    lastVisit: Optional[str] = None
    activities: Optional[str] = None
    personalInfo: Optional[PersonalInfo] = None


class FarmerCreate(BaseModel):
    FirstName: str
    MiddleName: Optional[str] = None
    Surname: str
    username: Optional[str] = None
    PhoneNumber: str
    password: str
    Location: Optional[str] = None
    Status: Optional[str] = "Active"

class CropsOut(BaseModel):
    crops: List[str]

class FarmerApprovalRequest(BaseModel):
    action: str 