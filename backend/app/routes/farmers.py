 # backend/routes/farmers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.farmer import FarmerRegistration
from datetime import datetime
from app.schemas.farmer import FarmerOut, FarmerUpdate, PersonalInfo, FarmerCreate, CropsOut, FarmerApprovalRequest
from sqlalchemy import func
from datetime import date
from app.models.payments import PaymentTransaction  
from sqlalchemy.orm import joinedload
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.models.farm_profile import FarmProfile
from app.models.system_code import SystemCodeDetail
from app.models.sub_county import SubCountyTbl
from app.models.county import CountyTbl
from app.auth import get_current_user
from app.models.users import User
from typing import List, Optional
from fastapi import Query
from sqlalchemy import func, case
from typing import Optional


router = APIRouter(prefix="/farmers", tags=["Farmers"])

def calculate_age(dob):
    if not dob:
        return None
    today = date.today()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


class PersonalInfoPayload(BaseModel):
    firstName: str
    middleName: Optional[str] = None
    surname: str
    sex: Optional[str] = None
    dateOfBirth: Optional[str] = None
    nationalId: Optional[str] = None
    maritalStatus: Optional[str] = None
    educationLevel: Optional[str] = None
    disabilityStatus: Optional[str] = None
    householdSize: Optional[int] = None
    county: Optional[int] = None      
    subCounty: Optional[int] = None     
    gpsCoordinates: Optional[str] = None
    primaryOccupation: Optional[str] = None
    otherPrimaryOccupation: Optional[str] = None
    secondaryOccupation: Optional[str] = None
    otherSecondaryOccupation: Optional[str] = None
    annualIncomeBracket: Optional[str] = None
    creditAccess: Optional[str] = None
    insuranceAccess: Optional[str] = None
    farmerCooperative: Optional[str] = None
    leadFarmer: Optional[str] = None
    membersInCooperative: Optional[bool] = None
    landTenure: Optional[str] = None
    irrigationType: Optional[str] = None
    soilType: Optional[str] = None
    waterAccessType: Optional[str] = None

class FarmerCreatePayload(BaseModel):
    name: str
    username: str
    phone: str
    location: str
    status: Optional[str] = "Active"
    farmSize: Optional[float] = None
    crops: Optional[List[str]] = []
    personalInfo: PersonalInfoPayload


def get_system_code(db: Session, code_type: str, code_value: str) -> Optional[int]:
    """Return SystemCodeDetail id for a given type/value."""
    code = db.query(SystemCodeDetail).filter_by(
        code_type=code_type,
        code_value=code_value
    ).first()
    return code.id if code else None

def get_county_id(db: Session, county_name: str) -> Optional[int]:
    county = db.query(CountyTbl).filter(CountyTbl.name.ilike(county_name)).first()
    return county.id if county else None

def get_subcounty_id(db: Session, subcounty_name: str) -> Optional[int]:
    subcounty = db.query(SubCountyTbl).filter(SubCountyTbl.name.ilike(subcounty_name)).first()
    return subcounty.id if subcounty else None


@router.get("/")
def get_farmers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    last_payment_subq = (
        db.query(
            PaymentTransaction.farmer_id,
            func.max(PaymentTransaction.created_at).label("last_payment")
        )
        .filter(PaymentTransaction.status == "success")
        .group_by(PaymentTransaction.farmer_id)
        .subquery()
    )

    farmers = (
        db.query(FarmerRegistration, last_payment_subq.c.last_payment)
        .outerjoin(last_payment_subq, FarmerRegistration.id == last_payment_subq.c.farmer_id)
        .filter(FarmerRegistration.tenant_id == current_user.tenant_id)
        .options(
            joinedload(FarmerRegistration.sub_county),
            joinedload(FarmerRegistration.Sex),
            joinedload(FarmerRegistration.PrimaryOccupation),
            joinedload(FarmerRegistration.SecondaryOccupation),
            joinedload(FarmerRegistration.AnnualIncomeBracket),
            joinedload(FarmerRegistration.FarmerCooperative),
            joinedload(FarmerRegistration.OtherPrimaryOccupationRel),
            joinedload(FarmerRegistration.OtherSecondaryOccupationRel),
        )
        .all()
    )

    result = []
    for farmer, last_payment in farmers:
        full_name = " ".join(filter(None, [
            farmer.FirstName,
            farmer.MiddleName,
            farmer.Surname
        ]))

        crops = [c.strip() for c in (farmer.Crops or "").split(",") if c.strip()]

        result.append({
            "id": farmer.id,
            "name": full_name,
            "username": farmer.username,
            "phone": farmer.PhoneNumber,
            "location": farmer.sub_county.name if farmer.sub_county else "",
            "status": farmer.Status,
            "crops": crops,
            "regDate": farmer.CreatedOn,
            "lastVisit": farmer.LastVisit,
            "lastPayment": last_payment.strftime("%Y-%m-%d %H:%M") if last_payment else None
        })

    return {"farmers": result}

