from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..database import get_db
from ..models import QuizSession, Participant, ParticipantAnswer, QuestionBank, QuizQuestion
from ..schemas import SessionJoinRequest, AnswerSubmitRequest, AnswerSubmitResponse, ParticipantResponse
from ..services.scoring_service import evaluate_answer
from ..websocket.manager import ws_manager

router = APIRouter(prefix="/api/participants", tags=["participants"])

def format_participant_question(q: QuestionBank, qq: QuizQuestion, index: int, total_q: int, remaining_seconds: int, started_at_iso: str) -> Dict[str, Any]:
    options_clean = []
    for opt in (q.options or []):
        options_clean.append({
            "id": opt.get("id"),
            "text": opt.get("text")
        })
    time_limit = qq.time_limit or q.default_time_limit or 30
    return {
        "question_id": q.id,
        "question_index": index,
        "total_questions": total_q,
        "question_type": q.question_type,
        "question_text": q.question_text,
        "options": options_clean,
        "difficulty": q.difficulty,
        "time_limit": time_limit,
        "points": qq.points or q.default_points or 100,
        "question_started_at": started_at_iso,
        "remaining_seconds": max(0, remaining_seconds),
        "server_time": datetime.utcnow().isoformat()
    }

@router.post("/join")
async def join_session(payload: SessionJoinRequest, db: Session = Depends(get_db)):
    code = payload.session_code.strip().upper()
    display_name = payload.display_name.strip()

    if not display_name:
        raise HTTPException(status_code=400, detail="Display name is required")

    session = db.query(QuizSession).filter(QuizSession.session_code == code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid quiz code. Please verify the 6-character code.")

    if session.session_status == "completed":
        raise HTTPException(status_code=400, detail="This quiz session has already ended.")

    # Check if participant with this display name already exists in this session
    existing = db.query(Participant).filter(
        Participant.session_id == session.id,
        Participant.display_name.ilike(display_name)
    ).first()

    now = datetime.utcnow()
    initial_status = "answering" if session.session_status == "active" else "waiting"

    if existing:
        participant = existing
        participant.connection_status = "online"
        if session.session_status == "active" and (not participant.status or participant.status == "waiting"):
            participant.status = "answering"
            participant.current_question_index = 0
            participant.current_question_started_at = now
    else:
        participant = Participant(
            session_id=session.id,
            display_name=display_name,
            connection_status="online",
            status=initial_status,
            current_question_index=0,
            current_question_started_at=now if initial_status == "answering" else None,
            final_score=0,
            final_percentage=0.0,
            final_rank=0,
            streak_count=0
        )
        db.add(participant)

    db.commit()
    db.refresh(participant)

    # Broadcast participant joined event
    await ws_manager.broadcast_to_room(code, {
        "event": "PARTICIPANT_JOINED",
        "data": {
            "id": participant.id,
            "session_id": participant.session_id,
            "display_name": participant.display_name,
            "connection_status": participant.connection_status,
            "status": participant.status,
            "final_score": participant.final_score
        }
    })

    return {
        "id": participant.id,
        "participant_id": participant.id,
        "session_id": participant.session_id,
        "display_name": participant.display_name,
        "session_code": code,
        "quiz_id": session.quiz_id,
        "quiz_title": session.quiz.title if session.quiz else "Quiz",
        "session_status": session.session_status,
        "status": participant.status,
        "current_question_index": participant.current_question_index or 0
    }

@router.get("/{participant_id}/state")
def get_participant_state(participant_id: int, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    session = participant.session
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    quiz = session.quiz
    quiz_questions = sorted(quiz.quiz_questions, key=lambda x: x.question_order) if (quiz and quiz.quiz_questions) else []
    total_q = len(quiz_questions)
    now = datetime.utcnow()

    # Session completed
    if session.session_status == "completed":
        participant.status = "completed"
        if not participant.completed_at:
            participant.completed_at = now
        db.commit()

    # Session waiting
    if session.session_status == "waiting":
        return {
            "status": "waiting",
            "session_id": session.id,
            "session_code": session.session_code,
            "session_status": "waiting",
            "quiz_title": quiz.title if quiz else "Quiz",
            "participant_id": participant.id,
            "display_name": participant.display_name,
            "score": participant.final_score or 0,
            "streak": participant.streak_count or 0,
            "total_questions": total_q
        }

    # If session is active and participant was waiting, transition to answering
    if session.session_status in ["active", "question_review", "leaderboard"] and (not participant.status or participant.status == "waiting"):
        participant.status = "answering"
        participant.current_question_index = 0
        participant.current_question_started_at = now
        db.commit()
        db.refresh(participant)

    # If participant is completed
    if participant.status == "completed" or (participant.current_question_index is not None and participant.current_question_index >= total_q):
        participant.status = "completed"
        if not participant.completed_at:
            participant.completed_at = now

        # Recalculate rank & percentage
        all_p = sorted(session.participants, key=lambda p: p.final_score or 0, reverse=True)
        for r, p in enumerate(all_p, 1):
            p.final_rank = r

        correct_count = db.query(ParticipantAnswer).filter(
            ParticipantAnswer.participant_id == participant.id,
            ParticipantAnswer.session_id == session.id,
            ParticipantAnswer.is_correct == True
        ).count()
        participant.final_percentage = round((correct_count / max(1, total_q)) * 100, 1)
        db.commit()

        return {
            "status": "completed",
            "session_id": session.id,
            "session_code": session.session_code,
            "session_status": session.session_status,
            "quiz_title": quiz.title if quiz else "Quiz",
            "participant_id": participant.id,
            "display_name": participant.display_name,
            "final_score": participant.final_score or 0,
            "final_percentage": participant.final_percentage or 0.0,
            "final_rank": participant.final_rank or 1,
            "streak_count": participant.streak_count or 0,
            "total_questions": total_q,
            "correct_count": correct_count
        }

    # Participant is actively answering
    curr_idx = participant.current_question_index or 0
    if curr_idx >= total_q:
        participant.status = "completed"
        participant.completed_at = now
        db.commit()
        return get_participant_state(participant_id, db)

    qq = quiz_questions[curr_idx]
    q = qq.question
    time_limit = qq.time_limit or q.default_time_limit or 30

    if not participant.current_question_started_at:
        participant.current_question_started_at = now
        db.commit()

    elapsed = (now - participant.current_question_started_at).total_seconds()

    # If participant's server timer has already completely expired (e.g., closed tab/reconnected late):
    # Auto-advance past expired questions
    while elapsed >= (time_limit + 1.0) and curr_idx < total_q:
        # Record timeout answer
        existing_ans = db.query(ParticipantAnswer).filter(
            ParticipantAnswer.session_id == session.id,
            ParticipantAnswer.participant_id == participant.id,
            ParticipantAnswer.question_id == q.id
        ).first()
        if not existing_ans:
            db.add(ParticipantAnswer(
                session_id=session.id,
                participant_id=participant.id,
                question_id=q.id,
                selected_answer=None,
                is_correct=False,
                points_earned=0,
                response_time_seconds=float(time_limit),
                answered_at=now
            ))
        participant.streak_count = 0
        curr_idx += 1
        participant.current_question_index = curr_idx
        participant.current_question_started_at = now
        db.commit()

        if curr_idx >= total_q:
            participant.status = "completed"
            participant.completed_at = now
            db.commit()
            return get_participant_state(participant_id, db)

        qq = quiz_questions[curr_idx]
        q = qq.question
        time_limit = qq.time_limit or q.default_time_limit or 30
        elapsed = (datetime.utcnow() - participant.current_question_started_at).total_seconds()

    remaining_secs = max(0, int(time_limit - elapsed))
    q_data = format_participant_question(
        q=q,
        qq=qq,
        index=curr_idx,
        total_q=total_q,
        remaining_seconds=remaining_secs,
        started_at_iso=participant.current_question_started_at.isoformat()
    )

    return {
        "status": "answering",
        "session_id": session.id,
        "session_code": session.session_code,
        "session_status": session.session_status,
        "quiz_title": quiz.title if quiz else "Quiz",
        "participant_id": participant.id,
        "display_name": participant.display_name,
        "score": participant.final_score or 0,
        "streak": participant.streak_count or 0,
        "current_question_index": curr_idx,
        "total_questions": total_q,
        "question": q_data,
        "remaining_seconds": remaining_secs,
        "server_time": datetime.utcnow().isoformat()
    }

async def process_answer_submission(payload: AnswerSubmitRequest, db: Session):
    session = db.query(QuizSession).filter(QuizSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.session_status not in ["active", "question_review", "leaderboard"]:
        raise HTTPException(status_code=400, detail="Quiz session is not currently accepting answers")

    participant = db.query(Participant).filter(
        Participant.id == payload.participant_id,
        Participant.session_id == payload.session_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    if participant.status == "completed":
        raise HTTPException(status_code=400, detail="Participant has already completed the quiz")

    question = db.query(QuestionBank).filter(QuestionBank.id == payload.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    quiz_q = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == session.quiz_id,
        QuizQuestion.question_id == payload.question_id
    ).first()

    base_points = quiz_q.points if quiz_q else (question.default_points or 100)
    time_limit = quiz_q.time_limit if quiz_q else (question.default_time_limit or 30)
    now = datetime.utcnow()

    # Determine response time and check if timed out on server
    if participant.current_question_started_at:
        elapsed = (now - participant.current_question_started_at).total_seconds()
    else:
        elapsed = payload.response_time_seconds

    # Server-authoritative timer check (with 4s network latency tolerance)
    is_timed_out = elapsed > (time_limit + 4.0) or payload.selected_answer is None

    if is_timed_out:
        is_correct = False
        points_earned = 0
        new_streak = 0
        resp_time = float(time_limit)
    else:
        resp_time = max(0.1, min(payload.response_time_seconds or elapsed, float(time_limit)))
        is_correct, points_earned, new_streak = evaluate_answer(
            question_type=question.question_type,
            options=question.options or [],
            correct_answer_text=question.correct_answer,
            selected_answer=payload.selected_answer,
            base_points=base_points,
            time_limit=time_limit,
            response_time=resp_time,
            current_streak=participant.streak_count or 0,
            enable_speed_bonus=True
        )

    # Record or update ParticipantAnswer
    existing_answer = db.query(ParticipantAnswer).filter(
        ParticipantAnswer.session_id == session.id,
        ParticipantAnswer.participant_id == participant.id,
        ParticipantAnswer.question_id == question.id
    ).first()

    if existing_answer:
        participant.final_score = max(0, (participant.final_score or 0) - existing_answer.points_earned)
        existing_answer.selected_answer = payload.selected_answer
        existing_answer.is_correct = is_correct
        existing_answer.points_earned = points_earned
        existing_answer.response_time_seconds = resp_time
        existing_answer.answered_at = now
    else:
        answer_rec = ParticipantAnswer(
            session_id=session.id,
            participant_id=participant.id,
            question_id=question.id,
            selected_answer=payload.selected_answer,
            is_correct=is_correct,
            points_earned=points_earned,
            response_time_seconds=resp_time,
            answered_at=now
        )
        db.add(answer_rec)

    db.flush()
    participant.final_score = (participant.final_score or 0) + points_earned
    participant.streak_count = new_streak

    # Advance participant to next question
    quiz_questions = sorted(session.quiz.quiz_questions, key=lambda x: x.question_order) if session.quiz else []
    total_q = len(quiz_questions)
    next_idx = (participant.current_question_index or 0) + 1

    next_q_data = None
    next_time_limit = None
    result_data = None

    if next_idx < total_q:
        participant.current_question_index = next_idx
        participant.current_question_started_at = now
        participant.status = "answering"

        next_qq = quiz_questions[next_idx]
        next_q = next_qq.question
        next_time_limit = next_qq.time_limit or next_q.default_time_limit or 30
        next_q_data = format_participant_question(
            q=next_q,
            qq=next_qq,
            index=next_idx,
            total_q=total_q,
            remaining_seconds=next_time_limit,
            started_at_iso=now.isoformat()
        )
    else:
        participant.current_question_index = total_q
        participant.status = "completed"
        participant.completed_at = now

        correct_count = db.query(ParticipantAnswer).filter(
            ParticipantAnswer.participant_id == participant.id,
            ParticipantAnswer.session_id == session.id,
            ParticipantAnswer.is_correct == True
        ).count()
        participant.final_percentage = round((correct_count / max(1, total_q)) * 100, 1)

        # Update final ranks
        all_p = sorted(session.participants, key=lambda p: p.final_score or 0, reverse=True)
        for r, p in enumerate(all_p, 1):
            p.final_rank = r

        result_data = {
            "final_score": participant.final_score,
            "final_percentage": participant.final_percentage,
            "final_rank": participant.final_rank,
            "total_questions": total_q,
            "correct_count": correct_count
        }

    db.commit()
    db.refresh(participant)

    # Broadcast updated participant progress to the room / host
    answering_count = sum(1 for p in session.participants if p.status == "answering")
    completed_count = sum(1 for p in session.participants if p.status == "completed")

    await ws_manager.broadcast_to_room(session.session_code, {
        "event": "PARTICIPANT_PROGRESS",
        "data": {
            "participant_id": participant.id,
            "display_name": participant.display_name,
            "score": participant.final_score,
            "streak": participant.streak_count,
            "status": participant.status,
            "current_question_index": participant.current_question_index,
            "total_questions": total_q,
            "accuracy": participant.final_percentage,
            "final_rank": participant.final_rank,
            "answering_count": answering_count,
            "completed_count": completed_count,
            "last_answer_correct": is_correct,
            "points_earned": points_earned
        }
    })

    # Conceal correct answer, is_correct, and points during live quiz to prevent participant leakage
    return AnswerSubmitResponse(
        is_correct=None,
        points_earned=0,
        streak_count=participant.streak_count or 0,
        total_score=participant.final_score or 0,
        explanation=None,
        correct_answer=None,
        status=participant.status,
        current_question_index=participant.current_question_index,
        total_questions=total_q,
        next_question=next_q_data,
        remaining_seconds=next_time_limit,
        result=result_data
    )

@router.post("/answer", response_model=AnswerSubmitResponse)
async def submit_answer(payload: AnswerSubmitRequest, db: Session = Depends(get_db)):
    return await process_answer_submission(payload, db)

@router.post("/answers", response_model=AnswerSubmitResponse)
async def submit_answers_alias(payload: AnswerSubmitRequest, db: Session = Depends(get_db)):
    return await process_answer_submission(payload, db)

@router.get("/session/{session_id}")
def get_session_participants(session_id: int, db: Session = Depends(get_db)):
    participants = db.query(Participant).filter(Participant.session_id == session_id).all()
    return [
        {
            "id": p.id,
            "session_id": p.session_id,
            "display_name": p.display_name,
            "connection_status": p.connection_status,
            "status": p.status or "waiting",
            "current_question_index": p.current_question_index or 0,
            "final_score": p.final_score or 0,
            "final_percentage": p.final_percentage or 0.0,
            "final_rank": p.final_rank or 0,
            "streak_count": p.streak_count or 0
        }
        for p in sorted(participants, key=lambda x: x.final_score or 0, reverse=True)
    ]

@router.get("/{session_id}/participants")
def get_participants_alias(session_id: int, db: Session = Depends(get_db)):
    return get_session_participants(session_id, db)
