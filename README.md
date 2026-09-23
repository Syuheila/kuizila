# Loomi — Interactive Quiz & Learning Platform

> **Important**: This is currently the **local development version** of Loomi. Public deployment and production hosting have not been configured yet.

Loomi is an interactive, web-based quiz and corporate learning application designed for trainers, educators, and organizations. It provides live multiplayer quizzes with self-paced independent participant progression, grounded AI assistance, comprehensive analytics, and 100% private local AI integration via Ollama.

---

## Technology Stack

* **Frontend**: React 18, Vite, React Router 6, Lucide Icons, Recharts, Canvas-Confetti
* **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy 2.0, WebSockets
* **Database**: SQLite (`loomi.db`) with Write-Ahead Logging (WAL) and foreign keys enabled
* **Local AI Engine**: Ollama running `qwen3:8b` (with automatic fallback to `llama3.2:3b`) at `http://localhost:11434`
* **Document & PDF Processing**: PyMuPDF (`fitz`), `python-docx`, `python-pptx`, `olefile`, ReportLab
* **Authentication**: PBKDF2-HMAC-SHA256 password hashing with signed HMAC-SHA256 session tokens

---

## Local Development Setup

### 1. Prerequisites
Ensure the following tools are installed on your local development machine:
* **Python**: Version 3.10 or higher (`python --version`)
* **Node.js**: Version 18.0 or higher (`node --version`) and npm (`npm --version`)
* **Ollama**: Local AI inference engine from [ollama.com](https://ollama.com)

---

### 2. Ollama Local AI Setup
Loomi runs completely private, local AI generation and document chat via Ollama.

1. Install and start the Ollama service:
   ```bash
   ollama serve
   ```
2. In a separate terminal, pull the required AI models:
   ```bash
   # Primary Model
   ollama pull qwen3:8b

   # Lightweight Fallback Model
   ollama pull llama3.2:3b
   ```
3. Confirm both models are downloaded and available:
   ```bash
   ollama list
   ```

---

### 3. Backend Setup (FastAPI & SQLite)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # macOS / Linux:
   source .venv/bin/activate
   ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (optional for local dev; sensible defaults are built-in):
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env
   # macOS / Linux:
   cp .env.example .env
   ```
5. Start the backend development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   * The API server will run at: `http://127.0.0.1:8000`
   * Interactive Swagger documentation is available at: `http://127.0.0.1:8000/docs`
   * Health check endpoint: `http://127.0.0.1:8000/api/health`

---

### 4. Frontend Setup (React & Vite)

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * The Loomi web interface will be accessible at: `http://localhost:5173`

---

## Default Local Credentials

When the backend starts for the first time, an initial trainer account is automatically created:

* **Role**: Lead Trainer / Admin
* **Email**: `admin@loomi.com`
* **Password**: `password123`

You can also register new trainer accounts on the Sign-Up page (`/signup`).

---

## How to Test the Application Locally

1. **Trainer Authentication**:
   - Navigate to `http://localhost:5173/login`.
   - Log in using `admin@loomi.com` / `password123` or register a new trainer account.
2. **Create a Quiz**:
   - Go to `/quizzes/create` to manually author questions with multiple options and correct answers.
   - Use the **AI Generator** tab to auto-generate questions from any topic.
   - Upload learning materials (`.pdf`, `.docx`, `.pptx`, `.txt`) to generate grounded questions or interact with the **Ask AI** floating chat.
3. **Export Quiz as PDF**:
   - On the Quiz Detail page, test exporting a **Student Quiz PDF** (questions only) and a **Trainer Answer Key PDF** (with answers and explanations).
4. **Run a Live Multiplayer Quiz**:
   - Click **Host Live Quiz** from any quiz to launch a live session and receive a 6-character PIN code.
   - Open a separate browser window or incognito tab, navigate to `http://localhost:5173/join`, and enter the session PIN.
   - Join with 2 or more participant names (e.g., Alice, Bob).
   - Click **Start Quiz** on the host screen: each participant answers independently at their own pace on server-authoritative timers.
   - Observe live real-time leaderboard updates on the host dashboard.

---

## Project Structure

```text
loomi/
├── backend/
│   ├── app/
│   │   ├── routers/        # FastAPI API route handlers (auth, quizzes, sessions, ai, etc.)
│   │   ├── services/       # AI service, PDF export, document extraction, scoring
│   │   ├── websocket/      # Live quiz WebSocket room manager
│   │   ├── models.py       # SQLAlchemy ORM database models
│   │   ├── schemas.py      # Pydantic request/response schemas
│   │   └── database.py     # SQLite connection, WAL mode & foreign keys
│   ├── uploads/            # Temporary document storage (.gitkeep preserved)
│   ├── requirements.txt    # Python backend dependencies
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (Navbar, Modals, Timer, Leaderboard, etc.)
│   │   ├── context/        # Auth and application state contexts
│   │   ├── pages/          # Pages (Dashboard, QuizCreator, LiveHost, LiveParticipant, etc.)
│   │   └── services/       # API and WebSocket client wrappers
│   ├── package.json        # Frontend Node dependencies and scripts
│   └── vite.config.js      # Vite build & proxy configuration
├── .gitignore              # Repository git ignore rules
├── .env.example            # Root environment variable template
└── README.md               # Local development instructions
```
