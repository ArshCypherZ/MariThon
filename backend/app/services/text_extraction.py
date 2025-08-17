from typing import Tuple


def extract_text_from_pdf(file_path: str) -> str:
    from pdfminer.high_level import extract_text

    return extract_text(file_path) or ""


def extract_text_from_docx(file_path: str) -> str:
    from docx import Document

    doc = Document(file_path)
    return "\n".join(p.text for p in doc.paragraphs if p.text) or ""


def extract_text(file_path: str, mime: str) -> str:
    if mime in ("application/pdf",) or file_path.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    if mime in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword") or file_path.lower().endswith(".docx"):
        return extract_text_from_docx(file_path)
    # Fallback: treat as text
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
