# app/routers/analytics.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Integer, func, extract
from datetime import datetime
from app.database import SessionLocal
from app.models.payments import PaymentTransaction
from app.models.farmer import FarmerRegistration
from app.models.farm_profile import FarmProfile
from app.models.emission import EmissionRecord
from app.models.sequestration import SequestrationRecord
from app.models.scan_diagnosis import ScanDiagnosis
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.crop_production_data import CropProductionData
from app.models.financial_entry import FinancialEntry
from app.auth import get_current_user
from app.models.users import User
from app.utils.analytics import calculate_trend, month_year_pair
from fastapi.responses import FileResponse
import pandas as pd
import os
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from calendar import month_abbr
from .. import models


router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/farmer-stats")
def get_farmer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id

    total_farmers = db.query(func.count(FarmerRegistration.id))\
        .filter(FarmerRegistration.tenant_id == tenant_id)\
        .scalar() or 0

    active_farmers = db.query(FarmerRegistration)\
        .filter(
            FarmerRegistration.Status == "Active",
            FarmerRegistration.tenant_id == tenant_id
        ).count()

    active_percent = round((active_farmers / total_farmers) * 100, 2) if total_farmers > 0 else 0

    avg_farm_size = db.query(func.avg(FarmProfile.TotalFarmSize))\
        .join(FarmerRegistration)\
        .filter(FarmerRegistration.tenant_id == tenant_id)\
        .scalar()

    avg_farm_size = round(avg_farm_size, 2) if avg_farm_size else 0

    avg_carbon_score = db.query(
        func.coalesce(func.avg(SequestrationRecord.carbon_removed), 0)
    ).filter(
        SequestrationRecord.tenant_id == tenant_id
    ).scalar()

    avg_carbon_score = round(avg_carbon_score, 2) if avg_carbon_score else 0

    monthly_income_subquery = db.query(
        FinancialEntry.FarmerRegistrationId.label("farmer_id"),
        func.date_format(FinancialEntry.EntryDate, "%Y-%m").label("month"),
        func.sum(FinancialEntry.Amount).label("monthly_income")
    ).filter(
        FinancialEntry.tenant_id == tenant_id,
        FinancialEntry.EntryType == "Income"
    ).group_by(
        FinancialEntry.FarmerRegistrationId,
        func.date_format(FinancialEntry.EntryDate, "%Y-%m")
    ).subquery()

    avg_monthly_income = db.query(
        func.coalesce(func.avg(monthly_income_subquery.c.monthly_income), 0)
    ).scalar()

    avg_monthly_income = round(float(avg_monthly_income), 2)

    return {
        "totalFarmers": total_farmers,
        "activeEngagement": f"{active_percent}%",
        "avgCarbonScore": avg_carbon_score,
        "avgFarmSize": f"{avg_farm_size} acres",
        "avgMonthlyIncome": f"KES {avg_monthly_income}"   
    }
    
def month_year_pair(now):
    if now.month == 1:
        return 12, now.year - 1
    return now.month - 1, now.year


