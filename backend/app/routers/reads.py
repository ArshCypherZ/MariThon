from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.db import get_db, Base, engine
from ..core.config import get_settings
from .. import models, schemas
from ..services import storage
from typing import List

router = APIRouter(tags=["reads"])

# Create tables on first import
Base.metadata.create_all(bind=engine)


@router.get("/workspaces/{ws_id}/alerts", response_model=List[schemas.AlertOut])
def list_alerts(ws_id: int, db: Session = Depends(get_db)):
    # Filter alerts by workspace via voyage relationship
    return (
        db.query(models.Alert)
        .join(models.Voyage, models.Voyage.id == models.Alert.voyage_id)
        .filter(models.Voyage.workspace_id == ws_id)
        .order_by(models.Alert.created_at.desc())
        .all()
    )


@router.get("/workspaces/{ws_id}/voyages", response_model=List[schemas.VoyageOut])
def list_voyages(ws_id: int, db: Session = Depends(get_db)):
    voyages = db.query(models.Voyage).filter(models.Voyage.workspace_id == ws_id).order_by(models.Voyage.id.desc()).all()
    return voyages


@router.post("/workspaces/{ws_id}/voyages", response_model=schemas.VoyageOut)
def create_voyage(ws_id: int, name: str, db: Session = Depends(get_db)):
    v = models.Voyage(workspace_id=ws_id, name=name)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/workspaces/{ws_id}/voyages/{voyage_id}")
def delete_voyage(ws_id: int, voyage_id: int, db: Session = Depends(get_db)):
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if not voyage or voyage.workspace_id != ws_id:
        raise HTTPException(404, "Voyage not found in workspace")
    # Delete related records and files
    docs = db.query(models.Document).filter(models.Document.voyage_id == voyage_id).all()
    for doc in docs:
        db.query(models.Clause).filter(models.Clause.document_id == doc.id).delete()
        db.query(models.Alert).filter(models.Alert.document_id == doc.id).delete()
        storage.delete_file(doc.path)
        db.delete(doc)
    # Delete voyage-level alerts (if any)
    db.query(models.Alert).filter(models.Alert.voyage_id == voyage_id).delete()
    db.delete(voyage)
    db.commit()
    return {"status": "deleted"}


@router.get("/voyages/{voyage_id}", response_model=schemas.VoyageOut)
def get_voyage(voyage_id: int, db: Session = Depends(get_db)):
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if not voyage:
        raise HTTPException(404, "Voyage not found")
    docs = db.query(models.Document).filter(models.Document.voyage_id == voyage_id).order_by(models.Document.id.desc()).all()
    voyage.documents = docs  # type: ignore
    return voyage


@router.get("/documents/{doc_id}", response_model=schemas.DocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/documents/{doc_id}/clauses", response_model=List[schemas.ClauseOut])
def get_document_clauses(doc_id: int, db: Session = Depends(get_db)):
    clauses = db.query(models.Clause).filter(models.Clause.document_id == doc_id).all()
    return clauses


@router.get("/alerts/{alert_id}", response_model=schemas.AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    return alert


# Per-voyage NOR configuration endpoints
@router.get("/voyages/{voyage_id}/nor", response_model=schemas.VoyageNorConfig)
def get_voyage_nor(voyage_id: int, db: Session = Depends(get_db)):
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if not voyage:
        raise HTTPException(404, "Voyage not found")
    nor = None
    if voyage.status and "NOR=" in voyage.status:
        try:
            nor = voyage.status.split("NOR=")[-1].split()[0].strip()
        except Exception:
            nor = None
    return schemas.VoyageNorConfig(nor_date=nor or get_settings().MOCK_NOR_DATE)


@router.put("/voyages/{voyage_id}/nor", response_model=schemas.VoyageNorConfig)
def set_voyage_nor(voyage_id: int, payload: schemas.VoyageNorConfig, db: Session = Depends(get_db)):
    voyage = db.query(models.Voyage).filter(models.Voyage.id == voyage_id).first()
    if not voyage:
        raise HTTPException(404, "Voyage not found")
    base = (voyage.status or "active").split("NOR=")[0].strip()
    voyage.status = (base + f" NOR={payload.nor_date}").strip()
    db.commit()
    return schemas.VoyageNorConfig(nor_date=payload.nor_date)
