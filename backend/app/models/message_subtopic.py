from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class MessageSubTopic(Base):
    __tablename__ = "MessageSubTopic"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("MessageTopic.id"), nullable=False, index=True)
    subtopic_key = Column(String(120), nullable=False, unique=True)
    subtopic_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False)

    topic = relationship("MessageTopic", back_populates="subtopics")
    messages = relationship("Message", back_populates="subtopic")