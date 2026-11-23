import random
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.farmer import FarmerRegistration
from app.models.farmer_activity import FarmerActivity
from app.models.emission_factor import EmissionFactor
from app.models.emission import EmissionRecord
from app.models.sub_county import SubCountyTbl
from app.models.climate import ClimateClass
from app.models.activity_type import ActivityType
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ------------------------
# CONFIG
# ------------------------
today = datetime.utcnow()
start_year = today.year - 1
focus_months = [9, 10, 11, 12]  # heavy focus
gwp_map = {"CO2": 1, "CH4": 28, "N2O": 265}


def seed_activities_and_emissions(records_per_month=20):
    db = SessionLocal()
    try:
        farmers = db.query(FarmerRegistration).all()
        print(f"Total farmers found: {len(farmers)}")

        if not farmers:
            print("❌ No farmers found")
            return

        factors = db.query(EmissionFactor).all()
        print(f"Total emission factors found: {len(factors)}")

        if not factors:
            print("❌ No emission factors found")
            return

        factor_map = {}
        for f in factors:
            key = (f.activity_type_id, f.climate_class_id)
            factor_map.setdefault(key, []).append(f)

        total_activities = 0
        total_emissions = 0
        skipped_no_subcounty = 0
        skipped_no_climate = 0
        skipped_no_activity_type = 0

        for month in focus_months:
            print(f"\nProcessing month: {month}")

            for i in range(records_per_month):

                farmer = random.choice(farmers)

                # Debug farmer info
                print(f"Trying farmer ID: {farmer.id}, subcounty_id: {farmer.subcounty_id}")

                # 🔎 Check subcounty relationship
                if not farmer.sub_county:
                    skipped_no_subcounty += 1
                    print("   ➜ Skipped: sub_county relationship is None")
                    continue

                if not farmer.sub_county.climate_class_id:
                    skipped_no_climate += 1
                    print("   ➜ Skipped: climate_class_id is None")
                    continue

                climate_class_id = farmer.sub_county.climate_class_id
                print(f"   ➜ Climate class: {climate_class_id}")

                possible_types = list({
                    f.activity_type_id
                    for f in factors
                    if f.climate_class_id == climate_class_id
                })

                print(f"   ➜ Matching activity types: {possible_types}")

                if not possible_types:
                    skipped_no_activity_type += 1
                    print("   ➜ Skipped: No activity types for this climate")
                    continue

                activity_type_id = random.choice(possible_types)
                value = round(random.uniform(10, 500), 2)

                activity = FarmerActivity(
                    farmer_id=farmer.id,
                    activity_type_id=activity_type_id,
                    value=value,
                    reporting_year=start_year,
                    reporting_month=month
                )
                db.add(activity)
                db.flush()

                total_activities += 1
                print(f"   ✅ Activity created ID: {activity.farmer_activity_id}")

                key = (activity_type_id, climate_class_id)

                for f in factor_map.get(key, []):
                    emission_value = float(value) * float(f.factor_value)
                    co2e_value = emission_value * gwp_map.get(f.gas, 1)

                    emission = EmissionRecord(
                        farmer_id=farmer.id,
                        farmer_activity_id=activity.farmer_activity_id,
                        activity_type_id=activity_type_id,
                        gas=f.gas,
                        emission_value=emission_value,
                        co2e_value=co2e_value,
                        reporting_year=start_year,
                        reporting_month=month
                    )
                    db.add(emission)
                    total_emissions += 1

                print(f"   ✅ Emissions created for activity")

        db.commit()

        print("\n================ SUMMARY ================")
        print(f"Total activities inserted: {total_activities}")
        print(f"Total emissions inserted: {total_emissions}")
        print(f"Skipped (no subcounty): {skipped_no_subcounty}")
        print(f"Skipped (no climate): {skipped_no_climate}")
        print(f"Skipped (no activity type): {skipped_no_activity_type}")
        print("=========================================")

    except Exception as e:
        db.rollback()
        print("❌ Error seeding data:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed_activities_and_emissions(records_per_month=50)