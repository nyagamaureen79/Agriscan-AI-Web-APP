from sqlalchemy import BigInteger, Column, Integer, String, Text, ForeignKey, DateTime, JSON, LargeBinary, DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class DiseaseType(Base):
    __tablename__ = "DiseaseType"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(Text)

    diseases = relationship("Disease", back_populates="disease_type")

class Disease(Base):
    __tablename__ = "Disease"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255))
    description = Column(Text)
    identification_tips = Column(Text)
    disease_type_id = Column(Integer, ForeignKey("DiseaseType.id"))
    created_on = Column(DateTime)
    image = Column(String(255), nullable=True) 
    disease_type = relationship("DiseaseType")
    symptoms = relationship("DiseaseSymptom", back_populates="disease")
    organic_treatments = relationship("DiseaseOrganicTreatment", back_populates="disease")
    chemical_treatments = relationship("DiseaseChemicalTreatment", back_populates="disease")
    preventions = relationship("DiseasePrevention", back_populates="disease")
    scan_diagnoses = relationship("ScanDiagnosis", back_populates="disease")
    affected_crops = relationship("DiseaseAffectedCrop", back_populates="disease") 


class DiseaseSymptom(Base):
    __tablename__ = "DiseaseSymptom"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    disease_id = Column(BigInteger, ForeignKey("Disease.id"))
    symptom = Column(Text)

    disease = relationship("Disease", back_populates="symptoms")

class DiseaseOrganicTreatment(Base):
    __tablename__ = "DiseaseOrganicTreatment"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    disease_id = Column(BigInteger, ForeignKey("Disease.id"))
    treatment = Column(Text)

    disease = relationship("Disease", back_populates="organic_treatments")

class DiseaseChemicalTreatment(Base):
    __tablename__ = "DiseaseChemicalTreatment"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    disease_id = Column(BigInteger, ForeignKey("Disease.id"))
    treatment = Column(Text)

    disease = relationship("Disease", back_populates="chemical_treatments")

class DiseasePrevention(Base):
    __tablename__ = "DiseasePrevention"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    disease_id = Column(BigInteger, ForeignKey("Disease.id"))
    strategy = Column(Text)

    disease = relationship("Disease", back_populates="preventions")


class DiseaseAffectedCrop(Base):
    __tablename__ = "DiseaseAffectedCrop"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    disease_id = Column(BigInteger, ForeignKey("Disease.id"))
    crop_code_id = Column(Integer)

    disease = relationship("Disease", back_populates="affected_crops")


