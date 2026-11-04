from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random
import string
from ..database import get_db
from ..models import QuizSession, Quiz, Participant, ParticipantAnswer, QuestionBank, QuizQuestion, User
from ..schemas import SessionCreate, SessionStateResponse, ParticipantResponse
from ..websocket.manager import ws_manager
from .auth import require_admin_role, require_authenticated_user, get_optional_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

def verify_session_host(session: QuizSession, user: User):
    """Ensures only the creator/host of the session or an admin can manage the live game."""
    if session.host_id and session.host_id != user.id and user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Only the designated session host can manage this live quiz."
        )


def generate_session_code() -> str:
    """Generates a random 6-character uppercase alphanumeric code."""
    chars = string.ascii_uppercase + "23456789"  # avoid 0, 1, O, I confusion
    return "".join(random.choices(chars, k=6))

def build_session_state(session: QuizSession, include_answers: bool = False) -> Dict[str, Any]:
    quiz = session.quiz
    quiz_questions = sorted(quiz.quiz_questions, key=lambda x: x.question_order) if quiz else []
    total_q = len(quiz_questions)

    curr_q_data = None
    remaining_secs = 0
    question_started_at_iso = session.current_question_started_at.isoformat() if session.current_question_started_at else None
    question_ends_at_iso = None
    server_time_iso = datetime.utcnow().isoformat()

    if session.session_status in ["active", "question_review"] and 0 <= session.current_question_index < total_q:
        qq = quiz_questions[session.current_question_index]
        q = qq.question
        time_limit = qq.time_limit or 30

        if session.current_question_started_at:
            ends_at_dt = session.current_question_started_at + timedelta(seconds=time_limit)
            question_ends_at_iso = ends_at_dt.isoformat()
            elapsed = (datetime.utcnow() - session.current_question_started_at).total_seconds()
            remaining_secs = max(0, int(time_limit - elapsed))
        else:
            remaining_secs = time_limit

        # If question_review or include_answers, show correct answers. Otherwise hide!
        show_correct = (session.session_status == "question_review") or include_answers
        options_clean = []
        for opt in (q.options or []):
            opt_copy = {"id": opt.get("id"), "text": opt.get("text")}
            if show_correct:
                opt_copy["is_correct"] = opt.get("is_correct", False)
            options_clean.append(opt_copy)

        curr_q_data = {
            "question_id": q.id,
            "question_index": session.current_question_index,
            "question_type": q.question_type,
            "question_text": q.question_text,
            "options": options_clean,
            "difficulty": q.difficulty,
            "time_limit": time_limit,
            "points": qq.points or 100,
            "question_started_at": question_started_at_iso,
            "question_ends_at": question_ends_at_iso,
            "remaining_seconds": remaining_secs,
            "server_time": server_time_iso,
            "explanation": q.explanation if show_correct else None,
            "correct_answer": q.correct_answer if show_correct else None
        }

    participants_list = [
        {
            "id": p.id,
            "session_id": p.session_id,
            "display_name": p.display_name,
            "connection_status": p.connection_status,
            "status": p.status or ("answering" if session.session_status == "active" else "waiting"),
            "current_question_index": p.current_question_index or 0,
            "final_score": p.final_score or 0,
            "final_percentage": p.final_percentage or 0.0,
            "final_rank": p.final_rank or 0,
            "streak_count": p.streak_count or 0,
            "joined_at": p.joined_at.isoformat() if p.joined_at else None
        }
        for p in sorted(session.participants, key=lambda x: x.final_score or 0, reverse=True)
    ]

    answering_count = sum(1 for p in session.participants if getattr(p, "status", None) == "answering")
    completed_count = sum(1 for p in session.participants if getattr(p, "status", None) == "completed")
    waiting_count = sum(1 for p in session.participants if getattr(p, "status", None) in [None, "waiting"])

    return {
        "id": session.id,
        "quiz_id": session.quiz_id,
        "quiz_title": quiz.title if quiz else "Quiz",
        "session_code": session.session_code,
        "session_status": session.session_status,
        "current_question_index": session.current_question_index,
        "total_questions": total_q,
        "current_question": curr_q_data,
        "question_started_at": question_started_at_iso,
        "question_ends_at": question_ends_at_iso,
        "remaining_seconds": remaining_secs,
        "server_time": server_time_iso,
        "participant_count": len(session.participants),
        "answering_count": answering_count,
        "completed_count": completed_count,
        "waiting_count": waiting_count,
        "participants": participants_list,
        "settings": quiz.settings if quiz else {}
    }

