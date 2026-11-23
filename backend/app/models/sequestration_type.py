from sqlalchemy import Column, String, Integer, Text
from app.database import Base

class SequestrationType(Base):
    __tablename__ = "SequestrationType"

    sequestration_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    unit = Column(String(50))
    description = Column(Text)