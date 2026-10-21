# Kuizila Platform — Comprehensive Setup & Operations Guide

This guide details the complete local setup, dependency installation, AI engine configuration, database initialization, and operational workflows for the Kuizila Interactive Quiz & Employee Engagement Platform.

---

## 1. System Prerequisites

Before running Kuizila, ensure your development environment has the following installed:

* **Python**: Version 3.10 or higher (`python --version`)
* **Node.js**: Version 18.0 or higher (`node --version`)
* **npm**: Version 9.0 or higher (`npm --version`)
* **Ollama**: Local open-source AI inference engine ([ollama.com](https://ollama.com))

---

## 2. Setting Up Ollama (Local AI Engine)

Kuizila uses Ollama to provide 100% private, offline AI question generation without external cloud API dependencies or per-token charges.

1. Install Ollama from [ollama.com/download](https://ollama.com/download).
2. Start the Ollama background service:
   ```bash
   ollama serve
   ```
3. Pull the required lightweight, instruction-tuned model:
   ```bash
   ollama pull llama3.2:3b
   ```
4. Verify the model is operational:
   ```bash
   ollama list
   ```
   *You should see `llama3.2:3b` listed and listening on `http://localhost:11434`.*

---

## 3. Backend Setup & Configuration

The backend is built with FastAPI, SQLAlchemy 2.0, and SQLite (`kuizila.db`).

### Step 3.1: Navigate to the Backend Directory
```bash
cd backend
```

### Step 3.2: Install Python Dependencies
```bash
python -m pip install -r requirements.txt
```

*Key packages installed include `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `httpx`, `pymupdf` (PDF extraction), `python-docx` (Word documents), `python-pptx` (PowerPoint slides), and `passlib`.*

### Step 3.3: Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Review your `.env` settings:
* `KUIZILA_SECRET_KEY`: Cryptographic signing key for session tokens.
* `OLLAMA_BASE_URL`: Defaults to `http://localhost:11434`.
* `OLLAMA_MODEL`: Defaults to `llama3.2:3b` or `gemma4:latest`.

### Step 3.4: Initialize / Reset Clean Database
To initialize a clean database with the sole administrator account and default badges:
```bash
python -m app.seed
```

**Single Administrator Credentials:**
* **Name**: Suhailah Desa
* **Email**: `admin@kuizila.com`
* **Password**: `password123`
* **Role**: `admin` / `owner`

### Step 3.5: Run the Backend Server
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* The API will be available at: `http://127.0.0.1:8000`
* Interactive OpenAPI Swagger documentation: `http://127.0.0.1:8000/docs`
* Telemetry health check: `http://127.0.0.1:8000/api/ai/health`

---

## 4. Frontend Setup & Build

The frontend is built with React 18, Vite, Lucide Icons, and the Web Audio API Synthesizer.

### Step 4.1: Navigate to the Frontend Directory
```bash
cd frontend
```

### Step 4.2: Install Node Packages
```bash
npm install
```

### Step 4.3: Start the Development Server
```bash
npm run dev
```
* The web app will launch at: `http://localhost:5173`

### Step 4.4: Production Build Check
To verify type safety and bundle packaging:
```bash
npm run build
```
*Creates optimized production bundle in `frontend/dist/`.*

---

## 5. Core Platform Architecture & Interaction Flow

Kuizila operates with Kahoot-style frictionless guest join alongside corporate host capabilities:

### A. Homepage PIN Join (Zero Friction)
1. Any participant can visit `http://localhost:5173`.
2. Enter a 6-character session PIN in the hero join card.
3. The system validates whether the session is active.
4. If valid, the user chooses their display name and customizable SVG avatar and enters the live waiting lobby.
5. **No login or account creation required for participants.**

### B. Creator & Host Workflow
1. Click **Create a Quiz** or **Become a Host** on the homepage.
2. If unauthenticated, the user is prompted to log in or register, returning directly to `/creator`.
3. Create quizzes manually, with AI question generation (5, 10, 15, 20, or custom count), or by uploading PDF, DOCX, or PPTX slides.
4. Review, modify, or delete generated questions before saving.
5. Quizzes are stored permanently in the SQLite database and can be launched repeatedly.

### C. Live Multiplayer Gameplay
1. Host launches session in Classic or Battle mode.
2. Host screen displays real-time 6-character PIN, waiting lobby, live response counter, and controls.
3. Participants answer on their phones or laptops with audio synthesized cues, streak combos, and power-ups.
4. Host reveals answers and live dynamic leaderboards.
5. Registered users' results automatically record to `/employee/results` and update their Level and Badges in `/profile`.

### D. Participant Shell & Settings
1. Dedicated participant portal (`/employee/home`, `/join`, `/employee/results`, `/profile`, `/employee/settings`).
2. Persistent sidebar navigation.
3. Settings page supports display name updates, custom avatar designer (`AvatarPickerModal`), sound toggle, and password updates.

---

## 6. Maintenance & Troubleshooting

### Resetting the Database
To reset the platform to a clean slate (deleting previous sessions while preserving admin credentials):
```bash
cd backend
python -c "from app.seed import seed_database; seed_database()"
```

### Checking Ollama Connectivity
Run this curl command to test whether Ollama is answering requests:
```bash
curl http://127.0.0.1:8000/api/ai/health
```
Expected response:
```json
{"status": "healthy", "model": "gemma4:latest", "available": true}
```
