from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db

from app.auth import get_current_user

from app.models.users import User

from app.services.search_service import retrieve_chunks
from app.services.rag_service import generate_rag_response


router = APIRouter(
    prefix="/search",
    tags=["RAG"]
)


@router.post("/")
def search_documents(
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    chunks = retrieve_chunks(
        db=db,
        query=query,
        tenant_id=current_user.tenant_id,
        k=5
    )

    response = generate_rag_response(
        query=query,
        chunks=chunks
    )

    return response