def format_farmer_response(farmer):
    farm = farmer.FarmProfile
    dob = farmer.DOB

    return {
        "id": farmer.id,
        "frn": farmer.farmer_lookup_code, 
        "name": f"{farmer.FirstName} {farmer.Surname}",
        "phone": farmer.PhoneNumber,
        "location": farmer.sub_county.name if farmer.sub_county else "",
        "status": farmer.Status,
        "crops": farmer.Crops.split(",") if farmer.Crops else [],
        "joinedDate": farmer.CreatedOn,
        "lastVisit": farmer.LastVisit,
        "farmSize": farm.TotalFarmSize if farm else None,
        "age": calculate_age(dob),

        "personalInfo": {
            "firstName": farmer.FirstName,
            "middleName": farmer.MiddleName,
            "surname": farmer.Surname,
            "sex": farmer.Sex.code_value if farmer.Sex else None,
            "maritalStatus": farmer.MaritalStatus.code_value if farmer.MaritalStatus else None,
            "educationLevel": farmer.EducationLevel.code_value if farmer.EducationLevel else None,
            "disabilityStatus": farmer.DisabilityStatus.code_value if farmer.DisabilityStatus else None,
            "primaryOccupation": farmer.PrimaryOccupation.code_value if farmer.PrimaryOccupation else None,
            "secondaryOccupation": farmer.SecondaryOccupation.code_value if farmer.SecondaryOccupation else None,
            "annualIncomeBracket": farmer.AnnualIncomeBracket.code_value if farmer.AnnualIncomeBracket else None,
            "farmerCooperative": farmer.FarmerCooperative.code_value if farmer.FarmerCooperative else None,
            "leadFarmer": farmer.LeadFarmer, 
            "insuranceAccess": farmer.InsuranceAccessCurrently.code_value if farmer.InsuranceAccessCurrently else None,
            "otherPrimaryOccupation": farmer.OtherPrimaryOccupationRel.code_value if farmer.OtherPrimaryOccupationRel else None,
            "otherSecondaryOccupation": farmer.OtherSecondaryOccupationRel.code_value if farmer.OtherSecondaryOccupationRel else None,
            "householdSize": farmer.HouseholdSize,
            "membersInCooperative": farmer.MembersFarmerCooperative,
            "creditAccess": (
    "Yes"
    if farmer.CreditAccessId == 1
    else "No"
    if farmer.CreditAccessId == 0
    else None
),
            "dateOfBirth": (
    farmer.DOB.isoformat()
    if farmer.DOB
    else None
),
            "gpsCoordinates": farmer.GPSCoordinates,
            "nationalId": farmer.NationalId,
            "idPhoto": farmer.IDPhoto,
            "farmerPhoto": farmer.FarmerPhoto,
            "county": farmer.county.name if farmer.county else None,
            "subCounty": farmer.sub_county.name if farmer.sub_county else None,

            "landTenure": farm.LandTenure.code_value if farm and farm.LandTenure else None,
            "irrigationType": farm.IrrigationType.code_value if farm and farm.IrrigationType else None,
            "soilType": farm.SoilType.code_value if farm and farm.SoilType else None,
            "waterAccessType": farm.WaterAccess.code_value if farm and farm.WaterAccess else None,
        }
    }


