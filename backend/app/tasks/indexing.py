import os
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

from app.services.gcs_service import download_gcs_file
from app.services.text_extractor import extract_text
from app.services.chunking import chunk_text
from app.services.embeddings import get_embedding
from app.services.vertex_service import upsert_vector


def run_indexing(document_id: int, tenant_id: int, gcs_uri: str, platform: str):
    """
    Runs entirely in a background thread (via BackgroundTasks).
    Status flow: Uploaded → Indexing → Processed | Failed
    """
    db: Session = SessionLocal()

    try:
        print(f"[INDEXING] STARTED for document {document_id}", flush=True)

        document = db.query(Document).filter(Document.id == document_id).first()

        if not document:
            print(f"[INDEXING] Document {document_id} not found", flush=True)
            return

        # ── Mark as Indexing so UI can show progress ──
        document.status = "Indexing"
        db.commit()

        gcs_path = gcs_uri.replace(f"gs://{os.getenv('GCS_BUCKET')}/", "")

        print("[INDEXING] Downloading file...", flush=True)
        local_file_path = download_gcs_file(gcs_path)

        print("[INDEXING] Extracting text...", flush=True)
        text = extract_text(local_file_path)

        if not text.strip():
            document.status = "Failed"
            db.commit()
            print("[INDEXING] Empty text — marked as Failed", flush=True)
            return

        print("[INDEXING] Chunking...", flush=True)
        chunks = chunk_text(text)

        document.num_chunks = len(chunks)
        db.commit()

        print(f"[INDEXING] Total chunks: {len(chunks)}", flush=True)

        for i, chunk in enumerate(chunks):
            datapoint_id = f"{document.id}_{i}"

            embedding = get_embedding(chunk)

            chunk_record = DocumentChunk(
                document_id=document.id,
                tenant_id=tenant_id,
                chunk_index=i,
                chunk_text=chunk,
                datapoint_id=datapoint_id,
                file_name=document.file_name,
            )
            db.add(chunk_record)

            upsert_vector(
                datapoint_id=datapoint_id,
                embedding=embedding,
                metadata={"tenant_id": tenant_id},
            )

            print(f"[INDEXED] chunk {i}/{len(chunks) - 1}", flush=True)

        db.commit()

        document.status = "Processed"
        db.commit()

        print(f"[INDEXING] COMPLETE for document {document_id}", flush=True)

    except Exception as e:
        print(f"[INDEXING ERROR] document {document_id}: {str(e)}", flush=True)
        try:
            document.status = "Failed"
            db.commit()
        except Exception:
            pass

    finally:
        db.close()