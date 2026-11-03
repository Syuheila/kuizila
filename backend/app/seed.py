from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .models import (
    User, Organization, Quiz, QuestionBank, QuizQuestion,
    QuizSession, Participant, ParticipantAnswer
)
from .routers.auth import hash_password

def seed_organization_and_users(db: Session):
    """Seed default organization and official trainer admin account."""
    org = db.query(Organization).filter(Organization.slug == "kuizila-demo").first()
    if not org:
        org = Organization(
            name="Kuizila Platform",
            slug="kuizila-demo",
            domain="kuizila.com"
        )
        db.add(org)
        db.flush()

    pwd_hash = hash_password("password123")

    user_accounts = [
        {"name": "Suhailah Desa", "email": "admin@kuizila.com", "role": "admin", "department": "Training", "job_title": "Platform Lead"},
    ]

    for usr in user_accounts:
        existing = db.query(User).filter(User.email == usr["email"]).first()
        if not existing:
            new_user = User(
                name=usr["name"],
                email=usr["email"],
                password_hash=pwd_hash,
                organization_id=org.id,
                role=usr["role"],
                department=usr["department"],
                job_title=usr["job_title"]
            )
            db.add(new_user)
        else:
            existing.name = usr["name"]
            existing.password_hash = pwd_hash
            existing.organization_id = org.id
            existing.role = usr["role"]

    db.commit()

