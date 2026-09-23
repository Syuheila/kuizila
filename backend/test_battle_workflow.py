import sys
import os
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend directory to sys.path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, ensure_schema_compatibility, SessionLocal
from app.seed import seed_database, seed_achievements_and_profiles
from app.models import Quiz, QuizSession, Participant, PlayerProfile, BattleTeam, Achievement

def run_tests():
    print("=== [1/6] Running DB Migrations & Seeding ===")
    ensure_schema_compatibility(engine)
    db = SessionLocal()
    seed_database(db)
    seed_achievements_and_profiles(db)
    db.close()
    print("✓ Database ready.")

    client = TestClient(app)

    print("\n=== [2/6] Testing Player Profiles & Gamification ===")
    # Profile fetch
    resp = client.get("/api/profiles/player_aina_demo")
    assert resp.status_code == 200, f"Failed to get profile: {resp.text}"
    profile_data = resp.json()
    assert profile_data["display_name"] == "Aina", "Profile name mismatch"
    assert "level" in profile_data, "Missing level"
    assert "level_title" in profile_data, "Missing level title"
    print(f"✓ Profile loaded: {profile_data['display_name']} | Level {profile_data['level']} ({profile_data['level_title']}) | XP: {profile_data['total_xp']}")

    # Update avatar
    new_avatar = {
        "base": "panda",
        "color": "#123B5D",
        "hair": "stylish",
        "outfit": "executive",
        "accessory": "headset",
        "bg": "#DCFCE7",
        "frame": "gold_crown"
    }
    resp = client.post("/api/profiles/player_aina_demo/avatar", json=new_avatar)
    assert resp.status_code == 200, f"Failed to update avatar: {resp.text}"
    updated = resp.json()
    assert updated["avatar_config"]["base"] == "panda", "Avatar base update failed"
    print(f"✓ Avatar updated to base: {updated['avatar_config']['base']}")

    # Add XP
    resp = client.post("/api/profiles/player_aina_demo/add-xp", json={"xp_amount": 250, "reason": "test_win"})
    assert resp.status_code == 200, f"Failed to add XP: {resp.text}"
    xp_res = resp.json()

    print(f"✓ Added XP: New Total = {xp_res['total_xp']} | Level = {xp_res['level']} | Leveled Up = {xp_res['leveled_up']}")

    print("\n=== [3/6] Testing Team Battle Mode ===")
    # Get a quiz
    db = SessionLocal()
    quiz = db.query(Quiz).first()
    assert quiz is not None, "No quiz found in DB"
    quiz_id = quiz.id
    db.close()

    # Create Team Battle session
    resp = client.post("/api/battles/create", json={
        "quiz_id": quiz_id,
        "game_mode": "battle_team",
        "team_count": 2,
        "team_assignment_method": "auto",
        "lives_count": 3,
        "powerups_enabled": True,
        "speed_bonus": True,
        "custom_settings": {"time_limit": 25}
    })
    assert resp.status_code == 200, f"Failed to create battle: {resp.text}"
    battle_session = resp.json()
    session_id = battle_session["session_id"]
    session_code = battle_session["session_code"]
    assert battle_session["game_mode"] == "battle_team", "Game mode mismatch"
    assert len(battle_session["teams"]) == 2, "Expected 2 teams created"
    print(f"✓ Team Battle created: Code {session_code} with teams: {[t['team_name'] for t in battle_session['teams']]}")

    # Join 2 participants with avatars
    p1_resp = client.post("/api/participants/join", json={
        "session_code": session_code,
        "display_name": "Contender Alice",
        "avatar_config": {"base": "fox", "color": "#0F766E"}
    })
    assert p1_resp.status_code == 200, f"P1 failed to join: {p1_resp.text}"
    p1 = p1_resp.json()
    assert p1["team_name"] is not None, "P1 was not assigned a team"

    p2_resp = client.post("/api/participants/join", json={
        "session_code": session_code,
        "display_name": "Contender Bob",
        "avatar_config": {"base": "bear", "color": "#123B5D"}
    })
    assert p2_resp.status_code == 200, f"P2 failed to join: {p2_resp.text}"
    p2 = p2_resp.json()
    assert p2["team_name"] is not None, "P2 was not assigned a team"
    print(f"✓ Joined Alice ({p1['team_name']}) and Bob ({p2['team_name']})")

    # Fetch team standings
    standings_resp = client.get(f"/api/battles/{session_id}/team-standings")
    assert standings_resp.status_code == 200, f"Failed to get standings: {standings_resp.text}"
    standings = standings_resp.json()
    assert len(standings) == 2, "Expected 2 team standings"
    print(f"✓ Team standings verified: {len(standings)} teams")

    print("\n=== [4/6] Testing Battle Royale Survival & Elimination ===")
    br_resp = client.post("/api/battles/create", json={
        "quiz_id": quiz_id,
        "game_mode": "battle_royale",
        "lives_count": 2,
        "powerups_enabled": True,
        "speed_bonus": True
    })
    assert br_resp.status_code == 200, f"Failed to create Battle Royale: {br_resp.text}"
    br_session = br_resp.json()
    br_code = br_session["session_code"]
    br_id = br_session["session_id"]
    print(f"✓ Battle Royale created: Code {br_code} with 2 starting lives")

    # Join participant
    br_p_resp = client.post("/api/participants/join", json={
        "session_code": br_code,
        "display_name": "Survivor Sam",
        "avatar_config": {"base": "wolf", "color": "#DC2626"}
    })
    assert br_p_resp.status_code == 200
    br_p = br_p_resp.json()
    assert br_p["remaining_lives"] == 2, f"Expected 2 lives, got {br_p['remaining_lives']}"

    # Start session
    start_resp = client.post(f"/api/sessions/{br_id}/start")
    assert start_resp.status_code == 200, f"Failed to start session: {start_resp.text}"
    started_data = start_resp.json()
    q_id = started_data["current_question"]["question_id"]

    # Submit incorrect answer 1 -> lives should become 1
    ans1_resp = client.post("/api/participants/answers", json={
        "session_id": br_id,
        "participant_id": br_p["participant_id"],
        "question_id": q_id,
        "selected_answer": "WRONG_ANSWER_VALUE",
        "response_time_seconds": 3.0
    })
    assert ans1_resp.status_code == 200, f"Ans 1 failed: {ans1_resp.text}"
    ans1 = ans1_resp.json()
    assert ans1["remaining_lives"] == 1, f"Expected 1 life remaining, got {ans1['remaining_lives']}"
    assert ans1["is_eliminated"] is False, "Participant should not be eliminated yet"
    print(f"✓ Wrong answer 1: Lives reduced to {ans1['remaining_lives']} (Alive)")

    # Advance question and submit incorrect answer 2 -> lives should become 0 and is_eliminated = True
    client.post(f"/api/sessions/{br_id}/review-question")
    client.post(f"/api/sessions/{br_id}/next-question")

    db = SessionLocal()
    curr_q = db.query(QuizSession).filter(QuizSession.id == br_id).first().quiz.quiz_questions[1].question
    q2_id = curr_q.id
    db.close()

    ans2_resp = client.post("/api/participants/answers", json={
        "session_id": br_id,
        "participant_id": br_p["participant_id"],
        "question_id": q2_id,
        "selected_answer": "WRONG_ANSWER_AGAIN",
        "response_time_seconds": 4.0
    })
    assert ans2_resp.status_code == 200
    ans2 = ans2_resp.json()
    assert ans2["remaining_lives"] == 0, f"Expected 0 lives, got {ans2['remaining_lives']}"
    assert ans2["is_eliminated"] is True, "Expected participant to be eliminated"
    print(f"✓ Wrong answer 2: Lives reduced to 0 -> ELIMINATED! (Spectator mode confirmed)")

    print("\n=== [5/6] Testing Gamification XP & Automatic Badge Unlocks ===")
    assert ans2["xp_earned"] > 0, "Expected XP earned on quiz activity"
    print(f"✓ Participant earned {ans2['xp_earned']} XP across rounds")

    # Check badges list
    badges_resp = client.get("/api/profiles/badges/all")
    assert badges_resp.status_code == 200
    all_badges = badges_resp.json()
    assert len(all_badges) >= 9, f"Expected at least 9 badges, got {len(all_badges)}"
    print(f"✓ Registered system badges verified: {len(all_badges)} badges")

    print("\n=== [6/6] Testing AI Battle Recommendations & Advisories ===")
    rec_resp = client.post("/api/ai/recommend-game-mode", json={
        "quiz_id": quiz_id,
        "estimated_participants": 14
    })
    assert rec_resp.status_code == 200, f"AI recommend failed: {rec_resp.text}"
    rec_data = rec_resp.json()
    assert "recommended_mode" in rec_data, "Missing recommended_mode"
    assert "rationale" in rec_data, "Missing rationale"
    print(f"✓ AI Game Mode Recommendation: {rec_data['recommended_mode'].upper()} (Confidence: {rec_data.get('confidence_score')}%)")
    print(f"  Rationale: {rec_data['rationale'][:85]}...")

    bal_resp = client.post("/api/ai/analyze-difficulty-balance", json={
        "quiz_id": quiz_id
    })
    assert bal_resp.status_code == 200
    bal_data = bal_resp.json()
    assert "balance_rating" in bal_data, "Missing balance_rating"
    print(f"✓ AI Difficulty Balance: {bal_data['balance_rating']} | Pacing: {bal_data.get('pacing_verdict')[:75]}...")

    cfg_resp = client.post("/api/ai/suggest-battle-config", json={
        "quiz_id": quiz_id,
        "game_mode": "team_battle",
        "num_questions": 6
    })
    assert cfg_resp.status_code == 200
    cfg_data = cfg_resp.json()
    assert "suggested_teams" in cfg_data, "Missing suggested_teams"
    print(f"✓ AI Battle Config: Suggested {len(cfg_data['suggested_teams'])} teams, Lives: {cfg_data.get('suggested_lives')}")

    print("\n🎉 ALL PHASE 2 BATTLE WORKFLOW INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n")

if __name__ == '__main__':
    run_tests()
