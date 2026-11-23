from sqlalchemy import Column, BigInteger, Integer, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Message(Base):
    __tablename__ = "Message"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id = Column(
        BigInteger, ForeignKey("Conversation.id"), nullable=False, index=True
    )
    farmer_id = Column(Integer, nullable=False, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("MessageTopic.id"), nullable=True, index=True)
    subtopic_id = Column(Integer, ForeignKey("MessageSubTopic.id"), nullable=True, index=True)
    user_message = Column(Text, nullable=True)
    bot_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    topic = relationship("MessageTopic", back_populates="messages")
    subtopic = relationship("MessageSubTopic", back_populates="messages")