def calculate_trend(current, previous):
    if previous == 0:
        return 100 if current > 0 else 0
    return round(((current - previous) / previous) * 100, 2)

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    tenant_id = current_user.tenant_id

    now = datetime.utcnow()
    prev_month, prev_year = month_year_pair(now)

 
    active_now = db.query(FarmerRegistration).filter(
        FarmerRegistration.Status == "Active",
        FarmerRegistration.tenant_id == tenant_id
    ).count()

    active_prev = db.query(FarmerRegistration).filter(
        FarmerRegistration.Status == "Active",
        FarmerRegistration.tenant_id == tenant_id,
        func.extract("month", FarmerRegistration.CreatedOn) == prev_month,
        func.extract("year", FarmerRegistration.CreatedOn) == prev_year
    ).count()

  
    emissions_total = db.query(
        func.coalesce(func.sum(EmissionRecord.emission_value), 0)
    ).filter(
        EmissionRecord.tenant_id == tenant_id
    ).scalar()

    emissions_now = db.query(
        func.coalesce(func.sum(EmissionRecord.emission_value), 0)
    ).filter(
        EmissionRecord.tenant_id == tenant_id,
        EmissionRecord.reporting_month == now.month,
        EmissionRecord.reporting_year == now.year
    ).scalar()

    emissions_prev = db.query(
        func.coalesce(func.sum(EmissionRecord.emission_value), 0)
    ).filter(
        EmissionRecord.tenant_id == tenant_id,
        EmissionRecord.reporting_month == prev_month,
        EmissionRecord.reporting_year == prev_year
    ).scalar()

   
    sequestration_total = db.query(
        func.coalesce(func.sum(SequestrationRecord.carbon_removed), 0)
    ).filter(
        SequestrationRecord.tenant_id == tenant_id
    ).scalar()

    sequestration_now = db.query(
        func.coalesce(func.sum(SequestrationRecord.carbon_removed), 0)
    ).filter(
        SequestrationRecord.tenant_id == tenant_id,
        SequestrationRecord.reporting_month == now.month,
        SequestrationRecord.reporting_year == now.year
    ).scalar()

    sequestration_prev = db.query(
        func.coalesce(func.sum(SequestrationRecord.carbon_removed), 0)
    ).filter(
        SequestrationRecord.tenant_id == tenant_id,
        SequestrationRecord.reporting_month == prev_month,
        SequestrationRecord.reporting_year == prev_year
    ).scalar()



    disease_total = db.query(ScanDiagnosis).filter(
    ScanDiagnosis.tenant_id == tenant_id
    ).count()

    disease_now = db.query(ScanDiagnosis).filter(
        ScanDiagnosis.tenant_id == tenant_id,
        func.extract("month", ScanDiagnosis.created_on) == now.month,
        func.extract("year", ScanDiagnosis.created_on) == now.year
    ).count()

    disease_prev = db.query(ScanDiagnosis).filter(
        ScanDiagnosis.tenant_id == tenant_id,
        func.extract("month", ScanDiagnosis.created_on) == prev_month,
        func.extract("year", ScanDiagnosis.created_on) == prev_year
    ).count()

    chat_total = db.query(Conversation).filter(
        Conversation.tenant_id == tenant_id
    ).count()

    chat_now = db.query(Conversation).filter(
        Conversation.tenant_id == tenant_id,
        func.extract("month", Conversation.started_at) == now.month,
        func.extract("year", Conversation.started_at) == now.year
    ).count()

    chat_prev = db.query(Conversation).filter(
        Conversation.tenant_id == tenant_id,
        func.extract("month", Conversation.started_at) == prev_month,
        func.extract("year", Conversation.started_at) == prev_year
    ).count()

    return {
        "activeFarmers": active_now,
        "carbonEmissions": round(emissions_total, 2),
        "carbonSequestration": round(sequestration_total, 2),
        "diseaseAlerts": disease_total,
        "chatbotInteractions": chat_total,
        "trends": {
            "activeFarmers": calculate_trend(active_now, active_prev),
            "carbonEmissions": calculate_trend(emissions_now, emissions_prev),
            "carbonSequestration": calculate_trend(sequestration_now, sequestration_prev),
            "diseaseAlerts": calculate_trend(disease_now, disease_prev),
            "chatbotInteractions": calculate_trend(chat_now, chat_prev),
        }
    }

@router.get("/payment-trends")
def get_payment_trends(db: Session = Depends(get_db)):
    """
    Returns monthly total payments for the last 6 months.
    Used for Payment Trends chart.
    """
    current_year = datetime.utcnow().year

    data = (
        db.query(
            extract('month', PaymentTransaction.created_at).label('month'),
            func.sum(PaymentTransaction.amount).label('total')
        )
        .filter(PaymentTransaction.status == 'success')
        .filter(extract('year', PaymentTransaction.created_at) == current_year)
        .group_by('month')
        .order_by('month')
        .all()
    )

    # Format response: [{"month": "Jan", "total": 50000}, ...]
    month_map = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    result = [
        {"month": month_map[int(row.month) - 1], "total": float(row.total or 0)}
        for row in data
    ]

    return result


@router.get("/regional-distribution")
def get_regional_distribution(db: Session = Depends(get_db)):
    """
    Returns total payments per county/region.
    Assumes FarmerRegistration table has 'Location' or 'County' field.
    """
    location_field = getattr(FarmerRegistration, "Location", None) or getattr(FarmerRegistration, "County", None)
    if not location_field:
        raise HTTPException(status_code=400, detail="Farmer table missing location/county field")

    data = (
        db.query(
            location_field.label("region"),
            func.sum(PaymentTransaction.amount).label("total")
        )
        .join(FarmerRegistration, PaymentTransaction.farmer_id == FarmerRegistration.id)
        .filter(PaymentTransaction.status == "success")
        .group_by(location_field)
        .order_by(func.sum(PaymentTransaction.amount).desc())
        .all()
    )

    total_all = sum(float(row.total or 0) for row in data)

    result = [
        {"region": row.region, "total": float(row.total or 0)}
        for row in data
    ]
    result.append({"region": "Total", "total": total_all})
    return result


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """
    Optional: for top-level analytics overview (total payouts, success rate, etc.)
    """
    total_paid = db.query(func.sum(PaymentTransaction.amount)).filter(PaymentTransaction.status == "success").scalar() or 0
    total_transactions = db.query(func.count(PaymentTransaction.id)).scalar() or 0
    successful = db.query(func.count(PaymentTransaction.id)).filter(PaymentTransaction.status == "success").scalar() or 0
    failed = db.query(func.count(PaymentTransaction.id)).filter(PaymentTransaction.status == "failed").scalar() or 0

    return {
        "total_paid": total_paid,
        "total_transactions": total_transactions,
        "success_rate": round((successful / total_transactions * 100), 2) if total_transactions else 0,
        "failed": failed
    }




