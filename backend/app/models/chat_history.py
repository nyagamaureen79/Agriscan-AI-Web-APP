from sqlalchemy import Column, ForeignKey, Integer, String, Text, DateTime, Enum
from app.database import Base

class ChatHistory(Base):
    __tablename__ = "ChatHistory"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    FarmerRegistrationId = Column(Integer)
    conversation_id = Column(String(36))
    topic = Column(String(150))
    message = Column(Text)
    sender = Column(Enum("Farmer", "Bot"))
    message_type = Column(Enum("Text", "Image", "Audio"))
    created_at = Column(DateTime)
    synced = Column(Integer)
    meta_data = Column("metadata", Text)
