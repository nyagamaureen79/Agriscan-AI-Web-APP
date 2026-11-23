from sqlalchemy import (
    Column,
    Integer,
    Text,
    ForeignKey,
    String,
    DateTime,
    func
)

from sqlalchemy.orm import relationship

from app.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True)

    document_id = Column(
        Integer,
        ForeignKey("Documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    tenant_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    chunk_index = Column(Integer, nullable=False)

    chunk_text = Column(Text, nullable=False)

    datapoint_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    page_number = Column(Integer, nullable=True)

    file_name = Column(String(255), nullable=False, index=True)

    created_at = Column(
        DateTime,
        default=func.now()
    )

    document = relationship(
        "Document",
        back_populates="chunks"
    )