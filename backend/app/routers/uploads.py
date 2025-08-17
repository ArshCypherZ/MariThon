from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..core.db import get_db
from .. import models
from ..services import storage
from ..services.background import process_document
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces/{ws_id}/voyages/{voyage_id}/documents", tags=["uploads"])


@router.post("")
async def upload_document(
    ws_id: int,
    voyage_id: int,
    file: UploadFile = File(...),
    background: BackgroundTasks = None,  # type: ignore
    db: Session = Depends(get_db),
):
    # Validate voyage exists (and belongs to workspace)
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if not voyage or voyage.workspace_id != ws_id:
        raise HTTPException(404, "Voyage not found in workspace")

    # Save uploaded file to storage
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    safe_name = file.filename or "upload"
    path = storage.save_bytes(safe_name, data)

    # Create Document record
    doc = models.Document(
        voyage_id=voyage_id,
        filename=os.path.basename(path),
        path=path,
        mime=file.content_type or "application/octet-stream",
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    logger.info("Uploaded document id=%s saved to %s; scheduling background processing", doc.id, path)

    # Trigger background processing
    if background is not None:
        background.add_task(process_document, doc.id)
    else:
        process_document(doc.id)

    return {
        "id": doc.id,
        "voyage_id": doc.voyage_id,
        "filename": doc.filename,
        "mime": doc.mime,
        "status": doc.status,
        "created_at": doc.created_at,
    }


@router.delete("/{doc_id}")
async def delete_document(ws_id: int, voyage_id: int, doc_id: int, db: Session = Depends(get_db)):
    # Validate voyage and document
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if not voyage or voyage.workspace_id != ws_id:
        raise HTTPException(404, "Voyage not found in workspace")
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.voyage_id == voyage_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete clauses and alerts referencing this doc
    db.query(models.Clause).filter(models.Clause.document_id == doc.id).delete()
    db.query(models.Alert).filter(models.Alert.document_id == doc.id).delete()

    # Delete file from storage
    storage.delete_file(doc.path)

    # Delete document record
    db.delete(doc)
    db.commit()

    return {"status": "deleted"}
