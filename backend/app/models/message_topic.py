from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP
from sqlalchemy.orm import relationship
from app.database import Base


class MessageTopic(Base):
    __tablename__ = "MessageTopic"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_key = Column(String(100), nullable=False, unique=True)
    topic_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False)

    subtopics = relationship("MessageSubTopic", back_populates="topic")
    messages = relationship("Message", back_populates="topic")