def seed_quizzes_and_questions(db: Session):
    """Seed corporate training quizzes and reusable question bank."""
    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_id = admin_user.id if admin_user else 1

    questions_data = [
        {
            "key": "safe_evac",
            "question_type": "multiple_choice",
            "question_text": "What is the primary emergency assembly point in the event of an audible building evacuation alarm?",
            "options": [
                {"id": "opt_a", "text": "The rooftop observation deck", "is_correct": False},
                {"id": "opt_b", "text": "The designated open parking lot opposite Main Lobby A", "is_correct": True},
                {"id": "opt_c", "text": "Inside the ground-floor cafeteria", "is_correct": False},
                {"id": "opt_d", "text": "The nearest basement stairwell", "is_correct": False}
            ],
            "correct_answer": "opt_b",
            "explanation": "During an evacuation, all personnel must immediately proceed to open outdoor assembly zones away from structural hazards.",
            "category": "Workplace Safety",
            "difficulty": "easy",
            "tags": "safety, emergency, evacuation",
            "default_time_limit": 30,
            "default_points": 100
        },
        {
            "key": "safe_pass",
            "question_type": "multiple_choice",
            "question_text": "What does the fire safety acronym 'PASS' stand for when operating a portable fire extinguisher?",
            "options": [
                {"id": "opt_a", "text": "Pull, Aim, Squeeze, Sweep", "is_correct": True},
                {"id": "opt_b", "text": "Press, Activate, Spray, Stop", "is_correct": False},
                {"id": "opt_c", "text": "Push, Align, Shake, Secure", "is_correct": False},
                {"id": "opt_d", "text": "Prepare, Aim, Shoot, Safe", "is_correct": False}
            ],
            "correct_answer": "opt_a",
            "explanation": "PASS: Pull the safety pin, Aim low at the base of fire, Squeeze the handle lever, Sweep side to side.",
            "category": "Workplace Safety",
            "difficulty": "easy",
            "tags": "fire, safety, pass",
            "default_time_limit": 25,
            "default_points": 100
        },
        {
            "key": "safe_nearmiss",
            "question_type": "multiple_choice",
            "question_text": "Within what standard timeframe should any workplace 'Near-Miss' safety incident be reported to the EHS team?",
            "options": [
                {"id": "opt_a", "text": "Within 24 hours of occurrence", "is_correct": True},
                {"id": "opt_b", "text": "At the end of the calendar month", "is_correct": False},
                {"id": "opt_c", "text": "Only if property damage exceeds $1,000", "is_correct": False},
                {"id": "opt_d", "text": "During the quarterly safety audit", "is_correct": False}
            ],
            "correct_answer": "opt_a",
            "explanation": "Prompt reporting within 24 hours enables rapid root-cause investigation and hazard remediation before injuries occur.",
            "category": "Workplace Safety",
            "difficulty": "medium",
            "tags": "safety, reporting, compliance",
            "default_time_limit": 30,
            "default_points": 100
        },
        {
            "key": "sec_phish",
            "question_type": "multiple_choice",
            "question_text": "You receive an unexpected email from 'IT Support' requesting urgent password verification via an external link. What is the correct action?",
            "options": [
                {"id": "opt_a", "text": "Click the link and log in immediately to avoid account suspension", "is_correct": False},
                {"id": "opt_b", "text": "Report the email via the PhishAlarm button and notify Security Operations", "is_correct": True},
                {"id": "opt_c", "text": "Forward the email to all department coworkers", "is_correct": False},
                {"id": "opt_d", "text": "Reply asking if it is legitimate", "is_correct": False}
            ],
            "correct_answer": "opt_b",
            "explanation": "Legitimate IT staff never request credentials via email. Suspicious emails should be reported immediately.",
            "category": "Cybersecurity",
            "difficulty": "easy",
            "tags": "phishing, security, credentials",
            "default_time_limit": 25,
            "default_points": 100
        },
        {
            "key": "sec_clean_desk",
            "question_type": "multiple_choice",
            "question_text": "Under corporate Clean Desk Policy, what must be done when stepping away from your workstation even briefly?",
            "options": [
                {"id": "opt_a", "text": "Lock your screen (Win + L) and stow confidential papers", "is_correct": True},
                {"id": "opt_b", "text": "Turn off your monitor display only", "is_correct": False},
                {"id": "opt_c", "text": "Leave a post-it note saying 'Back in 5 mins'", "is_correct": False},
                {"id": "opt_d", "text": "Ask a neighboring colleague to watch your screen", "is_correct": False}
            ],
            "correct_answer": "opt_a",
            "explanation": "Workstations must be locked instantly when unattended to prevent unauthorized physical viewing or session hijacking.",
            "category": "Cybersecurity",
            "difficulty": "easy",
            "tags": "security, clean-desk, policy",
            "default_time_limit": 20,
            "default_points": 100
        }
    ]

    saved_questions = {}
    for q_data in questions_data:
        key = q_data.pop("key")
        existing_q = db.query(QuestionBank).filter(QuestionBank.question_text == q_data["question_text"]).first()
        if not existing_q:
            q = QuestionBank(owner_id=admin_id, **q_data)
            db.add(q)
            db.flush()
            saved_questions[key] = q
        else:
            saved_questions[key] = existing_q
    db.commit()

    # Seed safety quiz
    safety_quiz = db.query(Quiz).filter(Quiz.title == "Workplace Safety & Emergency Procedures").first()
    if not safety_quiz:
        safety_quiz = Quiz(
            owner_id=admin_id,
            title="Workplace Safety & Emergency Procedures",
            description="Essential safety training quiz covering emergency evacuation, fire extinguisher PASS protocol, and incident reporting.",
            category="Workplace Safety",
            instructions="Select the best answer for each multiple-choice question.",
            status="published",
            visibility="organization",
            usage_count=1
        )
        db.add(safety_quiz)
        db.flush()

        for idx, k in enumerate(["safe_evac", "safe_pass", "safe_nearmiss"]):
            if k in saved_questions:
                link = QuizQuestion(
                    quiz_id=safety_quiz.id,
                    question_id=saved_questions[k].id,
                    question_order=idx,
                    time_limit=30,
                    points=100
                )
                db.add(link)
        db.commit()

    # Seed completed session SAFE01
    existing_session = db.query(QuizSession).filter(QuizSession.session_code == "SAFE01").first()
    if not existing_session and safety_quiz:
        session_start = datetime.utcnow() - timedelta(days=1)
        session_end = session_start + timedelta(minutes=10)
        session = QuizSession(
            quiz_id=safety_quiz.id,
            host_id=admin_id,
            session_code="SAFE01",
            session_status="completed",
            current_question_index=3,
            started_at=session_start,
            ended_at=session_end
        )
        db.add(session)
        db.flush()

        participants_data = [
            {"name": "Aina", "score": 300, "percentage": 100.0, "rank": 1, "streak": 3},
            {"name": "Daniel", "score": 280, "percentage": 100.0, "rank": 2, "streak": 3},
            {"name": "Faris", "score": 200, "percentage": 66.7, "rank": 3, "streak": 2},
            {"name": "Mei Ling", "score": 190, "percentage": 66.7, "rank": 4, "streak": 1},
        ]

        safety_qq = sorted(safety_quiz.quiz_questions, key=lambda x: x.question_order)

        for p_info in participants_data:
            part = Participant(
                session_id=session.id,
                display_name=p_info["name"],
                connection_status="offline",
                final_score=p_info["score"],
                final_percentage=p_info["percentage"],
                final_rank=p_info["rank"],
                streak_count=p_info["streak"],
                joined_at=session_start + timedelta(seconds=10),
                completed_at=session_end
            )
            db.add(part)
            db.flush()

            for q_idx, qq in enumerate(safety_qq):
                q_bank = qq.question
                is_correct = True
                if p_info["percentage"] < 100.0 and q_idx == 2:
                    is_correct = False

                ans_val = q_bank.correct_answer if is_correct else "opt_c"
                pts = qq.points if is_correct else 0

                ans_row = ParticipantAnswer(
                    session_id=session.id,
                    participant_id=part.id,
                    question_id=q_bank.id,
                    selected_answer=ans_val,
                    is_correct=is_correct,
                    points_earned=pts,
                    response_time_seconds=round(3.0 + (p_info["rank"] * 0.8), 1),
                    answered_at=session_start + timedelta(seconds=30 * (q_idx + 1))
                )
                db.add(ans_row)

        db.commit()

def seed_database(db: Session):
    seed_organization_and_users(db)
    # Note: Dummy quizzes are disabled so all trainers start fresh with 0 quizzes
