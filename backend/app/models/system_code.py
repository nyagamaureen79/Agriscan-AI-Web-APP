from sqlalchemy import Column, Integer, String
from app.database import Base


class SystemCodeDetail(Base):
    __tablename__ = "systemcodedetails"

    id = Column(Integer, primary_key=True)
    code_type = Column(String(100), nullable=False)   # e.g. Sex, PrimaryOccupation
    code_value = Column(String(255), nullable=False)       # e.g. Male, Farming
    description = Column(String(255))
