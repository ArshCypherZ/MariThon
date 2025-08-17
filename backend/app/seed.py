from sqlalchemy.orm import Session
from .core.db import SessionLocal, Base, engine
from . import models
from .services import storage
from .services.background import process_document
from .core.config import get_settings
import os


def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Create a fake user/workspace/voyage if not exists
        user = db.query(models.User).filter_by(external_id="demo-user").first()
        if not user:
            user = models.User(external_id="demo-user", email="demo@example.com")
            db.add(user)
            db.flush()
        ws = db.query(models.Workspace).filter_by(name="Demo Workspace").first()
        if not ws:
            ws = models.Workspace(name="Demo Workspace", owner_id=user.id)
            db.add(ws)
            db.flush()
        member = db.query(models.WorkspaceMember).filter_by(user_id=user.id, workspace_id=ws.id).first()
        if not member:
            member = models.WorkspaceMember(user_id=user.id, workspace_id=ws.id, role="owner")
            db.add(member)
        voyage = db.query(models.Voyage).filter_by(workspace_id=ws.id, name="Demo Voyage").first()
        if not voyage:
            voyage = models.Voyage(workspace_id=ws.id, name="Demo Voyage")
            db.add(voyage)
            db.flush()

        # Add a demo document if none exists
        existing_doc = db.query(models.Document).filter_by(voyage_id=voyage.id).first()
        if not existing_doc:
            sample_text = (
                "Charter Party Agreement\n\n"
                "Laytime / Laycan: The laycan is fixed from 2025-08-10 to 2025-08-12. Notice of readiness must be tendered within the laycan period.\n\n"
                "Demurrage: Demurrage rate shall be USD 15,000 per day pro rata. Despatch at half demurrage rate.\n\n"
                "Other Terms: Standard CP terms apply."
            )
            path = storage.save_bytes("demo_charter.txt", sample_text.encode("utf-8"))
            doc = models.Document(
                voyage_id=voyage.id,
                filename=os.path.basename(path),
                path=path,
                mime="text/plain",
                status="uploaded",
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            # Process document to extract clauses and create alerts if any
            process_document(doc.id)

        db.commit()
        print({"workspace_id": ws.id, "voyage_id": voyage.id})
    finally:
        db.close()


if __name__ == "__main__":
    seed()