REPORTS_DIR = "generated_reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


@router.get("/export")
def export_report(format: str = "pdf", db: Session = Depends(get_db)):
    """
    Export analytics data as PDF or CSV.
    Query param: ?format=pdf or ?format=csv
    """
    # Reuse same logic from our analytics endpoints
    # Monthly payment trends
    trends = (
        db.query(
            extract('month', PaymentTransaction.created_at).label('month'),
            func.sum(PaymentTransaction.amount).label('total')
        )
        .filter(PaymentTransaction.status == 'success')
        .group_by('month')
        .order_by('month')
        .all()
    )

    # Regional distribution
    location_field = getattr(FarmerRegistration, "Location", None) or getattr(FarmerRegistration, "County", None)
    regional = (
        db.query(
            location_field.label("region"),
            func.sum(PaymentTransaction.amount).label("total")
        )
        .join(FarmerRegistration, PaymentTransaction.farmer_id == FarmerRegistration.id)
        .filter(PaymentTransaction.status == "success")
        .group_by(location_field)
        .order_by(func.sum(PaymentTransaction.amount).desc())
        .all()
    )

    # Format data
    month_map = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend_rows = [{"Month": month_map[int(row.month) - 1], "Total (KES)": float(row.total or 0)} for row in trends]
    region_rows = [{"Region": row.region, "Total (KES)": float(row.total or 0)} for row in regional]

    total_all = sum(r["Total (KES)"] for r in region_rows)
    region_rows.append({"Region": "Total", "Total (KES)": total_all})

    if format.lower() == "csv":
        # Export CSV
        df_trends = pd.DataFrame(trend_rows)
        df_regions = pd.DataFrame(region_rows)

        csv_path = os.path.join(REPORTS_DIR, "analytics_report.csv")
        with pd.ExcelWriter(csv_path.replace(".csv", ".xlsx")) as writer:
            df_trends.to_excel(writer, sheet_name="Payment Trends", index=False)
            df_regions.to_excel(writer, sheet_name="Regional Distribution", index=False)

        return FileResponse(csv_path.replace(".csv", ".xlsx"), filename="analytics_report.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    # Otherwise export as PDF
    pdf_path = os.path.join(REPORTS_DIR, "analytics_report.pdf")

    doc = SimpleDocTemplate(pdf_path, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("AgriPay Analytics Report", styles["Title"]))
    elements.append(Spacer(1, 12))

    # Payment Trends table
    elements.append(Paragraph("Payment Trends", styles["Heading2"]))
    trend_table_data = [["Month", "Total (KES)"]] + [[r["Month"], f"{r['Total (KES)']:,}"] for r in trend_rows]
    trend_table = Table(trend_table_data)
    trend_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#5D9CEC")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')
    ]))
    elements.append(trend_table)
    elements.append(Spacer(1, 18))

    # Regional Distribution table
    elements.append(Paragraph("Regional Distribution", styles["Heading2"]))
    region_table_data = [["Region", "Total (KES)"]] + [[r["Region"], f"{r['Total (KES)']:,}"] for r in region_rows]
    region_table = Table(region_table_data)
    region_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#48CFAD")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')
    ]))
    elements.append(region_table)

    doc.build(elements)
    return FileResponse(pdf_path, filename="analytics_report.pdf", media_type="application/pdf")








