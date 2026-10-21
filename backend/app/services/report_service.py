import csv
import io
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models import QuizSession, Participant, ParticipantAnswer, QuestionBank, Quiz

def generate_session_report_data(db: Session, session_id: int) -> Dict[str, Any]:
    """
    Aggregates performance analytics for a session.
    """
    quiz_session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not quiz_session:
        raise ValueError("Session not found")

    participants = db.query(Participant).filter(Participant.session_id == session_id).all()
    answers = db.query(ParticipantAnswer).filter(ParticipantAnswer.session_id == session_id).all()
    quiz = quiz_session.quiz

    total_participants = len(participants)
    completed_participants = len([p for p in participants if p.completed_at is not None or p.final_score > 0])
    
    scores = [p.final_score for p in participants] if participants else [0]
    percentages = [p.final_percentage for p in participants] if participants else [0.0]
    
    avg_score = sum(scores) / max(1, len(scores))
    highest_score = max(scores) if scores else 0
    lowest_score = min(scores) if scores else 0
    avg_accuracy = sum(percentages) / max(1, len(percentages))

    resp_times = [a.response_time_seconds for a in answers if a.response_time_seconds > 0]
    avg_resp_time = sum(resp_times) / max(1, len(resp_times)) if resp_times else 0.0

    # Leaderboard
    sorted_participants = sorted(participants, key=lambda x: x.final_score, reverse=True)
    leaderboard = []
    for rank, p in enumerate(sorted_participants, 1):
        p_answers = [a for a in answers if a.participant_id == p.id]
        p_times = [a.response_time_seconds for a in p_answers if a.response_time_seconds > 0]
        leaderboard.append({
            "rank": rank,
            "participant_id": p.id,
            "display_name": p.display_name,
            "score": p.final_score,
            "streak": p.streak_count,
            "accuracy_percentage": p.final_percentage,
            "avg_response_time": round(sum(p_times) / max(1, len(p_times)), 2) if p_times else 0.0
        })

    # Question Analytics
    questions_analytics = []
    # Fetch quiz questions
    quiz_questions = quiz.quiz_questions if quiz else []
    for idx, qq in enumerate(quiz_questions, 1):
        q = qq.question
        q_answers = [a for a in answers if a.question_id == q.id]
        total_q_answers = len(q_answers)
        correct_count = len([a for a in q_answers if a.is_correct])
        incorrect_count = total_q_answers - correct_count
        acc_pct = (correct_count / max(1, total_q_answers)) * 100.0 if total_q_answers > 0 else 0.0

        q_times = [a.response_time_seconds for a in q_answers if a.response_time_seconds > 0]
        q_avg_time = sum(q_times) / max(1, len(q_times)) if q_times else 0.0

        # options breakdown
        breakdown = {}
        for a in q_answers:
            val = str(a.selected_answer)
            breakdown[val] = breakdown.get(val, 0) + 1

        correct_ans_str = q.correct_answer
        if not correct_ans_str and q.options:
            correct_texts = [opt.get("text", "") for opt in (q.options or []) if opt.get("is_correct")]
            if correct_texts:
                correct_ans_str = ", ".join(correct_texts)

        questions_analytics.append({
            "question_number": idx,
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "correct_answer": correct_ans_str or "N/A",
            "difficulty": q.difficulty,
            "total_answered": total_q_answers,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "accuracy_percentage": round(acc_pct, 1),
            "avg_response_time": round(q_avg_time, 2),
            "options_breakdown": breakdown
        })

    # Granular Participant Responses Drilldown
    participant_responses = []
    p_lookup = {p.id: p.display_name for p in participants}
    q_lookup = {}
    for qq in quiz_questions:
        if qq.question:
            q_lookup[qq.question.id] = qq.question.question_text

    for ans in answers:
        participant_responses.append({
            "id": ans.id,
            "participant_id": ans.participant_id,
            "participant_name": p_lookup.get(ans.participant_id, f"Participant #{ans.participant_id}"),
            "question_id": ans.question_id,
            "question_text": q_lookup.get(ans.question_id, f"Question #{ans.question_id}"),
            "selected_answer": ans.selected_answer,
            "is_correct": bool(ans.is_correct),
            "points_awarded": ans.points_earned,
            "points_earned": ans.points_earned,
            "response_time_seconds": ans.response_time_seconds,
            "answered_at": ans.answered_at.isoformat() if ans.answered_at else None
        })

    return {
        "session_id": quiz_session.id,
        "session_code": quiz_session.session_code,
        "quiz_title": quiz.title if quiz else "Quiz",
        "category": quiz.category if quiz else "General",
        "date_conducted": quiz_session.started_at or quiz_session.created_at,
        "total_participants": total_participants,
        "completed_participants": completed_participants,
        "average_score": round(avg_score, 1),
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "average_accuracy": round(avg_accuracy, 1),
        "average_response_time": round(avg_resp_time, 2),
        "questions_analytics": questions_analytics,
        "leaderboard": leaderboard,
        "participant_responses": participant_responses
    }

def export_session_csv(report_data: Dict[str, Any]) -> str:
    """
    Generates a formatted CSV string containing summary and participant ranking.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["KUIZILA WORKSHOP & TRAINING ASSESSMENT REPORT"])
    writer.writerow(["Quiz Title", report_data.get("quiz_title", "")])
    writer.writerow(["Session Code", report_data.get("session_code", "")])
    writer.writerow(["Category", report_data.get("category", "")])
    writer.writerow(["Date Conducted", str(report_data.get("date_conducted", ""))])
    writer.writerow(["Total Participants", report_data.get("total_participants", 0)])
    writer.writerow(["Average Accuracy (%)", f"{report_data.get('average_accuracy', 0)}%"])
    writer.writerow(["Average Score", report_data.get("average_score", 0)])
    writer.writerow([])

    # Participant Leaderboard Table
    writer.writerow(["PARTICIPANT PERFORMANCE"])
    writer.writerow(["Rank", "Participant Name", "Score", "Accuracy (%)", "Max Streak", "Avg Response Time (s)"])
    for p in report_data.get("leaderboard", []):
        writer.writerow([
            p.get("rank"),
            p.get("display_name"),
            p.get("score"),
            f"{p.get('accuracy_percentage')}%",
            p.get("streak"),
            p.get("avg_response_time")
        ])

    writer.writerow([])
    # Question Breakdown Table
    writer.writerow(["QUESTION ANALYTICS"])
    writer.writerow(["Question", "Type", "Difficulty", "Total Answers", "Correct", "Accuracy (%)", "Avg Time (s)"])
    for q in report_data.get("questions_analytics", []):
        writer.writerow([
            q.get("question_text"),
            q.get("question_type"),
            q.get("difficulty"),
            q.get("total_answered"),
            q.get("correct_count"),
            f"{q.get('accuracy_percentage')}%",
            q.get("avg_response_time")
        ])

    writer.writerow([])
    # Granular Responses Table
    writer.writerow(["GRANULAR PARTICIPANT RESPONSES"])
    writer.writerow(["Participant", "Question", "Answer Given", "Correct", "Points", "Response Time (s)", "Timestamp"])
    for r in report_data.get("participant_responses", []):
        writer.writerow([
            r.get("participant_name"),
            r.get("question_text"),
            r.get("selected_answer"),
            "Yes" if r.get("is_correct") else "No",
            r.get("points_awarded"),
            r.get("response_time_seconds"),
            r.get("answered_at")
        ])

    return output.getvalue()
