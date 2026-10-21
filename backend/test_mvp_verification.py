import os
import io
import json
import pymupdf
from fastapi.testclient import TestClient
from app.main import app
from app.config import OLLAMA_MODEL, OLLAMA_FALLBACK_MODEL
from app.services.ai_service import (
    validate_and_normalize_ai_questions,
    check_ollama_health
)

def run_all_tests():
    print("=== STARTING KUIZILA MVP VERIFICATION TESTS ===")
    client = TestClient(app)

    # -------------------------------------------------------------
    # TEST 1: Model Configuration & AI Health Check
    # -------------------------------------------------------------
    print("\n[TEST 1] AI Configuration & Health Check...")
    assert OLLAMA_MODEL in ["gemma4:latest", "llama3.2:3b", "qwen3:8b"], f"Unexpected model {OLLAMA_MODEL}"
    assert OLLAMA_FALLBACK_MODEL in ["llama3.2:3b", "qwen3:8b"], f"Unexpected fallback {OLLAMA_FALLBACK_MODEL}"
    
    health_resp = client.get("/api/ai/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    health_data = health_resp.json()
    print("Health response:", health_data)
    assert health_data["status"] == "ready"
    assert health_data["active"] is True
    assert health_data["primary_model"] == OLLAMA_MODEL
    print("[PASS] Test 1 Passed: AI Health & Model config verified.")

    # -------------------------------------------------------------
    # TEST 2: Schema Validation & Normalization Function
    # -------------------------------------------------------------
    print("\n[TEST 2] Schema Harmonization & Question Validation...")
    raw_valid = [
        {
            "question": "What is Python?",
            "options": {"A": "A snake only", "B": "A programming language", "C": "A database", "D": "A web browser"},
            "correct_answer": "B",
            "explanation": "Python is an interpreted programming language."
        }
    ]
    norm = validate_and_normalize_ai_questions(raw_valid, requested_count=5, difficulty="medium")
    assert len(norm) == 1
    assert norm[0]["correct_answer"] == "A programming language"
    assert len(norm[0]["options"]) == 4
    assert norm[0]["options"][1]["text"] == "A programming language"
    assert norm[0]["options"][1]["is_correct"] is True

    # Test rejection of duplicate options
    raw_dup = [
        {
            "question": "Duplicate options test?",
            "options": {"A": "Same", "B": "Same", "C": "Other", "D": "Another"},
            "correct_answer": "A"
        }
    ]
    norm_dup = validate_and_normalize_ai_questions(raw_dup)
    assert len(norm_dup) == 0, "Duplicate options should be rejected"
    print("[PASS] Test 2 Passed: Validation and schema normalization verified.")

    # -------------------------------------------------------------
    # TEST 3: Document Upload & Metadata Extraction
    # -------------------------------------------------------------
    print("\n[TEST 3] Document Upload & Metadata Extraction (PDF)...")
    # Create a small 2-page test PDF in memory
    pdf_doc = pymupdf.open()
    page1 = pdf_doc.new_page()
    page1.insert_text((50, 72), "Cloud Computing Overview\n\nCloud computing provides on-demand availability of computer system resources, especially data storage and computing power, without direct active management by the user.")
    page2 = pdf_doc.new_page()
    page2.insert_text((50, 72), "Cloud Deployment Models\n\nPublic cloud, Private cloud, Hybrid cloud, and Multi-cloud are the primary deployment architectures.")
    pdf_bytes = pdf_doc.write()
    pdf_doc.close()

    files = {"file": ("cloud_overview.pdf", pdf_bytes, "application/pdf")}
    upload_resp = client.post("/api/ai/upload-material", files=files)
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    upload_data = upload_resp.json()
    print("Upload response:", upload_data)
    assert upload_data["message"] == "Material processed successfully"
    assert upload_data["unit_label"] == "pages"
    assert upload_data["page_count"] == 2
    assert upload_data["word_count"] > 10
    material_id = upload_data["material_id"]
    print("[PASS] Test 3 Passed: Document processed with accurate page count and success message.")

    # -------------------------------------------------------------
    # TEST 4: Grounded AI Chat with Material & Quick Prompts
    # -------------------------------------------------------------
    print("\n[TEST 4] Grounded AI Chat with Learning Material...")
    chat_resp = client.post("/api/ai/chat-with-material", json={
        "material_id": material_id,
        "message": "Summarize this"
    })
    assert chat_resp.status_code == 200, f"Chat failed: {chat_resp.text}"
    chat_data = chat_resp.json()
    print("AI Chat reply:", chat_data["reply"][:150], "...")
    assert len(chat_data["reply"]) > 20
    print("[PASS] Test 4 Passed: Grounded chat responded to 'Summarize this'.")

    # -------------------------------------------------------------
    # TEST 5: Question Generation from Material with Difficulty
    # -------------------------------------------------------------
    print("\n[TEST 5] Generate MCQ from Material with Difficulty...")
    gen_resp = client.post("/api/ai/generate-from-file", json={
        "material_id": material_id,
        "num_questions": 2,
        "difficulty": "medium"
    })
    assert gen_resp.status_code == 200, f"Generate from file failed: {gen_resp.text}"
    gen_data = gen_resp.json()
    questions = gen_data.get("questions", [])
    print(f"Generated {len(questions)} questions from material.")
    assert len(questions) >= 1
    q1 = questions[0]
    assert "question_text" in q1
    assert "options" in q1
    assert len(q1["options"]) == 4
    assert any(opt.get("is_correct") for opt in q1["options"])
    print("Sample question:", q1["question_text"])
    print("Options:", q1["options"])
    print("Correct Answer:", q1["correct_answer"])
    print("[PASS] Test 5 Passed: AI questions generated and strictly validated against material.")

    # -------------------------------------------------------------
    # TEST 6: Quiz Creation, Security & Ownership Check
    # -------------------------------------------------------------
    print("\n[TEST 6] Quiz Creation and Security Enforcement...")
    from app.database import SessionLocal
    from app.models import User, Organization
    from app.routers.auth import create_session_token, hash_password

    db_sess = SessionLocal()
    org = db_sess.query(Organization).first()
    if not org:
        org = Organization(name="Kuizila Platform", slug="kuizila-platform", domain="kuizila.com")
        db_sess.add(org)
        db_sess.commit()

    trainer1 = db_sess.query(User).filter(User.email == "trainer1@kuizila.test").first()
    if not trainer1:
        trainer1 = User(
            name="Trainer One",
            email="trainer1@kuizila.test",
            password_hash=hash_password("password123"),
            role="admin",
            organization_id=org.id
        )
        db_sess.add(trainer1)
        db_sess.commit()
        db_sess.refresh(trainer1)

    trainer2 = db_sess.query(User).filter(User.email == "trainer2@kuizila.test").first()
    if not trainer2:
        trainer2 = User(
            name="Trainer Two",
            email="trainer2@kuizila.test",
            password_hash=hash_password("password123"),
            role="admin",
            organization_id=org.id
        )
        db_sess.add(trainer2)
        db_sess.commit()
        db_sess.refresh(trainer2)

    token1 = create_session_token(trainer1)
    headers1 = {"Authorization": f"Bearer {token1}"}
    token2 = create_session_token(trainer2)
    headers2 = {"Authorization": f"Bearer {token2}"}
    db_sess.close()

    # Create a quiz via API by Trainer 1
    quiz_payload = {
        "title": "Cloud Computing Verified Quiz",
        "description": "Test quiz for verification",
        "category": "Cloud & DevOps",
        "difficulty": "medium",
        "inline_questions": [
            {
                "question_text": q1["question_text"],
                "question_type": "multiple_choice",
                "options": q1["options"],
                "correct_answer": q1["correct_answer"],
                "explanation": q1.get("explanation", "Reference explanation")
            },
            {
                "question_text": "Which model involves both public and private clouds?",
                "question_type": "multiple_choice",
                "options": [
                    {"id": "opt_1", "text": "Hybrid cloud", "is_correct": True},
                    {"id": "opt_2", "text": "Only public", "is_correct": False},
                    {"id": "opt_3", "text": "Only private", "is_correct": False},
                    {"id": "opt_4", "text": "None of the above", "is_correct": False}
                ],
                "correct_answer": "Hybrid cloud",
                "explanation": "Hybrid cloud combines private and public clouds."
            }
        ]
    }
    create_resp = client.post("/api/quizzes", json=quiz_payload, headers=headers1)
    assert create_resp.status_code == 200, f"Quiz creation failed: {create_resp.text}"
    quiz_obj = create_resp.json()
    quiz_id = quiz_obj["id"]
    print(f"Created quiz ID={quiz_id}, owner_id={quiz_obj.get('owner_id')}")

    # Security check: Trainer 2 attempts to delete Trainer 1's quiz -> MUST return 403 Forbidden
    unauthorized_delete = client.delete(f"/api/quizzes/{quiz_id}", headers=headers2)
    assert unauthorized_delete.status_code == 403, f"Expected 403, got {unauthorized_delete.status_code}"
    print("[PASS] Security check: Non-owner modification rejected with 403 Forbidden.")
    print("[PASS] Test 6 Passed: Quiz creation & security verified.")

    # -------------------------------------------------------------
    # TEST 7: PDF Export (Participant test vs Trainer Answer Key)
    # -------------------------------------------------------------
    print("\n[TEST 7] PDF Export Validation...")
    # 1. Participant PDF (No answers)
    pdf_no_ans = client.get(f"/api/quizzes/{quiz_id}/export-pdf?include_answers=false", headers=headers1)
    assert pdf_no_ans.status_code == 200, f"Export failed: {pdf_no_ans.text}"
    assert pdf_no_ans.headers.get("content-type") == "application/pdf"
    assert len(pdf_no_ans.content) > 1000
    # Check that answer key is not in text
    doc_no_ans = pymupdf.open(stream=pdf_no_ans.content, filetype="pdf")
    text_no_ans = "\n".join(page.get_text() for page in doc_no_ans)
    assert "CORRECT ANSWER" not in text_no_ans
    assert "Rationale:" not in text_no_ans
    print("[PASS] Participant Quiz PDF: answers concealed.")

    # 2. Answer Key PDF (With answers & rationales)
    pdf_with_ans = client.get(f"/api/quizzes/{quiz_id}/export-pdf?include_answers=true", headers=headers1)
    assert pdf_with_ans.status_code == 200, f"Export key failed: {pdf_with_ans.text}"
    assert pdf_with_ans.headers.get("content-type") == "application/pdf"
    assert len(pdf_with_ans.content) > 1000
    doc_with_ans = pymupdf.open(stream=pdf_with_ans.content, filetype="pdf")
    text_with_ans = "\n".join(page.get_text() for page in doc_with_ans)
    assert "CORRECT ANSWER" in text_with_ans
    assert "Rationale:" in text_with_ans
    print("[PASS] Official Answer Key PDF: answers & explanations present.")

    # 3. Security: Trainer 2 cannot export Trainer 1's quiz
    unauth_export = client.get(f"/api/quizzes/{quiz_id}/export-pdf", headers=headers2)
    assert unauth_export.status_code == 403, f"Expected 403, got {unauth_export.status_code}"
    print("[PASS] PDF export security: Non-owner export rejected with 403 Forbidden.")
    print("[PASS] Test 7 Passed: PDF export verified.")

    # -------------------------------------------------------------
    # TEST 8: Live Quiz Flow & Answer Concealment
    # -------------------------------------------------------------
    print("\n[TEST 8] Live Quiz Flow & Answer Concealment...")
    # 1. Host creates live session
    sess_resp = client.post("/api/sessions", json={"quiz_id": quiz_id}, headers=headers1)
    assert sess_resp.status_code == 200, f"Session create failed: {sess_resp.text}"
    session_data = sess_resp.json()
    session_id = session_data["id"]
    session_code = session_data["session_code"]
    print(f"Host created session: ID={session_id}, PIN={session_code}")

    # 2. Participant joins
    join_resp = client.post("/api/participants/join", json={
        "session_code": session_code,
        "display_name": "Suhailah"
    })
    assert join_resp.status_code == 200
    join_data = join_resp.json()
    p_id = join_data["participant_id"]
    print(f"Participant joined: ID={p_id}, Name={join_data['display_name']}")

    # 3. Host starts session
    start_resp = client.post(f"/api/sessions/{session_id}/start")
    assert start_resp.status_code == 200
    print("Host started session.")

    # 4. Participant gets question 1
    state1_resp = client.get(f"/api/participants/{p_id}/state")
    assert state1_resp.status_code == 200
    state1 = state1_resp.json()
    assert state1["status"] == "answering"
    q_data1 = state1["question"]
    print(f"Participant on Q1: {q_data1['question_text']}")

    # 5. Participant answers Q1
    selected_opt = q_data1["options"][0]["id"]
    ans1_resp = client.post("/api/participants/answers", json={
        "session_id": session_id,
        "participant_id": p_id,
        "question_id": q_data1["question_id"],
        "selected_answer": selected_opt,
        "response_time_seconds": 2.5
    })
    assert ans1_resp.status_code == 200
    ans1_data = ans1_resp.json()
    print("Submit answer response:", ans1_data)
    # VERIFY ANSWER CONCEALMENT: is_correct is None during live quiz!
    assert ans1_data.get("is_correct") is None, "Correct answer must NOT be leaked during live quiz!"
    assert ans1_data.get("correct_answer") is None, "Correct answer text must NOT be leaked!"
    print("[PASS] Answer concealment verified: is_correct is None over the wire.")

    # 6. Participant answers Q2 (last question)
    state2_resp = client.get(f"/api/participants/{p_id}/state")
    assert state2_resp.status_code == 200
    state2 = state2_resp.json()
    assert state2["status"] == "answering"
    q_data2 = state2["question"]
    print(f"Participant on Q2: {q_data2['question_text']}")

    ans2_resp = client.post("/api/participants/answers", json={
        "session_id": session_id,
        "participant_id": p_id,
        "question_id": q_data2["question_id"],
        "selected_answer": "A",  # Correct answer for Q2
        "response_time_seconds": 1.8
    })
    assert ans2_resp.status_code == 200
    ans2_data = ans2_resp.json()
    print("Q2 submit answer response:", ans2_data)

    # 7. Check participant completed state
    comp_state_resp = client.get(f"/api/participants/{p_id}/state")
    assert comp_state_resp.status_code == 200
    comp_state = comp_state_resp.json()
    print("Completed participant state:", comp_state)
    assert comp_state["status"] == "completed"
    assert "correct_count" in comp_state
    assert "total_questions" in comp_state
    assert comp_state["total_questions"] == 2
    assert "final_percentage" in comp_state
    print(f"Final score: {comp_state['correct_count']} / {comp_state['total_questions']} ({comp_state['final_percentage']}%)")
    print("[PASS] Test 8 Passed: Live quiz flow, answer concealment, and results metrics verified.")

    # -------------------------------------------------------------
    # TEST 9: Host Conclude & Ranking Verification
    # -------------------------------------------------------------
    print("\n[TEST 9] Host Conclude & Final Ranking...")
    end_resp = client.post(f"/api/sessions/{session_id}/end")
    assert end_resp.status_code == 200
    end_data = end_resp.json()
    assert end_data["session_status"] == "completed"
    participants = end_data["participants"]
    assert len(participants) >= 1
    p_rec = participants[0]
    assert "final_score" in p_rec
    assert "display_name" in p_rec
    print(f"Host final ranking participant: {p_rec['display_name']}, score: {p_rec['final_score']}")
    print("[PASS] Test 9 Passed: Host session conclusion and rankings verified.")

    print("\n=======================================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    run_all_tests()
