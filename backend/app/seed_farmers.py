import random
from datetime import datetime, timedelta
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.models.farmer import FarmerRegistration
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Use same DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"ssl": {"ssl": {}}})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Create a new Base just for Farmer
Base = declarative_base()
Base.metadata.create_all(bind=engine)  # ensures FarmerRegistration table exists

def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])

def random_date(start_year=1960, end_year=2005):
    start = datetime(start_year,1,1)
    end = datetime(end_year,12,31)
    return start + timedelta(days=random.randint(0,(end-start).days))

def seed_farmers(total=400):
    db = SessionLocal()
    farmers = []

    for i in range(1, total+1):
        f = FarmerRegistration(
            FirstName=f"Farmer{i}",
            MiddleName=f"M{i}",
            Surname=f"Surname{i}",
            username=f"farmer{i}",
            password=hash_password("password123"),
            SexId=random.choice([1,2]),
            DOB=random_date(),
            MaritalStatusId=random.choice([3,4,5,6]),
            EducationLevelId=random.choice([7,8,9,10]),
            HouseholdSize=random.randint(1,10),
            DisabilityStatusId=random.choice([11,12,13]),
            GPSCoordinates=f"-1.{random.randint(100000,999999)},36.{random.randint(100000,999999)}",
            PrimaryOccupationId=random.choice([17,18]),
            OtherPrimaryOccupation=None,
            SecondaryOccupationId=random.choice([19,20]),
            OtherSecondaryOccupation=None,
            AnnualIncomeBracketId=random.choice([22,23,24]),
            CreditAccessId=random.choice([1,2]),
            MembersFarmerCooperative=random.choice([0,1]),
            FarmerCooperativeId=random.choice([25,26]),
            InsuranceAccessCurrentlyId=random.choice([27,28]),
            NationalId=f"NID{i:06d}",
            IDPhoto=None,
            FarmerPhoto=None,
            DataUseSharingConsent=random.choice([0,1]),
            CreatedOn=datetime.utcnow(),
            ModifiedOn=datetime.utcnow(),
            CreatedById=1,
            ModifiedById=1,
            PhoneNumber=f"07{random.randint(10000000,99999999)}",
            Location="Some Location",
            Crops=random.choice(["Maize","Beans","Tomatoes"]),
            LastVisit=datetime.utcnow() - timedelta(days=random.randint(1,365)),
            Status="Active",
            county_id=random.randint(1,47),
            subcounty_id=random.randint(1,306),
            profile_completed=1
        )
        farmers.append(f)

    try:
        db.bulk_save_objects(farmers)
        db.commit()
        print(f"✅ Successfully inserted {total} farmers.")
    except Exception as e:
        db.rollback()
        print("❌ Error inserting farmers:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed_farmers(400)