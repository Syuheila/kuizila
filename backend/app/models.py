from datetime import datetime
import json
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from .database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    domain = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), default="admin")  # admin, employee, user
    department = Column(String(100), default="General")
    job_title = Column(String(100), nullable=True)
    provider = Column(String(50), default="email")  # email, google, microsoft, apple
    provider_id = Column(String(255), nullable=True)
    avatar = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    quizzes = relationship("Quiz", back_populates="owner", cascade="all, delete-orphan")
    question_bank = relationship("QuestionBank", back_populates="owner")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), default="General")
    instructions = Column(Text, nullable=True)
    status = Column(String(50), default="published")  # draft, published, archived
    visibility = Column(String(50), default="organization")  # private, organization, public
    settings = Column(JSON, default=dict)  # time_limit, shuffle, show_answers, timebomb, etc.
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="quizzes")
    quiz_questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.question_order"
    )
    sessions = relationship("QuizSession", back_populates="quiz", cascade="all, delete-orphan")


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    question_type = Column(String(50), default="multiple_choice")  # multiple_choice, true_false, multiple_select, short_answer, poll
    question_text = Column(Text, nullable=False)
    options = Column(JSON, default=list)  # [{"id": "a", "text": "Option A", "is_correct": True}, ...]
    correct_answer = Column(Text, nullable=True)  # text for short answer or id for single
    explanation = Column(Text, nullable=True)
    category = Column(String(100), default="General")
    difficulty = Column(String(50), default="medium")  # easy, medium, hard
    tags = Column(String(255), default="")  # comma-separated tags
    default_time_limit = Column(Integer, default=30)
    default_points = Column(Integer, default=100)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="question_bank")
    quiz_links = relationship("QuizQuestion", back_populates="question")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_bank.id"), nullable=False)
    question_order = Column(Integer, default=0)
    time_limit = Column(Integer, default=30)
    points = Column(Integer, default=100)

    quiz = relationship("Quiz", back_populates="quiz_questions")
    question = relationship("QuestionBank", back_populates="quiz_links")


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_code = Column(String(10), unique=True, index=True, nullable=False)
    session_status = Column(String(50), default="waiting")  # waiting, active, question_review, leaderboard, completed
    game_mode = Column(String(50), default="classic")  # classic, battle_ffa, battle_team, battle_royale, battle_h2h
    battle_settings = Column(JSON, default=dict)  # teams, lives, powerups, elimination rules
    current_question_index = Column(Integer, default=0)
    current_question_started_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    quiz = relationship("Quiz", back_populates="sessions")
    participants = relationship("Participant", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("ParticipantAnswer", back_populates="session", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=False)
    display_name = Column(String(100), nullable=False)
    connection_status = Column(String(50), default="online")  # online, offline
    status = Column(String(50), default="waiting")  # waiting, answering, completed
    current_question_index = Column(Integer, default=0)
    current_question_started_at = Column(DateTime, nullable=True)
    final_score = Column(Integer, default=0)
    final_percentage = Column(Float, default=0.0)
    final_rank = Column(Integer, default=0)
    streak_count = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    session = relationship("QuizSession", back_populates="participants")
    answers = relationship("ParticipantAnswer", back_populates="participant", cascade="all, delete-orphan")


class ParticipantAnswer(Base):
    __tablename__ = "participant_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("quiz_sessions.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question_bank.id"), nullable=False)
    selected_answer = Column(JSON, nullable=True)  # chosen option text/id
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Integer, default=0)
    response_time_seconds = Column(Float, default=0.0)
    answered_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("QuizSession", back_populates="answers")
    participant = relationship("Participant", back_populates="answers")
    question = relationship("QuestionBank")
