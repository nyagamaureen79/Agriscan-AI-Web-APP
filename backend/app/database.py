from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
import pymysql

# Load environment variables
load_dotenv()

# Get DATABASE_URL (without ssl in query string)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")


if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL not set in environment variables.")

# Create engine with SSL context
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={
        "ssl": {"ssl": {}}  # tells PyMySQL to use default SSL context
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
