import json
import logging
from sqlalchemy.orm import Session
from ..core.db import SessionLocal
from ..core.config import get_settings
from .. import models
from .text_extraction import extract_text
from .gemini import GeminiClient

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

settings = get_settings()


def _get_voyage_nor(db: Session, voyage_id: int) -> str:
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if voyage and voyage.status and "NOR=" in voyage.status:
        try:
            return voyage.status.split("NOR=")[-1].split()[0].strip()
        except Exception:
            pass
    return settings.MOCK_NOR_DATE


def process_document(document_id: int):
    db: Session = SessionLocal()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            logger.error("Document %s not found", document_id)
            return
        logger.info("Start processing document id=%s path=%s mime=%s", doc.id, doc.path, doc.mime)
        # Extract raw text locally for offset mapping only
        text = extract_text(doc.path, doc.mime)
        doc.text = text
        doc.status = "processing"
        db.commit()
        db.refresh(doc)

        g = GeminiClient()
        clauses = []
        try:
            uploaded = g.upload_file(doc.path)
            file_ref, mime_type = g.get_file_ref(uploaded, default_mime=doc.mime)
            logger.info("File ref resolved: %r mime=%r", file_ref, mime_type)
            if file_ref:
                clauses = g.extract_clauses_from_file(file_ref, mime_type, text)
            else:
                logger.error("No file_ref resolved for document id=%s", doc.id)
        except Exception:
            logger.exception("Gemini pipeline failed during upload/extraction for doc id=%s", doc.id)
            clauses = []

        for c in clauses or []:
            cl = models.Clause(
                document_id=doc.id,
                type=c["type"],
                text=c["text"],
                start_offset=c["start_offset"],
                end_offset=c["end_offset"],
                confidence=c.get("confidence", 0.5),
            )
            db.add(cl)
        doc.status = "ready"
        db.commit()
        logger.info("Saved %d clauses for doc id=%s; status=ready", len(clauses or []), doc.id)

        # Risk evaluation only if a laytime clause exists (Gemini-based)
        lay = next((c for c in (clauses or []) if c["type"] == "laytime"), None)
        if lay:
            nor_date = _get_voyage_nor(db, doc.voyage_id)
            logger.info("Using NOR date for voyage %s: %s", doc.voyage_id, nor_date)
            try:
                evaluation = g.evaluate_laycan(nor_date, lay["text"])  # Gemini only
            except Exception:
                logger.exception("evaluate_laycan failed for doc id=%s", doc.id)
                evaluation = None
            if evaluation and evaluation.get("inconsistent"):
                alert = models.Alert(
                    voyage_id=doc.voyage_id,
                    document_id=doc.id,
                    type="LaycanInconsistency",
                    severity="high",
                    message=evaluation.get("message") or "NOR outside Laycan window.",
                    evidence_offsets=json.dumps([[lay["start_offset"], lay["end_offset"]]]),
                )
                db.add(alert)
                db.commit()
                logger.info("Created alert %s for voyage_id=%s doc_id=%s", alert.id, doc.voyage_id, doc.id)
            else:
                logger.info("No inconsistency detected or evaluation missing for doc id=%s", doc.id)
    finally:
        db.close()
