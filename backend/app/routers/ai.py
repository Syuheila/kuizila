from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..schemas import (
    AIGenerateRequest, AIImproveQuestionRequest,
    AISuggestTopicsRequest, AIPerformanceSummaryRequest,
    AIRegenerateQuestionRequest, AIQuizQualityCheckRequest,
    AIStudyGuideRequest, AIMaterialSummaryRequest,
    AIQuizInsightsRequest
)
from ..services.ai_service import (
    check_ollama_health, generate_quiz_ai, improve_question_ai,
    suggest_topics_ai, summarize_performance_ai,
    generate_questions_from_material_ai, chat_with_material_ai,
    regenerate_question_ai, check_quiz_quality_ai,
    generate_study_guide_ai, summarize_material_ai,
    generate_quiz_insights_ai
)
from ..config import OLLAMA_MODEL, OLLAMA_FALLBACK_MODEL
from ..services.document_service import extract_document_text, extract_document_text_and_meta, material_store
from ..services.report_service import generate_session_report_data
from ..models import QuizSession, User, Quiz, QuizQuestion, QuestionBank

class GenerateFromFileRequest(BaseModel):
    material_id: str
    num_questions: Optional[int] = 5
    difficulty: Optional[str] = "medium"
    model: Optional[str] = None

class ChatWithMaterialRequest(BaseModel):
    material_id: str
    message: str
    history: Optional[List[Dict[str, str]]] = None

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/health")
async def ai_health():
    health_info = await check_ollama_health()
    is_ready = bool(health_info.get("available") and (health_info.get("primary_ready") or health_info.get("fallback_ready")))
    active_primary = health_info.get("primary_model", OLLAMA_MODEL)
    active_fallback = health_info.get("fallback_model", OLLAMA_FALLBACK_MODEL)
    return {
        "status": "ready" if is_ready else "unavailable",
        "provider": "Kuizila AI Engine",
        "primary_model": active_primary,
        "fallback_model": active_fallback,
        "active": is_ready,
        "message": (
            f"Kuizila AI Engine is ready with {active_primary}."
            if is_ready
            else "AI services are currently initializing or unavailable. Please verify local Ollama is running."
        )
    }


