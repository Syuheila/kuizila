from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging
from ..database import get_db
from ..models import Quiz, QuestionBank, QuizQuestion, User
from ..schemas import (
    QuizCreate, QuizUpdate, QuizResponse, QuizDetailResponse, 
    QuestionResponse, QuizQuestionResponse, QuestionCreate, QuestionUpdate
)
from .auth import require_admin_role, require_authenticated_user, get_optional_user
from ..services.pdf_service import generate_quiz_pdf, sanitize_filename

logger = logging.getLogger("kuizila_quizzes")

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])

@router.get("", response_model=List[QuizResponse])
def list_quizzes(
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = Query("newest", pattern="^(newest|oldest|most_used|highest_score)$"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    query = db.query(Quiz)
    if current_user:
        query = query.filter(Quiz.owner_id == current_user.id)
    if search:
        query = query.filter(Quiz.title.ilike(f"%{search}%") | Quiz.description.ilike(f"%{search}%"))
    if category and category != "All":
        query = query.filter(Quiz.category == category)

    if sort_by == "oldest":
        query = query.order_by(Quiz.created_at.asc())
    elif sort_by == "most_used":
        query = query.order_by(Quiz.usage_count.desc())
    else:
        query = query.order_by(Quiz.created_at.desc())

    quizzes = query.all()
    res = []
    for q in quizzes:
        resp_item = QuizResponse.from_orm(q)
        resp_item.question_count = len(q.quiz_questions)
        res.append(resp_item)
    return res

@router.get("/{quiz_id}", response_model=QuizDetailResponse)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # build detail
    resp = QuizDetailResponse.from_orm(quiz)
    resp.question_count = len(quiz.quiz_questions)
    
    qq_list = []
    for qq in sorted(quiz.quiz_questions, key=lambda x: x.question_order):
        q_dict = QuizQuestionResponse(
            id=qq.id,
            quiz_id=qq.quiz_id,
            question_id=qq.question_id,
            question_order=qq.question_order,
            time_limit=qq.time_limit,
            points=qq.points,
            question=QuestionResponse.from_orm(qq.question) if qq.question else None
        )
        qq_list.append(q_dict)
    
    resp.quiz_questions = qq_list
    return resp

@router.post("", response_model=QuizDetailResponse)
def create_quiz(
    payload: QuizCreate,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    owner_id = current_user.id

    new_quiz = Quiz(
        owner_id=owner_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        instructions=payload.instructions,
        status=payload.status,
        visibility=payload.visibility,
        settings=payload.settings,
        usage_count=0
    )
    db.add(new_quiz)
    db.flush()

    order = 0
    # Add existing question IDs
    if payload.question_ids:
        for qid in payload.question_ids:
            q = db.query(QuestionBank).filter(QuestionBank.id == qid).first()
            if q:
                qq = QuizQuestion(
                    quiz_id=new_quiz.id,
                    question_id=q.id,
                    question_order=order,
                    time_limit=q.default_time_limit or 30,
                    points=q.default_points or 100
                )
                db.add(qq)
                order += 1

    # Add inline created questions
    if payload.inline_questions:
        for in_q in payload.inline_questions:
            correct_ans_val = in_q.correct_answer
            if not correct_ans_val and in_q.options:
                correct_list = [opt.text for opt in in_q.options if opt.is_correct]
                if correct_list:
                    correct_ans_val = ", ".join(correct_list)

            q_bank = QuestionBank(
                owner_id=owner_id,
                question_type=in_q.question_type,
                question_text=in_q.question_text,
                options=[opt.dict() for opt in in_q.options],
                correct_answer=correct_ans_val,
                explanation=in_q.explanation,
                category=in_q.category or payload.category,
                difficulty=in_q.difficulty,
                tags=in_q.tags,
                default_time_limit=in_q.default_time_limit,
                default_points=in_q.default_points
            )
            db.add(q_bank)
            db.flush()

            qq = QuizQuestion(
                quiz_id=new_quiz.id,
                question_id=q_bank.id,
                question_order=order,
                time_limit=in_q.default_time_limit,
                points=in_q.default_points
            )
            db.add(qq)
            order += 1

    db.commit()
    db.refresh(new_quiz)
    return get_quiz(new_quiz.id, db)

@router.put("/{quiz_id}", response_model=QuizDetailResponse)
def update_quiz(
    quiz_id: int,
    payload: QuizUpdate,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.owner_id and quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this quiz.")

    if payload.title is not None:
        quiz.title = payload.title
    if payload.description is not None:
        quiz.description = payload.description
    if payload.category is not None:
        quiz.category = payload.category
    if payload.instructions is not None:
        quiz.instructions = payload.instructions
    if payload.status is not None:
        quiz.status = payload.status
    if payload.visibility is not None:
        quiz.visibility = payload.visibility
    if payload.settings is not None:
        quiz.settings = payload.settings

    if payload.question_ids is not None or payload.inline_questions is not None:
        # Replace quiz questions
        db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).delete()
        order = 0
        if payload.question_ids:
            for qid in payload.question_ids:
                q = db.query(QuestionBank).filter(QuestionBank.id == qid).first()
                if q:
                    qq = QuizQuestion(
                        quiz_id=quiz.id,
                        question_id=q.id,
                        question_order=order,
                        time_limit=q.default_time_limit or 30,
                        points=q.default_points or 100
                    )
                    db.add(qq)
                    order += 1
        if payload.inline_questions:
            for in_q in payload.inline_questions:
                correct_ans_val = in_q.correct_answer
                if not correct_ans_val and in_q.options:
                    correct_list = [opt.text for opt in in_q.options if opt.is_correct]
                    if correct_list:
                        correct_ans_val = ", ".join(correct_list)

                q_bank = QuestionBank(
                    owner_id=current_user.id,
                    question_type=in_q.question_type,
                    question_text=in_q.question_text,
                    options=[opt.dict() for opt in in_q.options],
                    correct_answer=correct_ans_val,
                    explanation=in_q.explanation,
                    category=in_q.category or quiz.category or "General",
                    difficulty=in_q.difficulty or "medium",
                    tags=in_q.tags,
                    default_time_limit=in_q.default_time_limit or 30,
                    default_points=in_q.default_points or 100
                )
                db.add(q_bank)
                db.flush()

                qq = QuizQuestion(
                    quiz_id=quiz.id,
                    question_id=q_bank.id,
                    question_order=order,
                    time_limit=in_q.default_time_limit or 30,
                    points=in_q.default_points or 100
                )
                db.add(qq)
                order += 1

    quiz.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quiz)
    return get_quiz(quiz_id, db)

@router.get("/{quiz_id}/export-pdf")
def export_quiz_pdf(
    quiz_id: int,
    include_answers: bool = Query(False, description="Include correct answers and rationales (Answer Key)"),
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Security check: verify the logged-in trainer owns the quiz
    if quiz.owner_id and quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to export another trainer's quiz.")

    try:
        pdf_bytes = generate_quiz_pdf(quiz, include_answers=include_answers)
        filename = sanitize_filename(quiz.title, is_answer_key=include_answers)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.owner_id and quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this quiz.")
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully", "quiz_id": quiz_id}

@router.post("/{quiz_id}/duplicate", response_model=QuizDetailResponse)
def duplicate_quiz(
    quiz_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    original = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if original.owner_id and original.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to duplicate another trainer's quiz.")

    dup_quiz = Quiz(
        owner_id=current_user.id,
        title=f"{original.title} (Copy)",
        description=original.description,
        category=original.category,
        instructions=original.instructions,
        status="draft",
        visibility=original.visibility,
        settings=original.settings,
        usage_count=0
    )
    db.add(dup_quiz)
    db.flush()

    for qq in original.quiz_questions:
        new_qq = QuizQuestion(
            quiz_id=dup_quiz.id,
            question_id=qq.question_id,
            question_order=qq.question_order,
            time_limit=qq.time_limit,
            points=qq.points
        )
        db.add(new_qq)

    db.commit()
    db.refresh(dup_quiz)
    return get_quiz(dup_quiz.id, db)


@router.post("/{quiz_id}/questions", response_model=QuizDetailResponse)
def add_question_to_quiz(
    quiz_id: int,
    payload: QuestionCreate,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    correct_ans_val = payload.correct_answer
    if not correct_ans_val and payload.options:
        correct_list = [opt.text for opt in payload.options if opt.is_correct]
        if correct_list:
            correct_ans_val = ", ".join(correct_list)

    q_bank = QuestionBank(
        owner_id=current_user.id,
        question_type=payload.question_type,
        question_text=payload.question_text,
        options=[opt.dict() for opt in payload.options],
        correct_answer=correct_ans_val,
        explanation=payload.explanation,
        category=payload.category or quiz.category,
        difficulty=payload.difficulty,
        tags=payload.tags,
        default_time_limit=payload.default_time_limit,
        default_points=payload.default_points,
        usage_count=1
    )
    db.add(q_bank)
    db.flush()

    current_count = len(quiz.quiz_questions)
    qq = QuizQuestion(
        quiz_id=quiz.id,
        question_id=q_bank.id,
        question_order=current_count,
        time_limit=payload.default_time_limit or 30,
        points=payload.default_points or 100
    )
    db.add(qq)
    quiz.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quiz)
    return get_quiz(quiz_id, db)


@router.post("/{quiz_id}/questions/batch", response_model=QuizDetailResponse)
def add_batch_questions_to_quiz(
    quiz_id: int,
    questions: List[QuestionCreate],
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    current_count = len(quiz.quiz_questions)
    for idx, q_payload in enumerate(questions):
        correct_ans_val = q_payload.correct_answer
        if not correct_ans_val and q_payload.options:
            correct_list = [opt.text for opt in q_payload.options if opt.is_correct]
            if correct_list:
                correct_ans_val = ", ".join(correct_list)

        q_bank = QuestionBank(
            owner_id=current_user.id,
            question_type=q_payload.question_type,
            question_text=q_payload.question_text,
            options=[opt.dict() for opt in q_payload.options],
            correct_answer=correct_ans_val,
            explanation=q_payload.explanation,
            category=q_payload.category or quiz.category,
            difficulty=q_payload.difficulty,
            tags=q_payload.tags,
            default_time_limit=q_payload.default_time_limit,
            default_points=q_payload.default_points,
            usage_count=1
        )
        db.add(q_bank)
        db.flush()

        qq = QuizQuestion(
            quiz_id=quiz.id,
            question_id=q_bank.id,
            question_order=current_count + idx,
            time_limit=q_payload.default_time_limit or 30,
            points=q_payload.default_points or 100
        )
        db.add(qq)

    quiz.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quiz)
    return get_quiz(quiz_id, db)


@router.put("/{quiz_id}/questions/{question_id}", response_model=QuizDetailResponse)
def update_quiz_question(
    quiz_id: int,
    question_id: int,
    payload: QuestionUpdate,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    qq = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id,
        QuizQuestion.question_id == question_id
    ).first()
    if not qq:
        raise HTTPException(status_code=404, detail="Question not found in this quiz")

    q_bank = db.query(QuestionBank).filter(QuestionBank.id == question_id).first()
    if not q_bank:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.question_type is not None:
        q_bank.question_type = payload.question_type
    if payload.question_text is not None:
        q_bank.question_text = payload.question_text
    if payload.options is not None:
        q_bank.options = [opt.dict() for opt in payload.options]
    if payload.correct_answer is not None:
        q_bank.correct_answer = payload.correct_answer
    elif payload.options is not None:
        correct_list = [opt.text for opt in payload.options if opt.is_correct]
        if correct_list:
            q_bank.correct_answer = ", ".join(correct_list)
    if payload.explanation is not None:
        q_bank.explanation = payload.explanation
    if payload.category is not None:
        q_bank.category = payload.category
    if payload.difficulty is not None:
        q_bank.difficulty = payload.difficulty
    if payload.tags is not None:
        q_bank.tags = payload.tags
    if payload.default_time_limit is not None:
        q_bank.default_time_limit = payload.default_time_limit
        qq.time_limit = payload.default_time_limit
    if payload.default_points is not None:
        q_bank.default_points = payload.default_points
        qq.points = payload.default_points

    q_bank.updated_at = datetime.utcnow()
    quiz.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quiz)
    return get_quiz(quiz_id, db)


@router.delete("/{quiz_id}/questions/{question_id}")
def delete_quiz_question(
    quiz_id: int,
    question_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    qq = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id,
        QuizQuestion.question_id == question_id
    ).first()
    if not qq:
        raise HTTPException(status_code=404, detail="Question link not found in this quiz")

    db.delete(qq)

    # re-index remaining questions
    remaining = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.question_order.asc()).all()
    for idx, item in enumerate(remaining):
        item.question_order = idx

    quiz.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Question removed from quiz successfully", "quiz_id": quiz_id, "question_id": question_id}
