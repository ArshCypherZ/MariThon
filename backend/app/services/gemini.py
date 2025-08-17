from typing import Optional, List, Dict, Any
import json
import os
import mimetypes
import logging
from ..core.config import get_settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

settings = get_settings()

try:
    from google import genai
except Exception:
    genai = None
    logger.exception("google-genai SDK import failed")


class GeminiClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        logger.info("Initializing GeminiClient; API key present: %s", bool(self.api_key))
        if genai and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini client initialized successfully")
            except Exception:
                logger.exception("Failed to initialize genai.Client")
        else:
            if not genai:
                logger.error("GenAI SDK unavailable")
            if not self.api_key:
                logger.error("GEMINI_API_KEY missing")

    def upload_file(self, file_path: str):
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        logger.info("Uploading file to Gemini: %s", file_path)
        try:
            res = self.client.files.upload(file=file_path)
            logger.info("Upload complete: %r", res)
            return res
        except Exception:
            logger.exception("Upload failed for %s", file_path)
            raise

    def list_files(self) -> List[Dict[str, Any]]:
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        try:
            items = self.client.files.list()
            logger.info("Files.list returned %r items", len(items or []))
        except Exception:
            logger.exception("Files.list failed")
            items = []
        results = []
        for it in items or []:
            try:
                file_obj = getattr(it, "file", None) or it
                rec = {
                    "name": getattr(file_obj, "name", None),
                    "uri": getattr(file_obj, "uri", None),
                    "mime_type": getattr(file_obj, "mime_type", None),
                }
                logger.debug("File entry: %r", rec)
                results.append(rec)
            except Exception:
                logger.exception("Error normalizing file entry: %r", it)
                continue
        return results

    def get_file(self, name: str) -> Dict[str, Any] | None:
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        try:
            meta = self.client.files.get(name=name)
            file_obj = getattr(meta, "file", None) or meta
            out = {
                "name": getattr(file_obj, "name", None),
                "uri": getattr(file_obj, "uri", None),
                "mime_type": getattr(file_obj, "mime_type", None),
            }
            logger.info("Fetched file meta by name %s: %r", name, out)
            return out
        except Exception:
            logger.exception("Files.get failed for name=%s", name)
            return None

    def get_file_ref(self, uploaded_obj: Any, default_mime: Optional[str] = None) -> tuple[Optional[str], Optional[str]]:
        """
        Returns a stable file reference for use in file_data.file_uri and the mime type.
        Prefers URI; if only name is available, tries files.get(name) to retrieve uri.
        Supports both top-level and nested .file.
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        file_uri = None
        mime = default_mime
        if uploaded_obj is None:
            logger.warning("get_file_ref called with None uploaded_obj")
            return file_uri, mime
        # Try direct attributes
        file_uri = getattr(uploaded_obj, "uri", None)
        name = getattr(uploaded_obj, "name", None)
        if getattr(uploaded_obj, "file", None) is not None:
            inner = uploaded_obj.file
            file_uri = file_uri or getattr(inner, "uri", None)
            name = name or getattr(inner, "name", None)
            mime = getattr(inner, "mime_type", mime) or mime
        else:
            mime = getattr(uploaded_obj, "mime_type", mime) or mime
        # If no uri, but name exists, try files.get(name)
        if not file_uri and name:
            try:
                meta = self.client.files.get(name=name)
                file_uri = getattr(meta, "uri", None) or getattr(meta, "name", None)
                mime = getattr(meta, "mime_type", mime) or mime
                logger.info("Resolved file_ref via files.get: uri=%r mime=%r", file_uri, mime)
            except Exception:
                logger.exception("files.get failed when resolving file_ref for name=%s", name)
        logger.info("get_file_ref -> uri=%r mime=%r", file_uri, mime)
        return file_uri, mime

    def _extract_json(self, text: str) -> Any:
        try:
            return json.loads(text)
        except Exception:
            pass
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                pass
        start = text.find('[')
        end = text.rfind(']')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                pass
        return None

    def _find_offsets_heuristic(self, full_text: str, snippet: str) -> tuple[int, int] | None:
        i = full_text.find(snippet)
        if i != -1:
            return i, i + len(snippet)
        base = snippet.strip()
        if not base:
            return None
        anchor_len = min(60, len(base))
        prefix = base[:anchor_len]
        j = full_text.find(prefix)
        if j != -1:
            end = min(j + len(base), len(full_text))
            return j, end
        suffix = base[-anchor_len:]
        k = full_text.find(suffix)
        if k != -1:
            start = max(0, k - (len(base) - anchor_len))
            end = min(start + len(base), len(full_text))
            return start, end
        return None

    def extract_clauses_from_file(self, file_ref: str, mime_type: Optional[str], full_text_for_offsets: str) -> List[Dict]:
        """
        Extract clauses via Gemini using a file reference (Files API). No text-only fallback.
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        prompt = (
            "You are a maritime chartering assistant. Analyze the attached document and "
            "extract up to 2 Laytime/Laycan snippets and up to 2 Demurrage snippets.\n"
            "Return STRICT JSON only (no markdown) with schema:\n"
            "{\n  \"clauses\": [\n    { \"type\": \"laytime\" | \"demurrage\", \"text\": string, \"confidence\": number }\n  ]\n}\n"
        )
        logger.info("Calling models.generate_content for clause extraction. file_ref=%r mime=%r", file_ref, mime_type)
        try:
            resp = self.client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"text": prompt},
                            {"file_data": {"file_uri": file_ref, "mime_type": mime_type or "application/octet-stream"}},
                        ],
                    }
                ],
            )
            raw_text = (getattr(resp, "text", "") or "").strip()
            logger.info("Model raw response for clauses (truncated 500): %s", raw_text[:500])
            payload = self._extract_json(raw_text)
            clauses = payload.get("clauses", []) if isinstance(payload, dict) else []
        except Exception:
            logger.exception("generate_content (clauses) failed")
            raise

        results: List[Dict] = []
        for c in clauses:
            try:
                ctype = c.get("type")
                ctext = c.get("text") or ""
                conf = float(c.get("confidence", 0.5))
                if ctype not in ("laytime", "demurrage") or not ctext:
                    continue
                pos = self._find_offsets_heuristic(full_text_for_offsets, ctext)
                if not pos:
                    logger.warning("Could not map snippet to offsets; skipping: %r", ctext[:80])
                    continue
                start, end = pos
                results.append({
                    "type": ctype,
                    "text": ctext,
                    "start_offset": start,
                    "end_offset": end,
                    "confidence": conf,
                })
            except Exception:
                logger.exception("Error normalizing clause entry: %r", c)
                continue
        logger.info("extract_clauses_from_file -> %d clauses mapped", len(results))
        return results

    def evaluate_laycan(self, nor_date: str, laycan_clause_text: str) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        prompt = (
            "You are a maritime chartering assistant.\n"
            "Given a Notice of Readiness (NOR) date and a charter party clause excerpt, "
            "1) extract the Laycan window (start and end dates),\n"
            "2) decide if the NOR is OUTSIDE the Laycan window,\n"
            "3) return a short one-sentence explanation.\n\n"
            "Return STRICT JSON only, no markdown, with schema:\n"
            "{\n  \"inconsistent\": true|false,\n  \"laycan_start\": string|null,\n  \"laycan_end\": string|null,\n  \"message\": string\n}\n\n"
            f"NOR date: {nor_date}\n\nClause excerpt:\n{laycan_clause_text}\n"
        )
        logger.info("Calling models.generate_content for evaluate_laycan")
        try:
            resp = self.client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
            raw_text = (getattr(resp, "text", "") or "").strip()
            logger.info("Model raw response for evaluate_laycan (truncated 500): %s", raw_text[:500])
            payload = self._extract_json(raw_text)
            if isinstance(payload, dict) and "inconsistent" in payload:
                out = {
                    "inconsistent": bool(payload.get("inconsistent", False)),
                    "laycan_start": payload.get("laycan_start"),
                    "laycan_end": payload.get("laycan_end"),
                    "message": (payload.get("message") or "").strip(),
                }
                logger.info("evaluate_laycan parsed: %r", out)
                return out
            raise ValueError("Gemini evaluate_laycan returned unexpected payload")
        except Exception:
            logger.exception("evaluate_laycan failed")
            raise

    def reason_alert(self, nor_date: str, laycan_start: Optional[str], laycan_end: Optional[str], clause_text: str) -> str:
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        prompt = (
            "You are a maritime chartering assistant. Given a Notice of Readiness (NOR) date and a Laycan window extracted from a charter party clause, explain in one short sentence whether the NOR is outside the Laycan window. Keep it factual.\n\n"
            f"NOR date: {nor_date}\n"
            f"Laycan start: {laycan_start}\n"
            f"Laycan end: {laycan_end}\n\n"
            "Clause excerpt:\n" + clause_text + "\n\n"
            "Respond with a single sentence."
        )
        logger.info("Calling models.generate_content for reason_alert")
        try:
            resp = self.client.models.generate_content(
                model="gemini-1.5-flash", contents=prompt
            )
            if hasattr(resp, "text") and resp.text:
                msg = resp.text.strip()
                logger.info("reason_alert text: %s", msg)
                return msg
            raise RuntimeError("Gemini reason_alert returned no text")
        except Exception:
            logger.exception("reason_alert failed")
            raise
