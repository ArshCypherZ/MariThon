from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from .core.db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, index=True)


class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), primary_key=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String, default="member")


class Voyage(Base):
    __tablename__ = "voyages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id"))
    name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")


class VoyageSetting(Base):
    __tablename__ = "voyage_settings"
    # One row per voyage; stores per-voyage NOR override and future settings
    voyage_id: Mapped[int] = mapped_column(Integer, ForeignKey("voyages.id"), primary_key=True)
    mock_nor_date: Mapped[str | None] = mapped_column(String, nullable=True)


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    voyage_id: Mapped[int] = mapped_column(Integer, ForeignKey("voyages.id"))
    filename: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String)
    mime: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="uploaded")
    text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Clause(Base):
    __tablename__ = "clauses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"))
    type: Mapped[str] = mapped_column(String)  # laytime | demurrage
    text: Mapped[str] = mapped_column(Text)
    start_offset: Mapped[int] = mapped_column(Integer)
    end_offset: Mapped[int] = mapped_column(Integer)
    confidence: Mapped[float] = mapped_column(Float)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    voyage_id: Mapped[int] = mapped_column(Integer, ForeignKey("voyages.id"))
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"))
    type: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    evidence_offsets: Mapped[str] = mapped_column(Text)  # JSON string of ranges
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
