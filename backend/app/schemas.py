from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DocumentOut(BaseModel):
    id: int
    voyage_id: int
    filename: str
    mime: str
    status: str
    text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ClauseOut(BaseModel):
    id: int
    document_id: int
    type: str
    text: str
    start_offset: int
    end_offset: int
    confidence: float

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    voyage_id: int
    document_id: int
    type: str
    severity: str
    message: str
    evidence_offsets: str
    created_at: datetime

    class Config:
        from_attributes = True


class VoyageOut(BaseModel):
    id: int
    workspace_id: int
    name: str
    status: str
    documents: List[DocumentOut] | None = None

    class Config:
        from_attributes = True


class VoyageNorConfig(BaseModel):
    nor_date: str