@router.get("/crops", response_class=JSONResponse)
def get_crops(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:

        farmers_crops = db.query(FarmerRegistration.Crops).filter(
            FarmerRegistration.tenant_id == current_user.tenant_id
        ).all()

        crops_set = set()

        for (crops_str,) in farmers_crops:
            if crops_str:
                crops_list = [c.strip() for c in crops_str.split(",") if c.strip()]
                crops_set.update(crops_list)

        unique_crops = sorted(list(crops_set))

        return {"crops": unique_crops}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/counties")
def get_counties(
    db: Session = Depends(get_db)):
    counties = db.query(CountyTbl).all()

    return {
        "counties": [
            {"id": c.id, "name": c.name}
            for c in counties
        ]
    }
@router.get("/subcounties/{county_id}")
def get_subcounties(
    county_id: int,
    db: Session = Depends(get_db)):
    subcounties = db.query(SubCountyTbl).filter(
        SubCountyTbl.county_id == county_id
    ).all()

    return {
        "subcounties": [
            {"id": sc.id, "name": sc.name}
            for sc in subcounties
        ]
    } 
@router.put("/{farmer_id}", response_class=JSONResponse)
def update_farmer(
    farmer_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        farmer = db.query(FarmerRegistration).filter(
            FarmerRegistration.id == farmer_id,
            FarmerRegistration.tenant_id == current_user.tenant_id
        ).first()

        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")

        pi = payload.get("personalInfo", {})

        # =========================
        # SYSTEM CODE LOOKUPS
        # =========================

        sex_id = get_system_code(db, "Sex", pi.get("sex"))
        marital_id = get_system_code(db, "MaritalStatus", pi.get("maritalStatus"))
        edu_id = get_system_code(db, "EducationLevel", pi.get("educationLevel"))
        disability_id = get_system_code(db, "DisabilityStatus", pi.get("disabilityStatus"))
        primary_occ_id = get_system_code(db, "PrimaryOccupation", pi.get("primaryOccupation"))
        secondary_occ_id = get_system_code(db, "SecondaryOccupation", pi.get("secondaryOccupation"))
        other_primary_id = get_system_code(db, "PrimaryOccupation", pi.get("otherPrimaryOccupation"))
        other_secondary_id = get_system_code(db, "SecondaryOccupation", pi.get("otherSecondaryOccupation"))
        income_id = get_system_code(db, "AnnualIncomeBracket", pi.get("annualIncomeBracket"))
        cooperative_id = get_system_code(db, "FarmerCooperative", pi.get("farmerCooperative"))
        insurance_id = get_system_code(db, "InsuranceAccess", pi.get("insuranceAccess"))

        land_tenure_id = get_system_code(db, "LandTenure", pi.get("landTenure"))
        irrigation_id = get_system_code(db, "IrrigationType", pi.get("irrigationType"))
        soil_id = get_system_code(db, "SoilType", pi.get("soilType"))
        water_id = get_system_code(db, "WaterAccess", pi.get("waterAccessType"))

        # =========================
        # FARMER REGISTRATION
        # =========================

        farmer.FirstName = pi.get("firstName")
        farmer.MiddleName = pi.get("middleName")
        farmer.Surname = pi.get("surname")

        farmer.PhoneNumber = payload.get("phone")
        farmer.Location = payload.get("location")
        farmer.Status = payload.get("status") or farmer.Status

        farmer.Crops = ",".join(payload.get("crops", []))

        farmer.NationalId = pi.get("nationalId")

        farmer.DOB = (
            datetime.fromisoformat(pi.get("dateOfBirth"))
            if pi.get("dateOfBirth")
            else None
        )

        farmer.HouseholdSize = pi.get("householdSize")

        farmer.SexId = sex_id
        farmer.MaritalStatusId = marital_id
        farmer.EducationLevelId = edu_id
        farmer.DisabilityStatusId = disability_id

        farmer.PrimaryOccupationId = primary_occ_id
        farmer.SecondaryOccupationId = secondary_occ_id

        farmer.OtherPrimaryOccupation = other_primary_id
        farmer.OtherSecondaryOccupation = other_secondary_id

        farmer.AnnualIncomeBracketId = income_id
        farmer.FarmerCooperativeId = cooperative_id
        farmer.InsuranceAccessCurrentlyId = insurance_id

        farmer.CreditAccessId = (
            1 if pi.get("creditAccess") == "Yes"
            else 0 if pi.get("creditAccess") == "No"
            else None
        )

        farmer.MembersFarmerCooperative = pi.get("membersInCooperative")
        farmer.LeadFarmer = pi.get("leadFarmer")

        county_id = pi.get("county")
        subcounty_id = pi.get("subCounty")

        if isinstance(county_id, str):
           county_id = get_county_id(db, county_id)

        if isinstance(subcounty_id, str):
           subcounty_id = get_subcounty_id(db, subcounty_id)

        farmer.county_id = county_id
        farmer.subcounty_id = subcounty_id

        farmer.GPSCoordinates = pi.get("gpsCoordinates")

        
        farm = farmer.FarmProfile

        if not farm:
            farm = FarmProfile(
                FarmerRegistrationId=farmer.id
            )
            db.add(farm)

        farm.TotalFarmSize = payload.get("farmSize")

        farm.LandTenureId = land_tenure_id
        farm.IrrigationTypeId = irrigation_id
        farm.SoilTypeId = soil_id
        farm.WaterAccessId = water_id

        db.commit()

        db.refresh(farmer)

        return {
            "message": "Farmer updated successfully",
            "farmer": format_farmer_response(farmer)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    
    
from typing import List
class BulkDeleteRequest(BaseModel):
    farmer_ids: List[int]
    

@router.delete("/bulk")
def bulk_delete_farmers(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farmer_ids = payload.farmer_ids

    farmers = db.query(FarmerRegistration).filter(
        FarmerRegistration.id.in_(farmer_ids),
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).all()

    if not farmers:
        raise HTTPException(status_code=404, detail="No farmers found with provided IDs")

    found_ids = {f.id for f in farmers}

    deleted_count = db.query(FarmerRegistration).filter(
        FarmerRegistration.id.in_(found_ids),
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": f"Successfully deleted {deleted_count} farmer(s)",
        "deleted_count": deleted_count,
        "deleted_ids": list(found_ids)
    }
SEX_MAP = {
    "Female": 1,
    "Male   ": 2
}
ANNUAL_INCOME_MAP = {
    "Less than $1,000": 1,
    "$1,000 - $5,000": 2,
    "$5,000 - $10,000": 3,
    "More than $10,000": 4
}

@router.get("/approved")
def get_approved_farmers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farmers = db.query(FarmerRegistration).filter(
        FarmerRegistration.tenant_id == current_user.tenant_id,
        FarmerRegistration.is_approved == True
    ).all()

    return {"farmers": [format_farmer_response(f) for f in farmers]}

@router.get("/pending")
def get_pending_farmers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farmers = db.query(FarmerRegistration).filter(
        FarmerRegistration.tenant_id == current_user.tenant_id,
        FarmerRegistration.is_approved == False
    ).all()

    return {"farmers": [format_farmer_response(f) for f in farmers]}

@router.put("/approve/{farmer_id}")
def approve_farmer(
    farmer_id: int,
    payload: FarmerApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    if payload.action.lower() not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    farmer.is_approved = True if payload.action.lower() == "approve" else False
    farmer.ModifiedOn = datetime.utcnow()
    db.commit()
    db.refresh(farmer)

    return {"farmer": format_farmer_response(farmer)}
# backend/routes/farmers.py
from app.models.tenant import Tenant

@router.get("/all")
def get_all_farmers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns all farmers across all tenants for SuperAdmin view,
    including real tenant names for table column and all tenants for dropdown.
    """
    last_payment_subq = (
        db.query(
            PaymentTransaction.farmer_id,
            func.max(PaymentTransaction.created_at).label("last_payment")
        )
        .filter(PaymentTransaction.status == "success")
        .group_by(PaymentTransaction.farmer_id)
        .subquery()
    )

    # Query farmers joined with tenant
    farmers = (
        db.query(FarmerRegistration, Tenant.company_name.label("tenant_name"), last_payment_subq.c.last_payment)
        .outerjoin(last_payment_subq, FarmerRegistration.id == last_payment_subq.c.farmer_id)
        .join(Tenant, FarmerRegistration.tenant_id == Tenant.id)
        .options(
            joinedload(FarmerRegistration.sub_county),
            joinedload(FarmerRegistration.Sex),
            joinedload(FarmerRegistration.FarmProfile),
        )
        .all()
    )

    # Format farmer data
    farmer_list = []
    for farmer, tenant_name, last_payment in farmers:
        full_name = " ".join(filter(None, [farmer.FirstName, farmer.MiddleName, farmer.Surname]))
        crops = [c.strip() for c in (farmer.Crops or "").split(",") if c.strip()]

        farmer_list.append({
    "id": farmer.id,
    "name": full_name,
    "username": farmer.username,
    "phone": farmer.PhoneNumber,
    "location": farmer.sub_county.name if farmer.sub_county else "",
    "status": farmer.Status,

    "tenant_id": farmer.tenant_id,
    "tenant_name": tenant_name,

    "crops": crops,

    # these are what your frontend wants
    "farm_size": farmer.FarmProfile.TotalFarmSize if farmer.FarmProfile else None,
    "carbon_score": getattr(farmer, "CarbonScore", None),  # if such a column exists
    "date_registered": farmer.CreatedOn,
    "last_active": farmer.LastVisit,

    "regDate": farmer.CreatedOn,
    "lastVisit": farmer.LastVisit,
    "lastPayment": last_payment.strftime("%Y-%m-%d %H:%M") if last_payment else None,
})

    # Query all tenants for dropdown
    tenants = db.query(Tenant.id, Tenant.company_name).all()
    tenant_list = [{"id": t.id, "name": t.company_name} for t in tenants]

    return {
        "farmers": farmer_list,
        "tenants": tenant_list  # <-- for dropdown
    }

@router.get("/{farmer_id}")
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    farmer = db.query(FarmerRegistration).options(
        joinedload(FarmerRegistration.FarmProfile),
        joinedload(FarmerRegistration.Sex),
        joinedload(FarmerRegistration.MaritalStatus),
        joinedload(FarmerRegistration.EducationLevel),
        joinedload(FarmerRegistration.DisabilityStatus),
        joinedload(FarmerRegistration.PrimaryOccupation),
        joinedload(FarmerRegistration.SecondaryOccupation),
        joinedload(FarmerRegistration.AnnualIncomeBracket),
        joinedload(FarmerRegistration.FarmerCooperative),
        joinedload(FarmerRegistration.InsuranceAccessCurrently),
        joinedload(FarmerRegistration.county),
        joinedload(FarmerRegistration.sub_county),
    ).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    return format_farmer_response(farmer)



@router.delete("/{farmer_id}")
def delete_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    db.delete(farmer)
    db.commit()

    return {"message": "Farmer deleted"}


@router.get("/report/summary")
def farmer_registration_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    county: Optional[str] = Query(None)
):
    try:
        query = db.query(FarmerRegistration).options(
            joinedload(FarmerRegistration.county),
            joinedload(FarmerRegistration.Sex)
        ).filter(
            FarmerRegistration.tenant_id == current_user.tenant_id
        )

        if county and county != "All Counties":
            query = query.join(CountyTbl).filter(CountyTbl.name == county)

        farmers = query.all()

        summary_map = {}

        for f in farmers:
            county_name = f.county.name if f.county else "Unknown"

            if county_name not in summary_map:
                summary_map[county_name] = {
                    "county": county_name,
                    "total": 0,
                    "female": 0,
                    "male": 0,
                    "youth": 0
                }

            summary_map[county_name]["total"] += 1

            sex_value = f.Sex.code_value if f.Sex else None
            if sex_value == "Female":
                summary_map[county_name]["female"] += 1
            elif sex_value == "Male":
                summary_map[county_name]["male"] += 1

            age = calculate_age(f.DOB)
            if age and age < 35:
                summary_map[county_name]["youth"] += 1

        return {
            "data": list(summary_map.values())
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/report/detailed")
def farmer_registration_detailed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),

    county: Optional[str] = Query(None),
    sex: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    national_id: Optional[str] = Query(None),
    reg_no: Optional[str] = Query(None),

    page: int = 1,
    page_size: int = 10
):
    try:
        query = db.query(FarmerRegistration).options(
            joinedload(FarmerRegistration.county),
            joinedload(FarmerRegistration.Sex),
            joinedload(FarmerRegistration.FarmProfile)
        ).filter(
            FarmerRegistration.tenant_id == current_user.tenant_id
        )

        if county and county != "All Counties":
            query = query.join(CountyTbl).filter(CountyTbl.name == county)

        if sex and sex != "All":
            query = query.join(SystemCodeDetail, FarmerRegistration.SexId == SystemCodeDetail.id)\
                         .filter(SystemCodeDetail.code_value == sex)

        if crop and crop != "All Crops":
            query = query.filter(FarmerRegistration.Crops.ilike(f"%{crop}%"))

        if name:
            query = query.filter(
                (FarmerRegistration.FirstName + " " + FarmerRegistration.Surname)
                .ilike(f"%{name}%")
            )

        if mobile:
            query = query.filter(FarmerRegistration.PhoneNumber.ilike(f"%{mobile}%"))

        if national_id:
            query = query.filter(FarmerRegistration.NationalId.ilike(f"%{national_id}%"))

        if reg_no:
            query = query.filter(FarmerRegistration.id.ilike(f"%{reg_no}%"))

        total_records = query.count()

        farmers = query.offset((page - 1) * page_size).limit(page_size).all()

        detailed = []
        for f in farmers:
            full_name = " ".join(filter(None, [
                f.FirstName, f.MiddleName, f.Surname
            ]))

            detailed.append({
                "id": f.id,
                "regNo": f"FRN-{f.CreatedOn.year}{str(f.id).zfill(3)}" if f.CreatedOn else f"FRN-{str(f.id).zfill(3)}",
                "name": full_name,
                "nationalId": f.NationalId,
                "mobile": f.PhoneNumber,
                "county": f.county.name if f.county else "",
                "crops": f.Crops.split(",") if f.Crops else [],
                "farmSize": float(f.FarmProfile.TotalFarmSize) if f.FarmProfile else None,
                "sex": f.Sex.code_value if f.Sex else None,
                "dateRegistered": f.CreatedOn.strftime("%d/%m/%Y") if f.CreatedOn else None,
                "status": f.Status
            })

        return {
            "data": detailed,
            "pagination": {
                "total": total_records,
                "page": page,
                "page_size": page_size
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/lookup/{code}")
def get_farmer_by_lookup(code: str, db: Session = Depends(get_db)):
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.farmer_lookup_code == code
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    return {
        "id": farmer.id,
        "farmerId": farmer.farmer_lookup_code,
        "name": f"{farmer.FirstName} {farmer.Surname}",
        "phone": farmer.PhoneNumber,
        "location": farmer.Location
    }


@router.get("/search")
def search_farmers(q: str, db: Session = Depends(get_db)):
    results = db.query(FarmerRegistration).filter(
        (FarmerRegistration.farmer_lookup_code.ilike(f"%{q}%")) |
        (FarmerRegistration.FirstName.ilike(f"%{q}%")) |
        (FarmerRegistration.Surname.ilike(f"%{q}%")) |
        (FarmerRegistration.PhoneNumber.ilike(f"%{q}%"))
    ).limit(10).all()

    return [
        {
            "id": f.id,
            "farmerId": f.farmer_lookup_code,
            "name": f"{f.FirstName} {f.Surname}",
            "phone": f.PhoneNumber
        }
        for f in results
    ]