@router.get("")
def list_sessions(
    status: Optional[str] = "all",
    limit: int = 50,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    query = db.query(QuizSession)
    if current_user:
        query = query.filter(QuizSession.host_id == current_user.id)
    if status == "active":
        query = query.filter(QuizSession.session_status.in_(["active", "question_review"]))
    elif status == "waiting":
        query = query.filter(QuizSession.session_status == "waiting")
    elif status == "completed":
        query = query.filter(QuizSession.session_status == "completed")

    sessions = query.order_by(QuizSession.created_at.desc()).limit(limit).all()
    result = []
    for s in sessions:
        quiz = s.quiz
        total_q = len(quiz.quiz_questions) if (quiz and quiz.quiz_questions) else 0
        result.append({
            "id": s.id,
            "session_code": s.session_code,
            "quiz_id": s.quiz_id,
            "quiz_title": quiz.title if quiz else "Quiz",
            "category": quiz.category if quiz else "General",
            "session_status": s.session_status,
            "participant_count": len(s.participants),
            "current_question_index": s.current_question_index,
            "total_questions": total_q,
            "started_at": s.started_at.strftime("%b %d, %H:%M") if s.started_at else None,
            "created_at": s.created_at.strftime("%b %d, %Y") if s.created_at else None
        })
    return result

@router.post("", response_model=Dict[str, Any])
def create_session(
    payload: SessionCreate,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if not quiz.quiz_questions:
        raise HTTPException(status_code=400, detail="Cannot start a session with a quiz that has no questions")

    # Generate unique code
    for _ in range(10):
        code = generate_session_code()
        if not db.query(QuizSession).filter(QuizSession.session_code == code).first():
            break

    host_id = current_user.id

    if payload.settings_override:
        settings = dict(quiz.settings or {})
        settings.update(payload.settings_override)
        quiz.settings = settings

    quiz.usage_count = (quiz.usage_count or 0) + 1

    session = QuizSession(
        quiz_id=quiz.id,
        host_id=host_id,
        session_code=code,
        session_status="waiting",
        current_question_index=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return build_session_state(session, include_answers=True)

@router.get("/live-activity")
def get_live_activity(db: Session = Depends(get_db)):
    """Public telemetry endpoint for active sessions."""
    active_statuses = ["waiting", "active", "question_review", "leaderboard"]
    active_sessions = db.query(QuizSession).filter(QuizSession.session_status.in_(active_statuses)).all()

    if not active_sessions:
        return {
            "has_active_sessions": False,
            "active_sessions_count": 0,
            "active_participants_count": 0,
            "sessions": [],
            "live_leaderboard": []
        }

    sessions_data = []
    total_participants = 0
    all_participants = []

    for s in active_sessions:
        quiz = s.quiz
        p_count = len(s.participants)
        total_participants += p_count
        total_q = len(quiz.quiz_questions) if (quiz and quiz.quiz_questions) else 0

        sessions_data.append({
            "session_id": s.id,
            "session_code": s.session_code,
            "quiz_title": quiz.title if quiz else "Live Quiz",
            "category": quiz.category if quiz else "General",
            "session_status": s.session_status,
            "current_question_index": s.current_question_index,
            "total_questions": total_q,
            "participant_count": p_count,
            "started_at": s.started_at.strftime("%H:%M") if s.started_at else None
        })

        for p in s.participants:
            all_participants.append({
                "id": p.id,
                "display_name": p.display_name,
                "score": p.final_score or 0,
                "streak": p.streak_count or 0,
                "session_code": s.session_code,
                "quiz_title": quiz.title if quiz else "Quiz"
            })

    all_participants.sort(key=lambda x: x["score"], reverse=True)
    live_leaderboard = all_participants[:10]

    return {
        "has_active_sessions": True,
        "active_sessions_count": len(active_sessions),
        "active_participants_count": total_participants,
        "sessions": sessions_data,
        "live_leaderboard": live_leaderboard
    }

@router.get("/code/{session_code}/validate")
def validate_session_code(session_code: str, db: Session = Depends(get_db)):
    code = session_code.strip().upper()
    session = db.query(QuizSession).filter(QuizSession.session_code == code).first()
    if not session:
        return {
            "valid": False,
            "message": "Quiz session not found. Please check the PIN and try again."
        }
    if session.session_status == "completed":
        return {
            "valid": False,
            "message": "This quiz session has already concluded.",
            "session_status": session.session_status
        }
    return {
        "valid": True,
        "session_id": session.id,
        "session_code": session.session_code,
        "session_status": session.session_status,
        "quiz_title": session.quiz.title if session.quiz else "Quiz",
        "category": session.quiz.category if session.quiz else "General",
        "participant_count": len(session.participants)
    }

@router.get("/code/{session_code}")
def get_session_by_code(session_code: str, db: Session = Depends(get_db)):
    code = session_code.strip().upper()
    session = db.query(QuizSession).filter(QuizSession.session_code == code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found with this code")
    return build_session_state(session, include_answers=False)

@router.get("/{session_id}")
def get_session(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_host(session, current_user)
    return build_session_state(session, include_answers=True)

@router.post("/{session_id}/start")
async def start_session(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_host(session, current_user)

    session.session_status = "active"
    now = datetime.utcnow()
    session.started_at = now
    session.current_question_index = 0
    session.current_question_started_at = now

    for p in session.participants:
        p.status = "answering"
        p.current_question_index = 0
        p.current_question_started_at = now

    db.commit()
    db.refresh(session)

    state = build_session_state(session, include_answers=False)
    await ws_manager.broadcast_to_room(session.session_code, {
        "event": "SESSION_STARTED",
        "data": state
    })
    return state

@router.post("/{session_id}/review-question")
async def review_question(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_host(session, current_user)

    session.session_status = "question_review"
    db.commit()
    db.refresh(session)

    state = build_session_state(session, include_answers=True)
    await ws_manager.broadcast_to_room(session.session_code, {
        "event": "QUESTION_REVIEW",
        "data": state
    })
    return state

@router.post("/{session_id}/show-leaderboard")
async def show_leaderboard(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_host(session, current_user)

    session.session_status = "leaderboard"
    db.commit()
    db.refresh(session)

    participants = db.query(Participant).filter(Participant.session_id == session_id).all()
    sorted_p = sorted(participants, key=lambda x: x.final_score, reverse=True)
    standings = []
    for rank, p in enumerate(sorted_p, 1):
        standings.append({
            "rank": rank,
            "participant_id": p.id,
            "display_name": p.display_name,
            "score": p.final_score,
            "streak": p.streak_count
        })

    state = build_session_state(session, include_answers=False)
    await ws_manager.broadcast_to_room(session.session_code, {
        "event": "SHOW_LEADERBOARD",
        "data": {
            "standings": standings,
            "state": state
        }
    })
    return {"standings": standings}

@router.post("/{session_id}/next-question")
async def next_question(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_host(session, current_user)

    quiz_questions = session.quiz.quiz_questions if session.quiz else []
    next_idx = session.current_question_index + 1

    if next_idx >= len(quiz_questions):
        return await end_session(session_id, current_user, db)

    session.current_question_index = next_idx
    session.session_status = "active"
    session.current_question_started_at = datetime.utcnow()
    db.commit()
    db.refresh(session)

    state = build_session_state(session, include_answers=False)
    await ws_manager.broadcast_to_room(session.session_code, {
        "event": "NEXT_QUESTION",
        "data": state
    })
    return state

@router.post("/{session_id}/end")
async def end_session(
    session_id: int,
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_host(session, current_user)

    session.session_status = "completed"
    session.ended_at = datetime.utcnow()

    participants = db.query(Participant).filter(Participant.session_id == session_id).all()
    quiz = session.quiz
    sorted_p = sorted(participants, key=lambda x: x.final_score, reverse=True)

    for rank, p in enumerate(sorted_p, 1):
        p.final_rank = rank
        correct_count = db.query(ParticipantAnswer).filter(
            ParticipantAnswer.participant_id == p.id,
            ParticipantAnswer.session_id == session_id,
            ParticipantAnswer.is_correct == True
        ).count()
        total_q_count = len(quiz.quiz_questions) if (quiz and quiz.quiz_questions) else 1
        p.final_percentage = round((correct_count / max(1, total_q_count)) * 100, 1)
        p.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(session)

    state = build_session_state(session, include_answers=True)
    await ws_manager.broadcast_to_room(session.session_code, {
        "event": "SESSION_COMPLETED",
        "data": state
    })
    return state
