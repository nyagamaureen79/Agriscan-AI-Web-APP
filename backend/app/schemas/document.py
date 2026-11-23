from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentBase(BaseModel):
    document_name: Optional[str] = None
    file_name: str

    file_type: Optional[str]
    file_size: Optional[int]
    category: Optional[str]
    s3_url: Optional[str]
    status: Optional[str] = "Processing"

class DocumentCreate(DocumentBase):
    tenant_id: Optional[int]
    uploaded_by: Optional[int]

class DocumentResponse(BaseModel):
    id: int
    tenant_id: int

    document_name: Optional[str] = None
    file_name: str

    file_type: Optional[str]
    file_size: Optional[int]
    category: Optional[str]
    s3_url: str
    status: str
    uploaded_by: int

    uploaded_by_name: Optional[str]
    created_at: Optional[datetime]

    class Config:
        orm_mode = True