@router.post("/generate-quiz")
async def generate_quiz_endpoint(payload: AIGenerateRequest, db: Session = Depends(get_db)):
    try:
        result = await generate_quiz_ai(
            topic=payload.topic,
            num_questions=payload.num_questions,
            difficulty=payload.difficulty,
            question_type=payload.question_type,
            context_text=payload.context_text,
            target_audience=payload.target_audience,
            language=payload.language,
            model_override=payload.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/improve-question")
async def improve_question_endpoint(payload: AIImproveQuestionRequest):
    try:
        return await improve_question_ai(
            question_text=payload.question_text,
            options=payload.options,
            correct_answer=payload.correct_answer,
            goal=payload.goal
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest-topics")
async def suggest_topics_endpoint(payload: AISuggestTopicsRequest):
    try:
        return await suggest_topics_ai(
            topic_or_context=payload.topic_or_context,
            num_topics=payload.num_topics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-performance")
async def analyze_performance_endpoint(payload: AIPerformanceSummaryRequest, db: Session = Depends(get_db)):
    try:
        report_data = generate_session_report_data(db, payload.session_id)
        stats_summary = {
            "total_participants": report_data.get("total_participants", 0),
            "average_score": report_data.get("average_score", 0),
            "average_accuracy": report_data.get("average_accuracy", 0),
            "top_questions": [
                q["question_text"] for q in report_data.get("questions_analytics", [])
                if q.get("accuracy_percentage", 0) >= 80
            ][:3],
            "weak_questions": [
                q["question_text"] for q in report_data.get("questions_analytics", [])
                if q.get("accuracy_percentage", 0) < 60
            ][:3]
        }
        return await summarize_performance_ai(
            quiz_title=report_data.get("quiz_title", "Session"),
            stats_summary=stats_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-material")
async def upload_material(file: UploadFile = File(...)):
    try:
        content = await file.read()
        extracted_data = extract_document_text_and_meta(file.filename, content)
        saved = material_store.save_material(file.filename, extracted_data["text"], extracted_data)
        preview = extracted_data["text"][:300] + ("..." if len(extracted_data["text"]) > 300 else "")
        return {
            "status": "success",
            "message": "Material processed successfully",
            "material_id": saved["material_id"],
            "filename": saved["filename"],
            "character_count": saved["character_count"],
            "word_count": saved["word_count"],
            "unit_count": saved.get("unit_count", 0),
            "unit_label": saved.get("unit_label", "pages"),
            "page_count": saved.get("page_count"),
            "slide_count": saved.get("slide_count"),
            "preview": preview
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")

@router.post("/generate-from-file")
async def generate_from_file_endpoint(payload: GenerateFromFileRequest):
    material = material_store.get_material(payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Please upload and process a learning material file first.")

    num_q = max(1, min(50, payload.num_questions or 5))
    diff = (payload.difficulty or "medium").lower()
    try:
        questions = await generate_questions_from_material_ai(
            material_text=material["text"],
            num_questions=num_q,
            difficulty=diff,
            model_override=payload.model
        )
        return {
            "status": "success",
            "material_id": payload.material_id,
            "filename": material["filename"],
            "questions_generated": len(questions),
            "difficulty": diff,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat-with-material")
async def chat_with_material_endpoint(payload: ChatWithMaterialRequest):
    material = material_store.get_material(payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Please upload and process a learning material file first.")

    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        reply = await chat_with_material_ai(
            material_text=material["text"],
            user_message=payload.message,
            recent_history=payload.history
        )
        return {
            "status": "success",
            "reply": reply,
            "response": reply,
            "material_id": payload.material_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/material/{material_id}")
async def delete_material_endpoint(material_id: str):
    deleted = material_store.delete_material(material_id)
    return {
        "status": "cleared" if deleted else "not_found",
        "deleted": deleted,
        "message": "Material cleared successfully."
    }

@router.get("/material/{material_id}")
async def get_material_status(material_id: str):
    material = material_store.get_material(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found or expired.")
    return {
        "status": "success",
        "material_id": material["material_id"],
        "filename": material["filename"],
        "character_count": material["character_count"],
        "word_count": material["word_count"],
        "unit_count": material.get("unit_count", 0),
        "unit_label": material.get("unit_label", "pages"),
        "page_count": material.get("page_count"),
        "slide_count": material.get("slide_count")
    }

@router.post("/regenerate-question")
async def regenerate_question_endpoint(payload: AIRegenerateQuestionRequest):
    try:
        material_context = None
        if payload.material_id:
            mat = material_store.get_material(payload.material_id)
            if mat:
                material_context = mat.get("text")

        return await regenerate_question_ai(
            question_text=payload.question_text,
            options=payload.options,
            correct_answer=payload.correct_answer,
            material_context=material_context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-quiz-quality")
async def check_quiz_quality_endpoint(payload: AIQuizQualityCheckRequest):
    try:
        material_context = None
        if payload.material_id:
            mat = material_store.get_material(payload.material_id)
            if mat:
                material_context = mat.get("text")

        return await check_quiz_quality_ai(
            questions=payload.questions,
            quiz_title=payload.quiz_title or "Quiz",
            material_context=material_context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/study-guide")
async def generate_study_guide_endpoint(payload: AIStudyGuideRequest):
    material = material_store.get_material(payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Please upload and process a learning material file first.")
    try:
        return await generate_study_guide_ai(
            material_text=material["text"],
            filename=material["filename"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize-material")
async def summarize_material_endpoint(payload: AIMaterialSummaryRequest):
    material = material_store.get_material(payload.material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Please upload and process a learning material file first.")
    try:
        return await summarize_material_ai(
            material_text=material["text"],
            mode=payload.mode or "short",
            filename=material["filename"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz-insights")
async def get_quiz_insights_endpoint(payload: AIQuizInsightsRequest, db: Session = Depends(get_db)):
    try:
        return await generate_quiz_insights_ai(
            session_id=payload.session_id,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

