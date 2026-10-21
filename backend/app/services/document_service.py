import os
import io
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import logging

logger = logging.getLogger("kuizila_document")

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".docx", ".txt"}

class MaterialStore:
    """In-memory temporary storage for extracted learning materials."""
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def cleanup_expired(self, max_age_hours: int = 2):
        now = datetime.utcnow()
        expired = [
            m_id for m_id, item in self._store.items()
            if now - item.get("created_at", now) > timedelta(hours=max_age_hours)
        ]
        for m_id in expired:
            del self._store[m_id]

    def save_material(self, filename: str, text: str, meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self.cleanup_expired()
        material_id = str(uuid.uuid4())
        words = text.split()
        meta = meta or {}
        item = {
            "material_id": material_id,
            "filename": filename,
            "text": text,
            "character_count": len(text),
            "word_count": len(words),
            "unit_count": meta.get("unit_count", 0),
            "unit_label": meta.get("unit_label", "pages"),
            "page_count": meta.get("page_count"),
            "slide_count": meta.get("slide_count"),
            "created_at": datetime.utcnow()
        }
        self._store[material_id] = item
        return item

    def get_material(self, material_id: str) -> Optional[Dict[str, Any]]:
        self.cleanup_expired()
        return self._store.get(material_id)

    def delete_material(self, material_id: str) -> bool:
        if material_id in self._store:
            del self._store[material_id]
            return True
        return False

material_store = MaterialStore()

def clean_extracted_text(raw_text: str) -> str:
    """Cleans up raw extracted document text and removes excessive whitespace."""
    if not raw_text:
        return ""
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    lines = [line.strip() for line in text.split("\n")]
    result = []
    empty_count = 0
    for line in lines:
        if line:
            result.append(line)
            empty_count = 0
        else:
            empty_count += 1
            if empty_count <= 1:
                result.append("")
    return "\n".join(result).strip()

def extract_text_from_pdf(file_bytes: bytes) -> tuple:
    """Extracts text and page count from PDF using PyMuPDF (fitz)."""
    import fitz
    text_chunks = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        if getattr(doc, "is_encrypted", False):
            raise ValueError("This PDF document is password-protected. Please upload an unprotected file.")
        page_count = doc.page_count
        for page_idx, page in enumerate(doc, 1):
            page_text = page.get_text()
            if page_text and page_text.strip():
                text_chunks.append(f"[Page {page_idx}]\n{page_text.strip()}")
    finally:
        doc.close()
    return "\n\n".join(text_chunks), page_count

def extract_text_from_pptx(file_bytes: bytes) -> tuple:
    """Extracts text and slide count from PowerPoint PPTX presentation."""
    from pptx import Presentation
    prs = Presentation(io.BytesIO(file_bytes))
    slide_count = len(prs.slides)
    text_chunks = []
    for slide_idx, slide in enumerate(prs.slides, 1):
        slide_lines = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    line = paragraph.text.strip()
                    if line:
                        slide_lines.append(line)
        if slide_lines:
            text_chunks.append(f"[Slide {slide_idx}]\n" + "\n".join(slide_lines))
    return "\n\n".join(text_chunks), slide_count

def extract_text_from_ppt(file_bytes: bytes) -> tuple:
    """Extracts text from legacy binary PowerPoint PPT."""
    try:
        import olefile
        if olefile.isOleFile(io.BytesIO(file_bytes)):
            ole = olefile.OleFileIO(io.BytesIO(file_bytes))
            text_parts = []
            if ole.exists('PowerPoint Document'):
                stream = ole.openstream('PowerPoint Document')
                data = stream.read()
                words = re.findall(rb'[ -~]{4,}', data)
                text_parts.extend([w.decode('latin-1', errors='ignore').strip() for w in words if len(w.strip()) > 3])
            ole.close()
            if text_parts:
                return "\n".join(text_parts), 0
    except Exception as e:
        logger.warning(f"OLE extraction failed: {e}")

    words = re.findall(rb'[ -~]{4,}', file_bytes)
    return "\n".join([w.decode('latin-1', errors='ignore').strip() for w in words if len(w.strip()) > 3]), 0

def extract_text_from_docx(file_bytes: bytes) -> tuple:
    """Extracts text from Word DOCX."""
    import docx
    doc = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs), 0

def extract_document_text_and_meta(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Validates file format, size, and extracts cleaned text along with page/slide metadata from PDF, PPT, PPTX, or DOCX.
    Raises ValueError with descriptive user-facing message on validation failures.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("The uploaded file is empty.")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError("The uploaded file is too large. Please upload a file smaller than 20 MB.")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Please upload a PDF, DOCX, PPT, PPTX, or TXT file.")

    raw_text = ""
    unit_count = 0
    unit_label = "pages"
    try:
        if ext == ".pdf":
            raw_text, unit_count = extract_text_from_pdf(file_bytes)
            unit_label = "pages"
        elif ext == ".pptx":
            raw_text, unit_count = extract_text_from_pptx(file_bytes)
            unit_label = "slides"
        elif ext == ".ppt":
            raw_text, unit_count = extract_text_from_ppt(file_bytes)
            unit_label = "slides"
        elif ext == ".docx":
            raw_text, unit_count = extract_text_from_docx(file_bytes)
            unit_label = "sections"
        elif ext == ".txt":
            try:
                raw_text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raw_text = file_bytes.decode("latin-1", errors="replace")
            paragraphs = [p for p in raw_text.split("\n\n") if p.strip()]
            unit_count = max(1, len(paragraphs))
            unit_label = "paragraphs"
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        raise ValueError(f"We couldn't extract readable text from this file. Please verify the file is not corrupted or password-protected.")

    cleaned = clean_extracted_text(raw_text)
    if not cleaned or len(cleaned) < 30:
        raise ValueError("No readable text could be extracted from this file.")

    words = cleaned.split()
    return {
        "text": cleaned,
        "word_count": len(words),
        "character_count": len(cleaned),
        "unit_count": unit_count,
        "unit_label": unit_label,
        "page_count": unit_count if ext == ".pdf" else None,
        "slide_count": unit_count if ext in [".pptx", ".ppt"] else None
    }

def extract_document_text(filename: str, file_bytes: bytes) -> str:
    """Wrapper for backward compatibility."""
    res = extract_document_text_and_meta(filename, file_bytes)
    return res["text"]

def get_context_for_prompt(text: str, query: str = "", max_words: int = 2500) -> str:
    """
    Returns bounded text context to prevent exceeding model token limits.
    If text exceeds max_words, ranks paragraphs matching query terms or takes representative sample.
    """
    words = text.split()
    if len(words) <= max_words:
        return text

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return " ".join(words[:max_words])

    if query:
        query_terms = set(re.findall(r'\w+', query.lower()))
        scored = []
        for idx, p in enumerate(paragraphs):
            p_words = set(re.findall(r'\w+', p.lower()))
            overlap = len(query_terms.intersection(p_words))
            score = overlap * 10 - idx * 0.05
            scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        selected = []
        curr_words = 0
        for _, p in scored:
            p_len = len(p.split())
            if curr_words + p_len > max_words and selected:
                break
            selected.append(p)
            curr_words += p_len
        return "\n\n".join(selected)
    else:
        return " ".join(words[:max_words])
