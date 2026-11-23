from fastapi import APIRouter, UploadFile, File, Depends, Form, BackgroundTasks, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime
import os
from typing import List, Optional


from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.models.users import User
from app.auth import get_current_user
from app.tasks.indexing import run_indexing
from app.utils.permissions import ensure_permission
from app.services.gcs_service import upload_file_to_gcs
from app.services.gcs_service import generate_signed_url

router = APIRouter()


@router.post("/upload", response_model=List[DocumentResponse])
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    document_name: Optional[str] = Form(None),
    tenant_id: Optional[int] = Form(None),
    category: Optional[str] = Form(None),
    platform: Optional[str] = Form("agriscan"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uploaded_docs = []

    for file in files:
        file_content = await file.read()

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        tenant_val = tenant_id or current_user.tenant_id
        final_document_name = document_name or file.filename
        gcs_path = f"{platform}/{tenant_val}/{timestamp}_{file.filename}"

        try:
            gcs_uri = upload_file_to_gcs(file_content, gcs_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"GCS upload failed: {str(e)}")

        document = Document(
            tenant_id=tenant_val,
            document_name=final_document_name,
            file_name=file.filename,
            file_type=file.content_type,
            file_size=len(file_content),
            category=category,
            s3_url=gcs_uri,
            status="Uploaded",        # ← new status: file is in GCS, not yet indexed
            uploaded_by=current_user.id,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        document.uploaded_by_name = (
            f"{current_user.first_name} {current_user.last_name}"
        )

        # ── Run indexing in the background — does NOT block the response ──
        background_tasks.add_task(
            run_indexing,
            document.id,
            tenant_val,
            gcs_uri,
            platform,
        )

        uploaded_docs.append(document)

    # Returns immediately with status="Uploaded"
    # Frontend can poll /documents/{id}/status to track indexing progress
    return uploaded_docs


@router.get("/{document_id}/status")
def get_document_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lightweight polling endpoint the frontend calls every few seconds
    to track indexing progress.
    Returns: { id, status, num_chunks, file_name }
    Possible statuses: Uploaded → Indexing → Processed | Failed
    """
    document = (
        db.query(Document)
        .filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id,
        )
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": document.id,
        "file_name": document.file_name,
        "status": document.status,
        "num_chunks": document.num_chunks,
    }


@router.get("/recent", response_model=List[DocumentResponse])
def get_recent_documents(db: Session = Depends(get_db)):
    documents = (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .limit(20)
        .all()
    )
    for doc in documents:
        user = db.query(User).filter(User.id == doc.uploaded_by).first()
        doc.uploaded_by_name = (
            f"{user.first_name} {user.last_name}" if user else "Unknown"
        )
    return documents


@router.get("/stats")
def get_document_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        tenant_id = current_user.tenant_id
        total_docs = db.query(Document).filter(Document.tenant_id == tenant_id).count()
        processed_docs = db.query(Document).filter(Document.tenant_id == tenant_id, Document.status == "Processed").count()
        processing_docs = db.query(Document).filter(Document.tenant_id == tenant_id, Document.status.in_(["Processing", "Indexing", "Uploaded"])).count()
        total_size_bytes = db.query(Document.file_size).filter(Document.tenant_id == tenant_id).all()
        total_size = sum([f[0] or 0 for f in total_size_bytes])
        return {
            "total_documents": total_docs,
            "processed_documents": processed_docs,
            "processing_documents": processing_docs,
            "total_size_bytes": total_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/superadmin/stats/total-documents")
def get_total_documents_for_all_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_permission(current_user, ["super_admin"])
    return {"total_documents": db.query(Document).count()}


@router.get("/tenants/{tenant_id}/documents")
def get_documents_by_tenant_id(tenant_id: int, db: Session = Depends(get_db)):
    documents = db.query(Document).filter(Document.tenant_id == tenant_id).all()
    return [
        {
            "id": doc.id,
            "file_name": doc.file_name,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "num_chunks": doc.num_chunks,
            "tenant_id": doc.tenant_id,
            "status": doc.status,
            "created_at": doc.created_at,
            "s3_url": doc.s3_url,
        }
        for doc in documents
    ]


@router.get("/{document_id}/view")
def view_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.tenant_id == current_user.tenant_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.s3_url:
        raise HTTPException(status_code=404, detail="No file URL found")

    try:
        signed_url = generate_signed_url(document.s3_url)
        return {"url": signed_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not generate view URL: {str(e)}")