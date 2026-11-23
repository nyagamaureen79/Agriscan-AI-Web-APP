from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.models.document_chunk import DocumentChunk
from app.services.embeddings import get_embedding
from app.services.vertex_service import search_similar


def retrieve_chunks(
    db: Session,
    query: str,
    tenant_id: int,
    k: int = 5
):
    print(f"[SEARCH] Query: {query}", flush=True)

    query_embedding = get_embedding(query)

    # search_similar returns: [{"datapoint_id": "...", "distance": ...}, ...]
    results = search_similar(
        embedding=query_embedding,
        tenant_id=tenant_id,
        k=k
    )

    print(f"[SEARCH] Vector results: {len(results)}", flush=True)

    if not results:
        print("[SEARCH] No vector results found", flush=True)
        return []

    # Extract datapoint_ids from dicts (not objects)
    datapoint_ids = [r["datapoint_id"] for r in results]

    print(f"[SEARCH] Datapoint IDs: {datapoint_ids}", flush=True)

    chunks = (
        db.query(DocumentChunk)
        .filter(
            DocumentChunk.tenant_id == tenant_id,
            DocumentChunk.datapoint_id.in_(datapoint_ids)
        )
        .all()
    )

    print(f"[SEARCH] Chunks retrieved: {len(chunks)}", flush=True)

    return chunks