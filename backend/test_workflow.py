import urllib.request
import json

def run_tests():
    base = 'http://localhost:8000/api'
    
    # 1. Quizzes
    req = urllib.request.urlopen(f'{base}/quizzes')
    quizzes = json.loads(req.read().decode())
    print(f'1. Quizzes: {len(quizzes)} found.')
    assert len(quizzes) >= 3
    quiz_id = quizzes[0]['id']

    # 2. Questions
    req = urllib.request.urlopen(f'{base}/questions')
    questions = json.loads(req.read().decode())
    print(f'2. Question Bank: {len(questions)} reusable questions.')
    assert len(questions) >= 10

    # 3. Dashboard KPIs
    req = urllib.request.urlopen(f'{base}/reports/dashboard')
    dash = json.loads(req.read().decode())
    print(f"3. Dashboard KPIs: {dash['kpis']}")
    assert dash['kpis']['total_quizzes'] >= 3

    # 4. Create Live Session
    data = json.dumps({'quiz_id': quiz_id}).encode()
    req = urllib.request.Request(f'{base}/sessions', data=data, headers={'Content-Type': 'application/json'})
    sess = json.loads(urllib.request.urlopen(req).read().decode())
    sess_id = sess['id']
    code = sess['session_code']
    print(f'4. Session created: ID={sess_id}, PIN={code}')

    # 5. Join Session
    j_data = json.dumps({'session_code': code, 'display_name': 'Test Employee'}).encode()
    req = urllib.request.Request(f'{base}/participants/join', data=j_data, headers={'Content-Type': 'application/json'})
    part = json.loads(urllib.request.urlopen(req).read().decode())
    p_id = part['participant_id']
    print(f"5. Participant joined: ID={p_id}, Name={part['display_name']}")

    # 6. Start Session
    req = urllib.request.Request(f'{base}/sessions/{sess_id}/start', data=b'', headers={'Content-Type': 'application/json'})
    started = json.loads(urllib.request.urlopen(req).read().decode())
    q_curr = started['current_question']
    print(f"6. Session started: Status={started['session_status']}, Question={q_curr['question_text'][:40]}...")

    # 7. Submit Answer
    ans_data = json.dumps({
        'session_id': sess_id,
        'participant_id': p_id,
        'question_id': q_curr['question_id'],
        'selected_answer': 'opt_1',
        'response_time_seconds': 4.2
    }).encode()
    req = urllib.request.Request(f'{base}/participants/answers', data=ans_data, headers={'Content-Type': 'application/json'})
    ans_res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"7. Answer submitted: Correct={ans_res['is_correct']}, Points={ans_res['points_earned']}, Streak={ans_res['streak_count']}")

    # 8. End Session
    req = urllib.request.Request(f'{base}/sessions/{sess_id}/end', data=b'', headers={'Content-Type': 'application/json'})
    ended = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"8. Session ended: Status={ended['session_status']}")

    # 9. CSV Report Export
    req = urllib.request.urlopen(f'{base}/reports/sessions/{sess_id}/csv')
    csv_bytes = req.read()
    print(f'9. CSV Report generated: {len(csv_bytes)} bytes downloaded.')
    assert b'KUIZILA EMPLOYEE QUIZ REPORT' in csv_bytes

    # 10. AI Health check
    req = urllib.request.urlopen(f'{base}/ai/health')
    ai_h = json.loads(req.read().decode())
    print(f"10. AI Health: {ai_h['status']} ({ai_h.get('provider', 'AI Engine')})")

    print('\nALL 10 END-TO-END WORKFLOW CHECKS PASSED!')

if __name__ == '__main__':
    run_tests()
