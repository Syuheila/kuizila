from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from ..database import get_db
from ..models import QuizSession, Participant, ParticipantAnswer, Quiz, QuestionBank, User
from ..schemas import SessionReportResponse
from ..services.report_service import generate_session_report_data, export_session_csv
from .auth import require_admin_role, require_authenticated_user, get_optional_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/dashboard")
def get_dashboard_kpis(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if current_user:
        user_quizzes_query = db.query(Quiz).filter(Quiz.owner_id == current_user.id)
        user_sessions_query = db.query(QuizSession).filter(QuizSession.host_id == current_user.id)

        total_quizzes = user_quizzes_query.count()
        total_sessions = user_sessions_query.count()
        completed_sessions = user_sessions_query.filter(QuizSession.session_status == "completed").count()

        total_participants = (
            db.query(Participant)
            .join(QuizSession, Participant.session_id == QuizSession.id)
            .filter(QuizSession.host_id == current_user.id)
            .count()
        )

        participants = (
            db.query(Participant)
            .join(QuizSession, Participant.session_id == QuizSession.id)
            .filter(
                QuizSession.host_id == current_user.id,
                Participant.final_percentage > 0
            )
            .all()
        )
        avg_accuracy = (
            sum(p.final_percentage for p in participants) / len(participants)
            if participants else 0.0
        )

        recent_quizzes = user_quizzes_query.order_by(Quiz.created_at.desc()).limit(5).all()
        recent_sessions = user_sessions_query.order_by(QuizSession.created_at.desc()).limit(5).all()

        top_participants = (
            db.query(Participant)
            .join(QuizSession, Participant.session_id == QuizSession.id)
            .filter(QuizSession.host_id == current_user.id)
            .order_by(Participant.final_score.desc())
            .limit(5)
            .all()
        )
    else:
        total_quizzes = db.query(Quiz).count()
        total_sessions = db.query(QuizSession).count()
        completed_sessions = db.query(QuizSession).filter(QuizSession.session_status == "completed").count()
        total_participants = db.query(Participant).count()

        participants = db.query(Participant).filter(Participant.final_percentage > 0).all()
        avg_accuracy = (
            sum(p.final_percentage for p in participants) / len(participants)
            if participants else 0.0
        )

        recent_quizzes = db.query(Quiz).order_by(Quiz.created_at.desc()).limit(5).all()
        recent_sessions = db.query(QuizSession).order_by(QuizSession.created_at.desc()).limit(5).all()
        top_participants = db.query(Participant).order_by(Participant.final_score.desc()).limit(5).all()

    recent_list = []
    for q in recent_quizzes:
        recent_list.append({
            "id": q.id,
            "title": q.title,
            "category": q.category,
            "questions_count": len(q.quiz_questions),
            "usage_count": q.usage_count,
            "created_at": q.created_at.strftime("%Y-%m-%d")
        })

    session_list = []
    for s in recent_sessions:
        p_count = len(s.participants)
        session_list.append({
            "id": s.id,
            "session_code": s.session_code,
            "quiz_title": s.quiz.title if s.quiz else "Quiz",
            "category": s.quiz.category if s.quiz else "General",
            "status": s.session_status,
            "participant_count": p_count,
            "date": (s.started_at or s.created_at).strftime("%Y-%m-%d %H:%M")
        })

    top_list = [
        {
            "name": p.display_name,
            "score": p.final_score,
            "accuracy": p.final_percentage,
            "quiz_title": p.session.quiz.title if p.session and p.session.quiz else "Quiz"
        }
        for p in top_participants
    ]

    return {
        "kpis": {
            "total_quizzes": total_quizzes,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "total_participants": total_participants,
            "average_accuracy": round(avg_accuracy, 1)
        },
        "recent_quizzes": recent_list,
        "recent_sessions": session_list,
        "top_performers": top_list
    }

@router.get("/sessions/{session_id}", response_model=SessionReportResponse)
def get_session_report(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    try:
        report_data = generate_session_report_data(db, session_id)
        return report_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/sessions/{session_id}/csv")
def download_session_csv(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    try:
        report_data = generate_session_report_data(db, session_id)
        csv_content = export_session_csv(report_data)
        filename = f"kuizila_report_{report_data.get('session_code', 'session')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
