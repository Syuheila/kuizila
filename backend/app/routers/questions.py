from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import QuestionBank, User
from ..schemas import QuestionCreate, QuestionUpdate, QuestionResponse

router = APIRouter(prefix="/api/questions", tags=["questions"])

@router.get("", response_model=List[QuestionResponse])
def list_questions(
    search: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(QuestionBank)
    if search:
        query = query.filter(QuestionBank.question_text.ilike(f"%{search}%"))
    if category and category != "All":
        query = query.filter(QuestionBank.category == category)
    if difficulty and difficulty != "All":
        query = query.filter(QuestionBank.difficulty == difficulty)
    if question_type and question_type != "All":
        query = query.filter(QuestionBank.question_type == question_type)
    if tag:
        query = query.filter(QuestionBank.tags.ilike(f"%{tag}%"))

    questions = query.order_by(QuestionBank.created_at.desc()).all()
    return [QuestionResponse.from_orm(q) for q in questions]

@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    rows = db.query(QuestionBank.category).distinct().all()
    categories = [r[0] for r in rows if r[0]]
    if "General" not in categories:
        categories.append("General")
    return sorted(list(set(categories)))

@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return QuestionResponse.from_orm(question)

@router.post("", response_model=QuestionResponse)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db)):
    owner = db.query(User).filter(User.role == "owner").first()
    owner_id = owner.id if owner else None

    question = QuestionBank(
        owner_id=owner_id,
        question_type=payload.question_type,
        question_text=payload.question_text,
        options=[opt.dict() for opt in payload.options],
        correct_answer=payload.correct_answer,
        explanation=payload.explanation,
        category=payload.category,
        difficulty=payload.difficulty,
        tags=payload.tags,
        default_time_limit=payload.default_time_limit,
        default_points=payload.default_points,
        usage_count=0
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return QuestionResponse.from_orm(question)

@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db)):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.question_type is not None:
        question.question_type = payload.question_type
    if payload.question_text is not None:
        question.question_text = payload.question_text
    if payload.options is not None:
        question.options = [opt.dict() for opt in payload.options]
    if payload.correct_answer is not None:
        question.correct_answer = payload.correct_answer
    if payload.explanation is not None:
        question.explanation = payload.explanation
    if payload.category is not None:
        question.category = payload.category
    if payload.difficulty is not None:
        question.difficulty = payload.difficulty
    if payload.tags is not None:
        question.tags = payload.tags
    if payload.default_time_limit is not None:
        question.default_time_limit = payload.default_time_limit
    if payload.default_points is not None:
        question.default_points = payload.default_points

    question.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(question)
    return QuestionResponse.from_orm(question)

@router.delete("/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    question = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    return {"message": "Question deleted successfully", "question_id": question_id}

@router.post("/{question_id}/duplicate", response_model=QuestionResponse)
def duplicate_question(question_id: int, db: Session = Depends(get_db)):
    orig = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Question not found")

    dup = QuestionBank(
        owner_id=orig.owner_id,
        question_type=orig.question_type,
        question_text=f"{orig.question_text} (Copy)",
        options=orig.options,
        correct_answer=orig.correct_answer,
        explanation=orig.explanation,
        category=orig.category,
        difficulty=orig.difficulty,
        tags=orig.tags,
        default_time_limit=orig.default_time_limit,
        default_points=orig.default_points,
        usage_count=0
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)
    return QuestionResponse.from_orm(dup)
