import sys
import os
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, ensure_schema_compatibility, SessionLocal
from app.seed import seed_database, seed_organization_and_users, seed_achievements_and_profiles
from app.routers.auth import ACTIVE_TOKENS

def test_complete_user_journey():
    print("=" * 70)
    print("LOOMI COMPREHENSIVE END-TO-END QUALITY CONTROL & JOURNEY TEST")
    print("=" * 70)

    # 0. Initialize & Seed DB
    print("\n[STEP 1] Initializing Database & Seeding Standard Enterprise Accounts...")
    ensure_schema_compatibility(engine)
    db = SessionLocal()
    seed_database(db)
    seed_organization_and_users(db)
    seed_achievements_and_profiles(db)
    db.close()
    print("✓ Database initialized with organizations, accounts, and gamification profiles.")

    client = TestClient(app)

    # 1. Standard Demo Accounts Verification
    print("\n[STEP 2] Verifying Standard Demo Credentials...")
    # Admin demo
    admin_login_resp = client.post("/api/auth/login", json={
        "email": "admin@loomidemo.com",
        "password": "password123"
    })
    assert admin_login_resp.status_code == 200, f"Admin demo login failed: {admin_login_resp.text}"
    admin_auth = admin_login_resp.json()
    admin_token = admin_auth["token"]
    assert admin_auth["user"]["role"] == "admin"
    assert admin_auth["user"]["email"] == "admin@loomidemo.com"
    print(f"✓ Admin demo login successful: {admin_auth['user']['name']} ({admin_auth['user']['email']})")

    # Employee demo
    emp_login_resp = client.post("/api/auth/login", json={
        "email": "employee@loomidemo.com",
        "password": "password123"
    })
    assert emp_login_resp.status_code == 200, f"Employee demo login failed: {emp_login_resp.text}"
    emp_auth = emp_login_resp.json()
    emp_token = emp_auth["token"]
    assert emp_auth["user"]["role"] == "employee"
    assert emp_auth["user"]["email"] == "employee@loomidemo.com"
    print(f"✓ Employee demo login successful: {emp_auth['user']['name']} ({emp_auth['user']['email']})")

    # Company email aliases
    alias_admin = client.post("/api/auth/login", json={"email": "sarah.jenkins@company.com", "password": "password123"})
    assert alias_admin.status_code == 200
    alias_emp = client.post("/api/auth/login", json={"email": "aina@company.com", "password": "password123"})
    assert alias_emp.status_code == 200
    print("✓ Company email aliases verified: sarah.jenkins@company.com & aina@company.com")

    # 2. Complete New User Journey: Sign Up -> Logout -> Login -> State Recovery
    print("\n[STEP 3] Testing Complete User Journey: Sign Up -> Logout -> Login -> Data Recovery...")
    import time
    test_email = f"new_organizer_{int(time.time())}@enterprise.io"
    reg_resp = client.post("/api/auth/register", json={
        "name": "Marcus Vance",
        "email": test_email,
        "password": "enterprise_secure_pwd_123",
        "organization_name": "Apex Global Solutions",
        "department": "Corporate Training",
        "job_title": "Senior L&D Director",
        "role": "admin"
    })
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    new_admin_token = reg_data["token"]
    assert reg_data["user"]["name"] == "Marcus Vance"
    assert reg_data["user"]["role"] == "admin"
    assert reg_data["user"]["organization"]["name"] == "Apex Global Solutions"
    print(f"✓ New admin registered: {reg_data['user']['name']} @ {reg_data['user']['organization']['name']}")

    # Check /me with new token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_admin_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == test_email
    print("✓ /api/auth/me verified for new session token")

    # Log out
    logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {new_admin_token}"})
    assert logout_resp.status_code == 200
    print("✓ Successfully logged out")

    # Verify old token is rejected
    stale_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_admin_token}"})
    assert stale_resp.status_code == 401, "Stale token was not rejected after logout"
    print("✓ Logged-out token correctly rejected (401 Unauthorized)")

    # Log in again with credentials
    relogin_resp = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "enterprise_secure_pwd_123"
    })
    assert relogin_resp.status_code == 200
    relogin_data = relogin_resp.json()
    active_token = relogin_data["token"]
    assert relogin_data["user"]["name"] == "Marcus Vance"
    assert relogin_data["user"]["organization"]["name"] == "Apex Global Solutions"
    print("✓ Logged in again & successfully recovered all account and organization data")

    # 3. Admin User Flow: Create Quiz -> Edit Quiz -> Launch Session -> Host Game
    print("\n[STEP 4] Testing Admin User Flow: Create Quiz -> Edit Quiz -> Launch Session...")
    admin_headers = {"Authorization": f"Bearer {active_token}"}
    create_quiz_resp = client.post("/api/quizzes", headers=admin_headers, json={
        "title": "2026 Enterprise Security & Compliance Assessment",
        "description": "Annual certification on cyber threats, phishing defense, and data protection.",
        "category": "Compliance & Security",
        "instructions": "Answer accurately to earn your annual security credential.",
        "status": "published",
        "visibility": "organization",
        "settings": {
            "time_limit": 25,
            "speed_bonus": True,
            "show_answers_mode": "immediate"
        },
        "inline_questions": [
            {
                "question_type": "multiple_choice",
                "question_text": "What is the recommended protocol when receiving an unexpected email requesting urgent credential verification?",
                "options": [
                    {"id": "opt_1", "text": "Click the link immediately to prevent account suspension", "is_correct": False},
                    {"id": "opt_2", "text": "Forward email to IT Security and do not click any links", "is_correct": True},
                    {"id": "opt_3", "text": "Reply with fake credentials to test the sender", "is_correct": False},
                    {"id": "opt_4", "text": "Ignore the email and delete it without reporting", "is_correct": False}
                ],
                "correct_answer": "Forward email to IT Security and do not click any links",
                "explanation": "Immediate reporting to IT Security alerts the defensive team to block malicious domains across the organization.",
                "difficulty": "medium",
                "default_time_limit": 25,
                "default_points": 100
            },
            {
                "question_type": "true_false",
                "question_text": "True or False: Multi-Factor Authentication (MFA) codes can be shared with colleagues if working on the same project.",
                "options": [
                    {"id": "opt_1", "text": "True", "is_correct": False},
                    {"id": "opt_2", "text": "False", "is_correct": True}
                ],
                "correct_answer": "False",
                "explanation": "MFA codes are private, time-sensitive security factors and must never be shared under any circumstances.",
                "difficulty": "easy",
                "default_time_limit": 15,
                "default_points": 100
            }
        ]
    })
    assert create_quiz_resp.status_code == 200, f"Quiz creation failed: {create_quiz_resp.text}"
    created_quiz = create_quiz_resp.json()
    quiz_id = created_quiz["id"]
    assert len(created_quiz["quiz_questions"]) == 2
    print(f"✓ Quiz created: '{created_quiz['title']}' (ID: {quiz_id}) with {len(created_quiz['quiz_questions'])} questions")

    # Edit Quiz
    edit_resp = client.put(f"/api/quizzes/{quiz_id}", headers=admin_headers, json={
        "title": "2026 Enterprise Security & Compliance Assessment (Updated)"
    })
    assert edit_resp.status_code == 200
    assert edit_resp.json()["title"] == "2026 Enterprise Security & Compliance Assessment (Updated)"
    print("✓ Quiz updated successfully via admin PUT endpoint")

    # Launch Session
    session_resp = client.post("/api/sessions", headers=admin_headers, json={
        "quiz_id": quiz_id,
        "game_mode": "classic",
        "settings_override": {"time_limit": 20}
    })
    assert session_resp.status_code == 200, f"Failed to create session: {session_resp.text}"
    session_data = session_resp.json()
    session_id = session_data["id"]
    session_code = session_data["session_code"]
    print(f"✓ Live Game Session launched: ID {session_id} | Game PIN: {session_code}")

    # Admin lists sessions
    list_sess_resp = client.get("/api/sessions", headers=admin_headers)
    assert list_sess_resp.status_code == 200
    found = any(s["session_code"] == session_code for s in list_sess_resp.json())
    assert found, "Created session not found in admin session list"
    print("✓ Session successfully listed in Admin Live Sessions table")

    # 4. Role Enforcement Verification: Employee Forbidden on Admin APIs
    print("\n[STEP 5] Testing Backend Authorization Enforcement (Role Restrictions)...")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Employee tries to access /api/employees (Employee Management)
    emp_list_try = client.get("/api/employees", headers=emp_headers)
    assert emp_list_try.status_code == 403, f"Expected 403 Forbidden on /api/employees, got {emp_list_try.status_code}"
    print("✓ Server blocked Employee from /api/employees (403 Forbidden)")

    # Employee tries to create a quiz
    emp_quiz_try = client.post("/api/quizzes", headers=emp_headers, json={"title": "Hacked Quiz"})
    assert emp_quiz_try.status_code == 403, f"Expected 403 Forbidden on /api/quizzes POST, got {emp_quiz_try.status_code}"
    print("✓ Server blocked Employee from creating quiz (403 Forbidden)")

    # Employee tries to list all sessions
    emp_sess_try = client.get("/api/sessions", headers=emp_headers)
    assert emp_sess_try.status_code == 403, f"Expected 403 Forbidden on /api/sessions, got {emp_sess_try.status_code}"
    print("✓ Server blocked Employee from listing administrative sessions (403 Forbidden)")

    # Admin accessing /api/employees works cleanly
    admin_emp_resp = client.get("/api/employees", headers=admin_headers)
    assert admin_emp_resp.status_code == 200
    print(f"✓ Admin authorized to view employee directory ({len(admin_emp_resp.json())} employees registered)")

    # 5. Employee Gameplay Flow: Join by PIN -> Answer Question -> Earn XP
    print("\n[STEP 6] Testing Employee Gameplay Journey: Join PIN -> Answer -> Points & XP...")
    join_resp = client.post("/api/participants/join", json={
        "session_code": session_code,
        "display_name": "Aina",
        "avatar_config": {"base": "fox", "color": "#0F766E", "hair": "stylish"}
    })
    assert join_resp.status_code == 200, f"Employee failed to join: {join_resp.text}"
    participant_data = join_resp.json()
    participant_id = participant_data["participant_id"]
    print(f"✓ Employee joined with PIN {session_code}: {participant_data['display_name']} (ID: {participant_id})")

    # Host starts the game
    start_resp = client.post(f"/api/sessions/{session_id}/start")
    assert start_resp.status_code == 200
    started_session = start_resp.json()
    print("✓ Admin started the game session")

    # Employee submits correct answer for Q1
    q1_data = started_session["current_question"]
    assert q1_data is not None
    q1_id = q1_data["question_id"]

    ans_resp = client.post("/api/participants/answers", json={
        "session_id": session_id,
        "participant_id": participant_id,
        "question_id": q1_id,
        "selected_answer": "opt_2",
        "response_time_seconds": 3.5
    })
    assert ans_resp.status_code == 200, f"Submit answer failed: {ans_resp.text}"
    ans_data = ans_resp.json()
    assert ans_data["is_correct"] is True
    assert ans_data["points_earned"] > 0
    print(f"✓ Employee submitted correct answer! Points awarded: {ans_data['points_earned']} | Streak: {ans_data['streak_count']}")

    # 6. Cryptographic Token Persistence Across Simulated Server Restarts
    print("\n[STEP 7] Testing Token Persistence Across Simulated Backend Server Restart...")
    # Clear in-memory token cache to simulate complete server reboot
    ACTIVE_TOKENS.clear()
    assert len(ACTIVE_TOKENS) == 0
    print("✓ In-memory token cache cleared (simulating server crash/reboot)")

    # Verify that the HMAC-signed token still authenticates seamlessly
    restart_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {active_token}"})
    assert restart_resp.status_code == 200, f"Token failed after restart: {restart_resp.text}"
    recovered_user = restart_resp.json()
    assert recovered_user["email"] == test_email
    print(f"✓ Token verification succeeded post-restart: Authenticated {recovered_user['name']} via cryptographic signature")

    print("\n" + "=" * 70)
    print("🎉 ALL QUALITY CONTROL & USER JOURNEY TESTS COMPLETED SUCCESSFULLY! (100%)")
    print("=" * 70)

if __name__ == "__main__":
    test_complete_user_journey()
