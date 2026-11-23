from sqlalchemy import Column, Integer, String, Text, Enum, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Document(Base):
    __tablename__ = "Documents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    document_name = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(255))
    file_size = Column(BigInteger)
    category = Column(String(100))
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="Processing", index=True)
    s3_url = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    num_chunks = Column(Integer, default=0) 

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )
