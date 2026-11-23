from sqlalchemy import Column, BigInteger, Integer, String, TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base


class Conversation(Base):
    __tablename__ = "Conversation"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    farmer_id = Column(Integer, nullable=False, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=True)
    started_at = Column(TIMESTAMP, nullable=False)
    last_message_at = Column(TIMESTAMP, nullable=True)

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )