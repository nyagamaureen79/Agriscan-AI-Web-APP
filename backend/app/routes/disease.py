# app/routers/diseases.py
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query, Form
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, case, distinct, extract
from app.database import get_db
from app.models.disease import Disease, DiseaseType
from app.models.scan_diagnosis import ScanDiagnosis          # ← new model
from app.schemas.disease import (
    DiseaseDetectionResponse, DiseaseDetailResponse,
    AffectedFarmResponse, DiseaseTypeResponse
)
from app.models.system_code import SystemCodeDetail
from app.models.farmer import FarmerRegistration
from app.models.county import CountyTbl
from app.models.sub_county import SubCountyTbl               
from app.auth import get_current_user
from app.models.users import User
from app.models.tenant import Tenant
from typing import Dict, List, Optional
from datetime import datetime
from calendar import month_abbr
import os
import shutil


router = APIRouter(prefix="/diseases", tags=["Diseases"])



BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",          # app/
        "static",
        "uploads",
        "diseases"
    )
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

print(f"Saving disease images to: {UPLOAD_FOLDER}")

def get_severity_from_confidence(confidence):
    """Expects confidence already scaled to 0-100."""
    if confidence >= 85:
        return "High"
    if confidence >= 70:
        return "Medium"
    return "Low"

def scale_confidence(raw) -> float:
    """Convert DB decimal (0.65) → percentage (65.0)."""
    return round(float(raw or 0) * 100, 2)

def farmer_location(farmer: FarmerRegistration, db: Session) -> str:
    """Return a human-readable location string from the farmer's sub-county."""
    if farmer is None:
        return "Location not specified"
    if farmer.subcounty_id:
        sub = db.query(SubCountyTbl).filter(
            SubCountyTbl.id == farmer.subcounty_id
        ).first()
        if sub:
            # Try to also get the county name for a richer label
            county = db.query(CountyTbl).filter(
                CountyTbl.id == farmer.county_id
            ).first() if farmer.county_id else None
            parts = [sub.name, county.name if county else None]
            return ", ".join(p for p in parts if p)
    if farmer.Location:
        return farmer.Location
    return "Location not specified"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/detections", response_model=list[DiseaseDetectionResponse])
def get_disease_detections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Latest scan per disease for the current tenant."""
    subquery = (
        db.query(
            ScanDiagnosis.disease_id,
            func.max(ScanDiagnosis.id).label("latest_id")
        )
        .filter(
            ScanDiagnosis.disease_id.isnot(None),
            ScanDiagnosis.tenant_id == current_user.tenant_id
        )
        .group_by(ScanDiagnosis.disease_id)
        .subquery()
    )

    scans = (
        db.query(ScanDiagnosis)
        .join(subquery, ScanDiagnosis.id == subquery.c.latest_id)
        .options(
            joinedload(ScanDiagnosis.disease),
            joinedload(ScanDiagnosis.farmer).joinedload(FarmerRegistration.sub_county)
        )
        .all()
    )

    results = []
    for scan in scans:
        results.append({
            "id": scan.id,
            "disease_id": scan.disease_id,
            "name": scan.disease.name if scan.disease else scan.diagnosis_description,
            "severity": get_severity_from_confidence(scale_confidence(scan.confidence_score)),
            "confidence": scale_confidence(scan.confidence_score),
            "detectedDate": scan.created_on.strftime("%Y-%m-%d %H:%M:%S") if scan.created_on else None,
            "farmer": None,
            "cropType": scan.crop_type_id,
            "location": farmer_location(scan.farmer, db),
            "image": scan.disease.image if scan.disease else None,
        })
    return results


@router.get("/detections/all")
def get_all_disease_detections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Latest scan per disease per tenant (admin view)."""
    subquery = (
        db.query(
            ScanDiagnosis.disease_id,
            ScanDiagnosis.tenant_id,
            func.max(ScanDiagnosis.id).label("latest_id")
        )
        .filter(ScanDiagnosis.disease_id.isnot(None))
        .group_by(ScanDiagnosis.disease_id, ScanDiagnosis.tenant_id)
        .subquery()
    )

    rows = (
        db.query(ScanDiagnosis, Tenant.company_name.label("tenant_name"))
        .join(subquery, ScanDiagnosis.id == subquery.c.latest_id)
        .join(Tenant, Tenant.id == ScanDiagnosis.tenant_id)
        .options(
            joinedload(ScanDiagnosis.disease),
            joinedload(ScanDiagnosis.farmer)
        )
        .all()
    )

    results = []
    for scan, tenant_name in rows:
        results.append({
            "id": scan.id,
            "disease_id": scan.disease_id,
            "name": scan.disease.name if scan.disease else scan.diagnosis_description,
            "severity": get_severity_from_confidence(scale_confidence(scan.confidence_score)),
            "confidence": scale_confidence(scan.confidence_score),
            "detectedDate": scan.created_on.strftime("%Y-%m-%d %H:%M:%S") if scan.created_on else None,
            "location": farmer_location(scan.farmer, db),
            "tenant_id": scan.tenant_id,
            "tenant_name": tenant_name,
            "image": scan.disease.image if scan.disease else None,
        })
    return results


@router.get("/most-scanned-crops")
def most_scanned_crops(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            SystemCodeDetail.code_value.label("crop"),
            func.count(ScanDiagnosis.id).label("count")
        )
        .join(SystemCodeDetail, SystemCodeDetail.id == ScanDiagnosis.crop_type_id)
        .filter(
            SystemCodeDetail.code_type == "MainCrop",
            ScanDiagnosis.tenant_id == current_user.tenant_id
        )
        .group_by(SystemCodeDetail.code_value)
        .order_by(func.count(ScanDiagnosis.id).desc())
        .all()
    )
    return [{"label": r.crop, "value": r.count} for r in results]


@router.get("/top-diseases")
def get_top_diseases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = (
        db.query(
            Disease.name.label("disease_name"),
            func.count(ScanDiagnosis.id).label("total_cases")
        )
        .join(ScanDiagnosis, Disease.id == ScanDiagnosis.disease_id)
        .filter(ScanDiagnosis.tenant_id == current_user.tenant_id)
        .group_by(Disease.name)
        .order_by(func.count(ScanDiagnosis.id).desc())
        .all()
    )
    return [{"label": row.disease_name, "amount": row.total_cases} for row in results]


@router.get("/disease-trend")
def get_disease_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.utcnow()
    tenant_id = current_user.tenant_id
    end_year, end_month = today.year, today.month

    months = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    window_start_year, window_start_month = months[0]

    rows = (
        db.query(
            func.extract("year",  ScanDiagnosis.created_on).label("year"),
            func.extract("month", ScanDiagnosis.created_on).label("month"),
            func.count(ScanDiagnosis.id)
        )
        .filter(
            ScanDiagnosis.tenant_id == tenant_id,
            (
                (func.extract("year",  ScanDiagnosis.created_on) > window_start_year) |
                (
                    (func.extract("year",  ScanDiagnosis.created_on) == window_start_year) &
                    (func.extract("month", ScanDiagnosis.created_on) >= window_start_month)
                )
            )
        )
        .group_by("year", "month")
        .all()
    )

    data = {(int(year), int(month)): total for year, month, total in rows}

    labels, values = [], []
    for year, month in months:
        labels.append(f"{month_abbr[month]} {year}")
        values.append(data.get((year, month), 0))

    return {"labels": labels, "values": values}


@router.get("/{disease_id}/affected-farms", response_model=List[Dict])
def get_affected_farms(
    disease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scans = (
        db.query(ScanDiagnosis)
        .options(joinedload(ScanDiagnosis.farmer))
        .filter(
            ScanDiagnosis.disease_id == disease_id,
            ScanDiagnosis.tenant_id == current_user.tenant_id
        )
        .order_by(ScanDiagnosis.created_on.desc())
        .all()
    )

    affected_farms = []
    for scan in scans:
        farmer_name = (
            f"{scan.farmer.FirstName} {scan.farmer.Surname}"
            if scan.farmer else "Unknown Farmer"
        )
        affected_farms.append({
            "farmerName": farmer_name,
            "detectedDate": scan.created_on.strftime("%Y-%m-%d %H:%M:%S") if scan.created_on else "Detection not specified",
            "location": farmer_location(scan.farmer, db),
        })
    return affected_farms


@router.get("/types", response_model=List[DiseaseTypeResponse])
def get_disease_types(db: Session = Depends(get_db)):
    return db.query(DiseaseType).all()


# ── Disease Management CRUD ───────────────────────────────────────────────────
# Add these imports at the top of diseases.py if not already present:
# from app.models.disease import DiseaseSymptom, DiseaseOrganicTreatment, DiseaseChemicalTreatment, DiseasePrevention

from app.models.disease import (
    DiseaseSymptom, DiseaseOrganicTreatment,
    DiseaseChemicalTreatment, DiseasePrevention
)


def _split_to_rows(text: str | None) -> list[str]:
    """Split a textarea blob (newlines, bullets, semicolons) into clean list items."""
    if not text:
        return []
    import re
    text = text.strip()
    # Try newlines first
    items = [re.sub(r'^[-•*\d.]+\s*', '', s).strip() for s in text.split('\n') if s.strip()]
    if len(items) > 1:
        return [i for i in items if i]
    # Try semicolons
    items = [s.strip() for s in text.split(';') if s.strip()]
    if len(items) > 1:
        return items
    return [text] if text else []


def _disease_to_list_dict(disease: Disease, request: Request) -> dict:
    """Serialize a Disease for the list view (all columns the table / edit form needs)."""
    image_url = None
    if disease.image:
        image_url = f"{request.base_url}{disease.image.lstrip('/')}"

    # Flatten child rows back to pipe-separated strings so the frontend
    # can display them and pre-fill textareas.
    symptoms   = "\n".join(s.symptom   for s in disease.symptoms)
    organic    = "\n".join(o.treatment for o in disease.organic_treatments)
    chemical   = "\n".join(c.treatment for c in disease.chemical_treatments)
    prevention = "\n".join(p.strategy  for p in disease.preventions)

    type_name = disease.disease_type.name if disease.disease_type else None

    return {
        "id":                     disease.id,
        "disease_name":           disease.name,
        "description":            disease.description,
        "identification_tips":    disease.identification_tips,
        "disease_type_id":        disease.disease_type_id,
        "disease_type":           type_name,
        "visual_symptoms":        symptoms,
        "organic_treatment":      organic,
        "chemical_treatment":     chemical,
        "prevention_strategies":  prevention,
        "commonly_affected_crops": None,   # not stored in Disease table — see note below
        "photo":                  image_url,
        "image_url":              image_url,
        "created_on":             disease.created_on.isoformat() if disease.created_on else None,
    }



@router.get("/", response_model=list[dict])
def get_all_diseases(
    request: Request,
    db: Session = Depends(get_db),
):
    diseases = (
    db.query(Disease)
    .options(
        joinedload(Disease.disease_type),
        selectinload(Disease.symptoms),
        selectinload(Disease.organic_treatments),
        selectinload(Disease.chemical_treatments),
        selectinload(Disease.preventions),
    )
    .order_by(Disease.id.desc())
    .all()
)
    return [_disease_to_list_dict(d, request) for d in diseases]


@router.get("/{disease_id}", response_model=dict)
def get_disease_detail(
    disease_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    disease = (
        db.query(Disease)
        .options(
            joinedload(Disease.disease_type),
            selectinload(Disease.symptoms),
            selectinload(Disease.organic_treatments),
            selectinload(Disease.chemical_treatments),
            selectinload(Disease.preventions),
            selectinload(Disease.affected_crops),
        )
        .filter(Disease.id == disease_id)
        .first()
    )
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")

    latest_scan = (
        db.query(ScanDiagnosis)
        .options(joinedload(ScanDiagnosis.farmer))
        .filter(ScanDiagnosis.disease_id == disease_id)
        .order_by(ScanDiagnosis.created_on.desc())
        .first()
    )

    severity = confidence = detected_date = location_str = None
    if latest_scan:
        confidence = scale_confidence(latest_scan.confidence_score)
        severity = get_severity_from_confidence(confidence)
        detected_date = (
            latest_scan.created_on.strftime("%Y-%m-%d %H:%M:%S")
            if latest_scan.created_on else None
        )
        location_str = farmer_location(latest_scan.farmer, db) if latest_scan.farmer_id else None

    confirmed_cases = (
        db.query(ScanDiagnosis)
        .filter(ScanDiagnosis.disease_id == disease_id)
        .count()
    )

    sub_counties_count = (
        db.query(func.count(distinct(FarmerRegistration.subcounty_id)))
        .join(ScanDiagnosis, ScanDiagnosis.farmer_id == FarmerRegistration.id)
        .filter(ScanDiagnosis.disease_id == disease_id)
        .scalar() or 0
    )

    crop_ids = [c.crop_code_id for c in disease.affected_crops]
    commonly_affects = []
    if crop_ids:
        crops = (
            db.query(SystemCodeDetail.code_value)
            .filter(SystemCodeDetail.id.in_(crop_ids))
            .all()
        )
        commonly_affects = [c[0] for c in crops]

    image_url = None
    if disease.image:
        image_url = f"{request.base_url}{disease.image.lstrip('/')}"

    symptoms        = [s.symptom for s in disease.symptoms]
    organic_list    = [o.treatment for o in disease.organic_treatments]
    chemical_list   = [c.treatment for c in disease.chemical_treatments]
    prevention_list = [p.strategy for p in disease.preventions]

    return {
        "id": disease.id,
        "disease_name": disease.name,
        "name": disease.name,
        "description": disease.description,
        "identification_tips": disease.identification_tips,
        "disease_type_id": disease.disease_type_id,
        "disease_type": disease.disease_type.name if disease.disease_type else None,
        "type_name": disease.disease_type.name if disease.disease_type else None,
        "visual_symptoms": "\n".join(symptoms),
        "symptoms": symptoms,
        "organic_treatment": "\n".join(organic_list),
        "organic_treatments": organic_list,
        "chemical_treatment": "\n".join(chemical_list),
        "chemical_treatments": chemical_list,
        "prevention_strategies": "\n".join(prevention_list),
        "preventions": prevention_list,
        "commonly_affected_crops": None,
        "commonlyAffects": commonly_affects,
        "photo": image_url,
        "image_url": image_url,
        "image": image_url,
        # ── detection / analytics fields (read-only) ──────────────────────
        "severity": severity,
        "confidence": confidence,
        "detectedDate": detected_date,
        "location": location_str,
        "activeCases": confirmed_cases,
        "subCountiesAffected": sub_counties_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3.  POST /diseases  — create a new disease with all child rows + image
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_disease(
    request: Request,
    disease_name:          str        = Form(...),
    description:           str        = Form(""),
    commonly_affected_crops: str      = Form(""),
    disease_type_id:       int        = Form(...),
    visual_symptoms:       str        = Form(""),
    identification_tips:   str        = Form(""),
    organic_treatment:     str        = Form(""),
    chemical_treatment:    str        = Form(""),
    prevention_strategies: str        = Form(""),
    photo:                 UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate disease type exists
    dtype = db.query(DiseaseType).filter(DiseaseType.id == disease_type_id).first()
    if not dtype:
        raise HTTPException(status_code=400, detail="Invalid disease_type_id")

    disease = Disease(
        name              = disease_name.strip(),
        description       = description.strip() or None,
        identification_tips = identification_tips.strip() or None,
        disease_type_id   = disease_type_id,
        created_on        = datetime.utcnow(),
    )
    db.add(disease)
    db.flush()  # get disease.id before saving children

    # Save uploaded image
    if photo and photo.filename:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        ext       = photo.filename.rsplit(".", 1)[-1].lower()
        filename  = f"disease_{disease.id}.{ext}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(photo.file, buf)
        disease.image = f"/static/uploads/diseases/{filename}"

    # Child rows: each non-empty line → one row
    for item in _split_to_rows(visual_symptoms):
        db.add(DiseaseSymptom(disease_id=disease.id, symptom=item))

    for item in _split_to_rows(organic_treatment):
        db.add(DiseaseOrganicTreatment(disease_id=disease.id, treatment=item))

    for item in _split_to_rows(chemical_treatment):
        db.add(DiseaseChemicalTreatment(disease_id=disease.id, treatment=item))

    for item in _split_to_rows(prevention_strategies):
        db.add(DiseasePrevention(disease_id=disease.id, strategy=item))

    db.commit()
    db.refresh(disease)
    return _disease_to_list_dict(disease, request)


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PUT /diseases/{disease_id}  — update disease + replace all child rows
# ─────────────────────────────────────────────────────────────────────────────
@router.put("/{disease_id}")
async def update_disease(
    disease_id:            int,
    request:               Request,
    disease_name:          str        = Form(...),
    description:           str        = Form(""),
    commonly_affected_crops: str      = Form(""),
    disease_type_id:       int        = Form(...),
    visual_symptoms:       str        = Form(""),
    identification_tips:   str        = Form(""),
    organic_treatment:     str        = Form(""),
    chemical_treatment:    str        = Form(""),
    prevention_strategies: str        = Form(""),
    photo:                 UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")

    dtype = db.query(DiseaseType).filter(DiseaseType.id == disease_type_id).first()
    if not dtype:
        raise HTTPException(status_code=400, detail="Invalid disease_type_id")

    # Update scalar fields
    disease.name              = disease_name.strip()
    disease.description       = description.strip() or None
    disease.identification_tips = identification_tips.strip() or None
    disease.disease_type_id   = disease_type_id

    # Replace image only when a new file is sent
    if photo and photo.filename:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        ext       = photo.filename.rsplit(".", 1)[-1].lower()
        filename  = f"disease_{disease.id}.{ext}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(photo.file, buf)
        disease.image = f"/static/uploads/diseases/{filename}"

    # Replace all child rows (delete-then-insert is safest for textarea blobs)
    db.query(DiseaseSymptom).filter(DiseaseSymptom.disease_id == disease_id).delete()
    db.query(DiseaseOrganicTreatment).filter(DiseaseOrganicTreatment.disease_id == disease_id).delete()
    db.query(DiseaseChemicalTreatment).filter(DiseaseChemicalTreatment.disease_id == disease_id).delete()
    db.query(DiseasePrevention).filter(DiseasePrevention.disease_id == disease_id).delete()

    for item in _split_to_rows(visual_symptoms):
        db.add(DiseaseSymptom(disease_id=disease.id, symptom=item))

    for item in _split_to_rows(organic_treatment):
        db.add(DiseaseOrganicTreatment(disease_id=disease.id, treatment=item))

    for item in _split_to_rows(chemical_treatment):
        db.add(DiseaseChemicalTreatment(disease_id=disease.id, treatment=item))

    for item in _split_to_rows(prevention_strategies):
        db.add(DiseasePrevention(disease_id=disease.id, strategy=item))

    db.commit()
    db.refresh(disease)
    return _disease_to_list_dict(disease, request)


# ── Image upload (on Disease, unchanged) ─────────────────────────────────────

@router.post("/{disease_id}/upload-image")
def upload_disease_image(
    disease_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_extension = file.filename.split(".")[-1]
    filename  = f"disease_{disease_id}.{file_extension}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    disease.image = f"/static/uploads/diseases/{filename}"
    db.commit()
    return {"message": "Image uploaded successfully", "image_url": disease.image}


# ── Report endpoints ──────────────────────────────────────────────────────────
@router.get("/report/summary")
def image_scan_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    county: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
):
    tenant_id = current_user.tenant_id

    # Total registered farmers per county
    total_farmers_subq = (
        db.query(
            FarmerRegistration.county_id.label("county_id"),
            func.count(distinct(FarmerRegistration.id)).label("total_farmers")
        )
        .filter(
            FarmerRegistration.tenant_id == tenant_id
        )
        .group_by(FarmerRegistration.county_id)
        .subquery()
    )

    query = (
        db.query(
            CountyTbl.name.label("county"),

            SystemCodeDetail.code_value.label("crop_type"),

            func.count(ScanDiagnosis.id).label("total_disease_cases"),

            (
                func.count(distinct(ScanDiagnosis.farmer_id)) * 100.0 /
                func.nullif(total_farmers_subq.c.total_farmers, 0)
            ).label("percentage_farms_affected"),

            func.sum(
                case(
                    (ScanDiagnosis.confidence_score < 0.70, 1),
                    else_=0
                )
            ).label("severity_low"),

            func.sum(
                case(
                    (
                        (ScanDiagnosis.confidence_score >= 0.70) &
                        (ScanDiagnosis.confidence_score < 0.85),
                        1
                    ),
                    else_=0
                )
            ).label("severity_medium"),

            func.sum(
                case(
                    (ScanDiagnosis.confidence_score >= 0.85, 1),
                    else_=0
                )
            ).label("severity_high"),

            func.sum(
                case(
                    (ScanDiagnosis.confidence_score >= 0.85, 1),
                    else_=0
                )
            ).label("high_risk_alerts_escalated"),
        )
        .join(
            FarmerRegistration,
            FarmerRegistration.id == ScanDiagnosis.farmer_id
        )
        .join(
            CountyTbl,
            CountyTbl.id == FarmerRegistration.county_id
        )
        .join(
            total_farmers_subq,
            total_farmers_subq.c.county_id == FarmerRegistration.county_id
        )
        .outerjoin(
            SystemCodeDetail,
            (SystemCodeDetail.id == ScanDiagnosis.crop_type_id) &
            (SystemCodeDetail.code_type == "MainCrop")
        )
        .filter(
            ScanDiagnosis.tenant_id == tenant_id
        )
    )

    if county and county != "All Counties":
        query = query.filter(
            CountyTbl.name == county
        )

    if crop and crop != "All Crops":
        query = query.filter(
            SystemCodeDetail.code_value == crop
        )

    query = query.group_by(
        CountyTbl.name,
        SystemCodeDetail.code_value,
        total_farmers_subq.c.total_farmers
    )

    results = query.all()

    return {
        "data": [
            {
                "county": row.county,
                "crop_type": row.crop_type or "Unknown",
                "total_disease_cases": row.total_disease_cases or 0,
                "percentage_farms_affected": round(float(row.percentage_farms_affected or 0), 1),
                "severity_low": row.severity_low or 0,
                "severity_medium": row.severity_medium or 0,
                "severity_high": row.severity_high or 0,
                "high_risk_alerts_escalated": row.high_risk_alerts_escalated or 0,
            }
            for row in results
        ]
    }

@router.get("/report/detailed")
def image_scan_detailed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),

    county: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    disease: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),

    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1),

    sortCol: str = Query("dateOfScan"),
    sortDir: str = Query("desc"),
):
    tenant_id = current_user.tenant_id

    SORT_COLUMNS = {
        "dateOfScan": ScanDiagnosis.created_on,
        "farmerName": FarmerRegistration.FirstName,
        "cropType": SystemCodeDetail.code_value,
        "disease": Disease.name,
        "confidence": ScanDiagnosis.confidence_score,
    }

    query = (
        db.query(
            ScanDiagnosis,
            SystemCodeDetail.code_value.label("crop_name"),
            CountyTbl.name.label("county_name"),
        )
        .join(
            FarmerRegistration,
            FarmerRegistration.id == ScanDiagnosis.farmer_id
        )
        .outerjoin(
            CountyTbl,
            CountyTbl.id == FarmerRegistration.county_id
        )
        .outerjoin(
            Disease,
            Disease.id == ScanDiagnosis.disease_id
        )
        .outerjoin(
            SystemCodeDetail,
            (SystemCodeDetail.id == ScanDiagnosis.crop_type_id) &
            (SystemCodeDetail.code_type == "MainCrop")
        )
        .options(
            joinedload(ScanDiagnosis.farmer),
            joinedload(ScanDiagnosis.disease).joinedload(Disease.organic_treatments),
            joinedload(ScanDiagnosis.disease).joinedload(Disease.chemical_treatments),
        )
        .filter(
            ScanDiagnosis.tenant_id == tenant_id
        )
    )

    # ---------------- Filters ----------------

    if county and county != "All Counties":
        query = query.filter(
            CountyTbl.name == county
        )

    if crop and crop != "All Crops":
        query = query.filter(
            SystemCodeDetail.code_value == crop
        )

    if disease and disease != "All Diseases":
        query = query.filter(
            Disease.name == disease
        )

    if severity == "High":
        query = query.filter(
            ScanDiagnosis.confidence_score >= 0.85
        )

    elif severity == "Medium":
        query = query.filter(
            ScanDiagnosis.confidence_score >= 0.70,
            ScanDiagnosis.confidence_score < 0.85
        )

    elif severity == "Low":
        query = query.filter(
            ScanDiagnosis.confidence_score < 0.70
        )

    # ---------------- Sorting ----------------

    sort_column = SORT_COLUMNS.get(
        sortCol,
        ScanDiagnosis.created_on
    )

    query = query.order_by(
        sort_column.asc() if sortDir.lower() == "asc"
        else sort_column.desc()
    )

    total = query.count()

    records = (
        query.offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data = []

    for r, crop_name, county_name in records:

        farmer = r.farmer

        if farmer:
            if farmer.CreatedOn:
                reg_no = f"FRN-{farmer.CreatedOn.year}{str(farmer.id).zfill(3)}"
            else:
                reg_no = f"FRN-{str(farmer.id).zfill(3)}"
        else:
            reg_no = None

        disease_name = (
            r.disease.name
            if r.disease
            else r.diagnosis_description
        )

        confidence = scale_confidence(r.confidence_score)
        severity_level = get_severity_from_confidence(confidence)

        # Recommended action
        recommended_action = None

        if r.disease:
            if r.disease.chemical_treatments:
                recommended_action = (
                    r.disease.chemical_treatments[0].treatment
                )
            elif r.disease.organic_treatments:
                recommended_action = (
                    r.disease.organic_treatments[0].treatment
                )

        # Escalation status
        if confidence >= 85:
            escalation_status = "Escalated"
        elif confidence >= 70:
            escalation_status = "Monitor"
        else:
            escalation_status = "Normal"

        data.append({
            "id": r.id,
            "regNo": reg_no,
            "farmerName": (
                f"{getattr(farmer,'FirstName','')} {getattr(farmer,'Surname','')}".strip()
                if farmer else None
            ),
            "county": county_name,
            "cropType": crop_name or "Unknown",
            "dateOfScan": (
                r.created_on.strftime("%Y-%m-%d %H:%M:%S")
                if r.created_on else None
            ),
            "diseaseDetected": disease_name,
            "severityLevel": severity_level,
            "aiConfidence": confidence,
            "recommendedAction": recommended_action,
            "escalationStatus": escalation_status,
            "location": farmer_location(farmer, db),
            "modelVersion": r.model_version,
            "mismatchFlag": bool(r.mismatch_flag),
        })

    return {
        "data": data,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }

# ── Farmer-scoped detections ──────────────────────────────────────────────────

@router.get("/farmer/{farmer_id}/detections")
def get_farmer_disease_detections(
    farmer_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """All crop scans for one farmer, newest first."""
    farmer = db.query(FarmerRegistration).filter(
        FarmerRegistration.id == farmer_id,
        FarmerRegistration.tenant_id == current_user.tenant_id
    ).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    scans = (
        db.query(ScanDiagnosis)
        .options(joinedload(ScanDiagnosis.disease))  # eagerly loads Disease row
        .filter(
            ScanDiagnosis.farmer_id == farmer_id,
            ScanDiagnosis.tenant_id == current_user.tenant_id,
        )
        .order_by(ScanDiagnosis.created_on.desc())
        .limit(limit)
        .all()
    )

    results = []
    for scan in scans:
        confidence   = scale_confidence(scan.confidence_score)
        severity     = get_severity_from_confidence(confidence)
        health_label = {"High": "Alert", "Medium": "Warning"}.get(severity, "Healthy")

        # disease name comes from the joined Disease table;
        # fall back to diagnosis_description only if disease_id is null
        disease_name = (
            scan.disease.name
            if scan.disease_id and scan.disease
            else scan.diagnosis_description
        )

        results.append({
            "id": scan.id,
            "disease_name": disease_name,
            "field_name": scan.diagnosis_description,
            "severity": severity,
            "confidence": confidence,
            "health_status": health_label,
            "date": scan.created_on.strftime("%Y-%m-%d %H:%M:%S") if scan.created_on else None,
            "created_at": scan.created_on.strftime("%Y-%m-%d %H:%M:%S") if scan.created_on else None,
            "location": farmer_location(farmer, db),
            "image": scan.disease.image if scan.disease else None,
            "modelVersion": scan.model_version,
            "mismatchFlag": bool(scan.mismatch_flag),
        })
    return results