from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# ================= USER =================
class UserBase(BaseModel):
    name: str
    email: Optional[str] = None
    role: str = "admin"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ================= QUESTION =================
class OptionItem(BaseModel):
    id: str
    text: str
    is_correct: bool = False

class QuestionBase(BaseModel):
    question_type: str = "multiple_choice"
    question_text: str
    options: List[OptionItem] = []
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    category: str = "General"
    difficulty: str = "medium"
    tags: Optional[str] = ""
    default_time_limit: int = 30
    default_points: int = 100

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    question_type: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[List[OptionItem]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[str] = None
    default_time_limit: Optional[int] = None
    default_points: Optional[int] = None

class QuestionResponse(QuestionBase):
    id: int
    owner_id: Optional[int] = None
    usage_count: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ================= QUIZ & QUIZ QUESTIONS =================
class QuizQuestionLink(BaseModel):
    question_id: int
    question_order: int = 0
    time_limit: Optional[int] = None
    points: Optional[int] = None

class QuizQuestionResponse(BaseModel):
    id: int
    quiz_id: int
    question_id: int
    question_order: int
    time_limit: int
    points: int
    question: Optional[QuestionResponse] = None
    class Config:
        from_attributes = True

class QuizBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "General"
    instructions: Optional[str] = None
    status: str = "published"
    visibility: str = "organization"
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "time_limit": 30,
        "shuffle_questions": False,
        "shuffle_answers": False,
        "show_answers_mode": "immediate",
        "speed_bonus": True
    })

class QuizCreate(QuizBase):
    question_ids: Optional[List[int]] = []
    inline_questions: Optional[List[QuestionCreate]] = []

class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    instructions: Optional[str] = None
    status: Optional[str] = None
    visibility: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    question_ids: Optional[List[int]] = None
    inline_questions: Optional[List[QuestionCreate]] = None


class QuizResponse(QuizBase):
    id: int
    owner_id: Optional[int] = None
    usage_count: int
    question_count: int = 0
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class QuizDetailResponse(QuizResponse):
    quiz_questions: List[QuizQuestionResponse] = []


# ================= LIVE SESSIONS =================
class SessionCreate(BaseModel):
    quiz_id: int
    settings_override: Optional[Dict[str, Any]] = None

class SessionJoinRequest(BaseModel):
    session_code: str
    display_name: str

class ParticipantResponse(BaseModel):
    id: int
    session_id: int
    display_name: str
    connection_status: str
    final_score: int
    final_percentage: float
    final_rank: int
    streak_count: int
    joined_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class SessionStateResponse(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str
    session_code: str
    session_status: str  # waiting, active, question_review, leaderboard, completed
    current_question_index: int
    total_questions: int
    current_question: Optional[Dict[str, Any]] = None
    remaining_seconds: Optional[int] = None
    participant_count: int
    participants: List[ParticipantResponse] = []
    settings: Dict[str, Any] = {}


# ================= ANSWERS & SCORING =================
class AnswerSubmitRequest(BaseModel):
    session_id: int
    participant_id: int
    question_id: int
    selected_answer: Optional[Any] = None
    response_time_seconds: float = 0.0

class AnswerSubmitResponse(BaseModel):
    is_correct: Optional[bool] = None
    points_earned: Optional[int] = 0
    streak_count: int = 0
    total_score: int = 0
    explanation: Optional[str] = None
    correct_answer: Optional[Any] = None
    status: Optional[str] = "answering"
    current_question_index: Optional[int] = 0
    total_questions: Optional[int] = 0
    next_question: Optional[Dict[str, Any]] = None
    remaining_seconds: Optional[int] = None
    result: Optional[Dict[str, Any]] = None


# ================= LEADERBOARD =================
class LeaderboardEntry(BaseModel):
    rank: int
    participant_id: int
    display_name: str
    score: int
    streak: int
    accuracy_percentage: float
    avg_response_time: float


# ================= REPORTS =================
class QuestionAnalytics(BaseModel):
    question_number: Optional[int] = 1
    question_id: int
    question_text: str
    question_type: str
    correct_answer: Optional[str] = None
    difficulty: str
    total_answered: int
    correct_count: int
    incorrect_count: int
    accuracy_percentage: float
    avg_response_time: float
    options_breakdown: Dict[str, int] = {}

class SessionReportResponse(BaseModel):
    session_id: int
    session_code: str
    quiz_title: str
    category: str
    date_conducted: datetime
    total_participants: int
    completed_participants: int
    average_score: float
    highest_score: int
    lowest_score: int
    average_accuracy: float
    average_response_time: float
    questions_analytics: List[QuestionAnalytics] = []
    leaderboard: List[LeaderboardEntry] = []
    participant_responses: Optional[List[Dict[str, Any]]] = []


# ================= AI REQUESTS & RESPONSES =================
class AIGenerateRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "medium"
    question_type: str = "multiple_choice"
    context_text: Optional[str] = None
    target_audience: str = "Corporate employees"
    language: str = "English"

class AIImproveQuestionRequest(BaseModel):
    question_text: str
    options: Optional[List[str]] = []
    correct_answer: Optional[str] = None
    goal: str = "clarity"

class AISuggestTopicsRequest(BaseModel):
    topic_or_context: str
    num_topics: int = 6

class AIPerformanceSummaryRequest(BaseModel):
    session_id: int

class AIRegenerateQuestionRequest(BaseModel):
    question_text: str
    options: Optional[List[Any]] = []
    correct_answer: Optional[str] = None
    material_id: Optional[str] = None

class AIQuizQualityCheckRequest(BaseModel):
    questions: List[Dict[str, Any]]
    quiz_title: Optional[str] = "Quiz"
    material_id: Optional[str] = None

class AIStudyGuideRequest(BaseModel):
    material_id: str

class AIMaterialSummaryRequest(BaseModel):
    material_id: str
    mode: Optional[str] = "short"

class AIQuizInsightsRequest(BaseModel):
    session_id: int