@router.get("/feature-usage")
def get_feature_usage(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id

    # Count unique records per table for the tenant
    diseases_scanned_count = db.query(func.count(models.ScanDiagnosis.id))\
        .filter(models.ScanDiagnosis.tenant_id == tenant_id).scalar() or 0
    chatbot_interactions_count = db.query(func.count(models.ChatHistory.id))\
        .filter(models.ChatHistory.tenant_id == tenant_id).scalar() or 0
    carbon_emission_count = db.query(func.count(models.EmissionRecord.emission_record_id))\
        .filter(models.EmissionRecord.tenant_id == tenant_id).scalar() or 0
    carbon_sequestration_count = db.query(func.count(models.SequestrationRecord.sequestration_record_id))\
        .filter(models.SequestrationRecord.tenant_id == tenant_id).scalar() or 0
    financial_tracking_count = db.query(func.count(models.FinancialEntry.id))\
        .filter(models.FinancialEntry.tenant_id == tenant_id).scalar() or 0
    yields_count = db.query(func.count(models.CropProductionData.id))\
        .filter(models.CropProductionData.tenant_id == tenant_id).scalar() or 0

    color_palette = {
        "Diseases Scanned": "#8159E1",
        "Chatbot Interactions": "#2196F3",
        "Carbon Emission": "#FF9800",
        "Carbon Sequestration": "#4CAF50",
        "Financial Tracking": "#F44336",
        "Yields": "#9C27B0"
    }

    features = [
        {"name": "Diseases Scanned", "count": diseases_scanned_count, "color": color_palette["Diseases Scanned"]},
        {"name": "Chatbot Interactions", "count": chatbot_interactions_count, "color": color_palette["Chatbot Interactions"]},
        {"name": "Carbon Emission", "count": carbon_emission_count, "color": color_palette["Carbon Emission"]},
        {"name": "Carbon Sequestration", "count": carbon_sequestration_count, "color": color_palette["Carbon Sequestration"]},
        {"name": "Financial Tracking", "count": financial_tracking_count, "color": color_palette["Financial Tracking"]},
        {"name": "Yields", "count": yields_count, "color": color_palette["Yields"]}
    ]

    return {"features": features}



@router.get("/engagement-trends")
def get_engagement_trends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tenant_id = current_user.tenant_id
    today = datetime.utcnow()

    # 🔹 Get latest month from any engagement table
    max_farmer = db.query(func.max(models.FarmerRegistration.CreatedOn))\
        .filter(models.FarmerRegistration.tenant_id == tenant_id).scalar()
    max_chat = db.query(func.max(models.ChatHistory.created_at))\
        .filter(models.ChatHistory.tenant_id == tenant_id).scalar()
    max_scan = db.query(func.max(models.ScanDiagnosis.created_on))\
        .filter(models.ScanDiagnosis.tenant_id == tenant_id).scalar()

    max_date = max(filter(None, [max_farmer, max_chat, max_scan]), default=today)
    end_year = max_date.year
    end_month = max_date.month

    # 🔹 Build last 6 months
    months = []
    for i in range(5, -1, -1):
        m = end_month - i
        y = end_year
        if m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    # 🔹 Query grouped counts
    farmers_rows = db.query(
        extract("year", models.FarmerRegistration.CreatedOn),
        extract("month", models.FarmerRegistration.CreatedOn),
        func.count(models.FarmerRegistration.id)
    ).filter(models.FarmerRegistration.tenant_id == tenant_id)\
     .group_by(extract("year", models.FarmerRegistration.CreatedOn),
               extract("month", models.FarmerRegistration.CreatedOn)).all()

    chatbot_rows = db.query(
        extract("year", models.ChatHistory.created_at),
        extract("month", models.ChatHistory.created_at),
        func.count(models.ChatHistory.id)
    ).filter(models.ChatHistory.tenant_id == tenant_id)\
     .group_by(extract("year", models.ChatHistory.created_at),
               extract("month", models.ChatHistory.created_at)).all()

    scanned_rows = db.query(
        extract("year", models.ScanDiagnosis.created_on).cast(Integer),
        extract("month", models.ScanDiagnosis.created_on).cast(Integer),
        func.count(models.ScanDiagnosis.id)
    ).filter(models.ScanDiagnosis.tenant_id == tenant_id)\
     .group_by(extract("year", models.ScanDiagnosis.created_on).cast(Integer),
               extract("month", models.ScanDiagnosis.created_on).cast(Integer)).all()

    farmers_dict = {(int(y), int(m)): c for y, m, c in farmers_rows}
    chatbot_dict = {(int(y), int(m)): c for y, m, c in chatbot_rows}
    scanned_dict = {(int(y), int(m)): c for y, m, c in scanned_rows}

    trends = []
    for year, month in months:
        trends.append({
            "month": f"{month_abbr[month]} {year}",
            "totalFarmersRegistered": farmers_dict.get((year, month), 0),
            "chatbotInteractions": chatbot_dict.get((year, month), 0),
            "diseasesScanned": scanned_dict.get((year, month), 0)
        })

    return {"trends": trends}