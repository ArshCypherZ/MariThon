#!/usr/bin/env python3
import os
import sys
import json
from dotenv import load_dotenv

# Load env vars from a local .env if present
load_dotenv()

# Robust import for running either as `python -m app.test_gemini` or `python app/test_gemini.py`
try:
    from app.services.gemini import GeminiClient  # type: ignore
except Exception:
    try:
        # When running from backend/ with script path = backend/app
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from services.gemini import GeminiClient  # type: ignore
    except Exception as e:
        print("Import error:", e, file=sys.stderr)
        sys.exit(99)


def main():
    api = os.getenv("GEMINI_API_KEY")
    if not api:
        print("GEMINI_API_KEY not set in environment", file=sys.stderr)
        sys.exit(1)

    g = GeminiClient(api_key=api)
    if not getattr(g, "client", None):
        print("Gemini client not initialized (SDK not available or invalid API key)", file=sys.stderr)
        sys.exit(2)

    print("[1/3] Testing basic generate_content …", flush=True)
    try:
        resp = g.client.models.generate_content(model="gemini-1.5-flash", contents="Reply with: OK")
        print("Model response:", (getattr(resp, "text", "") or "").strip())
    except Exception as e:
        print("generate_content failed:", repr(e), file=sys.stderr)
        sys.exit(3)

    # File-based extraction using Gemini Files API
    print("[2/3] Listing files and testing upload …", flush=True)
    try:
        files_before = g.list_files()
        print("Existing files:")
        print(json.dumps(files_before, indent=2))
    except Exception as e:
        print("list_files failed:", repr(e), file=sys.stderr)

    try:
        here = os.path.dirname(__file__)
        demo_path = os.path.abspath(os.path.join(here, "..", "storage", "demo_charter.txt"))
        if not os.path.exists(demo_path):
            print("Demo file not found:", demo_path, file=sys.stderr)
            sys.exit(6)
        uploaded = g.upload_file(demo_path)
        print("Uploaded object:", repr(uploaded))
        file_uri, mime_type = g.get_file_ref(uploaded, default_mime="text/plain")
        print("Resolved file_ref:", file_uri, "mime:", mime_type)
        if not file_uri:
            # Try resolving by name if only name exists
            name = getattr(uploaded, "name", None) or getattr(getattr(uploaded, "file", None) or object(), "name", None)
            if name:
                meta = g.get_file(name)
                print("Fetched by name:", json.dumps(meta, indent=2))
                file_uri = (meta or {}).get("uri") or (meta or {}).get("name")
                mime_type = (meta or {}).get("mime_type") or mime_type
        if not file_uri:
            print("Upload failed or returned no file reference", file=sys.stderr)
            sys.exit(7)
    except Exception as e:
        print("upload/get_file_ref failed:", repr(e), file=sys.stderr)
        sys.exit(8)

    print("[3/3] Extracting clauses from uploaded file …", flush=True)
    try:
        with open(demo_path, "r", encoding="utf-8", errors="ignore") as f:
            demo_text = f.read()
        clauses = g.extract_clauses_from_file(file_uri, mime_type, demo_text)
        print(json.dumps(clauses, indent=2))
        if not clauses:
            print("No clauses returned by model.")
    except Exception as e:
        print("extract_clauses_from_file failed:", repr(e), file=sys.stderr)
        sys.exit(9)


if __name__ == "__main__":
    main()
