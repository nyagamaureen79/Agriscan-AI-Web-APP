from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.disease import Disease, DiseaseType, DiseaseSymptom, DiseaseOrganicTreatment, DiseaseChemicalTreatment, DiseasePrevention, DiseaseAffectedCrop

class DiseaseDetectionResponse(BaseModel):
    id: int
    disease_id: int
    name: str | None
    severity: str
    confidence: float
    detectedDate: str | None
    farmer: str | None
    cropType: Optional[int] = None
    location: str | None
    image: str | None

    class Config:
        orm_mode = True


class DiseaseDetailResponse(BaseModel):
    id: int
    name: str
    description: str
    identification_tips: str | None

    severity: str | None
    confidence: float | None
    detectedDate: str | None

    activeCases: int
    subCountiesAffected: int
    commonlyAffects: list[str]
    image: Optional[str] 

    symptoms: list[str]
    organic_treatments: list[str]
    chemical_treatments: list[str]
    preventions: list[str]

    class Config:
        orm_mode = True

class AffectedFarmResponse(BaseModel):
    diseaseName: str
    detectedDate: str
    location: str

class DiseaseTypeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        orm_mode = True  