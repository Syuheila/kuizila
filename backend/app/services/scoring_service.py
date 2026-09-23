from typing import Any, Dict, List, Tuple

def evaluate_answer(
    question_type: str,
    options: List[Dict[str, Any]],
    correct_answer_text: str,
    selected_answer: Any,
    base_points: int = 100,
    time_limit: int = 30,
    response_time: float = 0.0,
    current_streak: int = 0,
    enable_speed_bonus: bool = True,
    double_points: bool = False
) -> Tuple[bool, int, int]:
    """
    Evaluates an answer and calculates points and streak.
    Returns: (is_correct, points_earned, new_streak)
    """
    is_correct = False
    
    if question_type == "multiple_choice":
        # selected_answer is option id e.g. "opt_1" or text
        correct_ids = [str(opt.get("id")) for opt in options if opt.get("is_correct")]
        if not correct_ids and correct_answer_text:
            correct_ids = [correct_answer_text.strip().lower()]
        
        sel = str(selected_answer).strip().lower() if selected_answer is not None else ""
        for opt in options:
            if opt.get("is_correct"):
                if str(opt.get("id")).lower() == sel or str(opt.get("text")).strip().lower() == sel:
                    is_correct = True
                    break

    elif question_type == "true_false":
        sel = str(selected_answer).strip().lower()
        # look in options or correct_answer_text
        for opt in options:
            if opt.get("is_correct"):
                if str(opt.get("id")).lower() == sel or str(opt.get("text")).strip().lower() == sel:
                    is_correct = True
                    break
        if not is_correct and correct_answer_text:
            if sel == correct_answer_text.strip().lower():
                is_correct = True

    elif question_type == "multiple_select":
        # selected_answer is list of option ids
        correct_ids = {str(opt.get("id")).lower() for opt in options if opt.get("is_correct")}
        if isinstance(selected_answer, list):
            sel_ids = {str(x).lower() for x in selected_answer}
        else:
            sel_ids = {str(selected_answer).lower()} if selected_answer else set()
        
        is_correct = (sel_ids == correct_ids and len(correct_ids) > 0)

    elif question_type == "short_answer":
        sel = str(selected_answer).strip().lower() if selected_answer else ""
        expected = str(correct_answer_text or "").strip().lower()
        is_correct = (sel == expected and len(expected) > 0)

    elif question_type == "matching":
        # Matching terms: selected_answer is dict or string
        if isinstance(selected_answer, dict):
            # Check if all pairs match
            all_match = True
            for opt in options:
                opt_id = str(opt.get("id"))
                expected_match = str(opt.get("match_target") or opt.get("text"))
                if str(selected_answer.get(opt_id, "")).strip().lower() != expected_match.strip().lower():
                    all_match = False
                    break
            is_correct = all_match and len(options) > 0
        else:
            is_correct = (str(selected_answer).strip().lower() == str(correct_answer_text).strip().lower())

    elif question_type == "poll":
        # Poll is a survey question; all answers are valid and receive participation points
        is_correct = True
        return True, 50, current_streak

    else:
        # Fallback
        is_correct = False

    if not is_correct:
        return False, 0, 0

    # Calculate points with speed bonus and streak
    new_streak = current_streak + 1
    points = base_points

    if enable_speed_bonus and time_limit > 0:
        # Faster answers get up to 50% bonus points
        time_ratio = max(0.0, min(1.0, response_time / time_limit))
        speed_factor = max(0.0, 1.0 - (time_ratio * 0.8)) # 1.0 down to 0.2
        points = int(base_points * 0.7 + (base_points * 0.3 * speed_factor))

    # Streak bonus (e.g. +10% per streak level, capped at +50%)
    streak_bonus = min(0.5, (new_streak - 1) * 0.1) if new_streak > 1 else 0.0
    total_points = int(points * (1.0 + streak_bonus))

    # Power-up: Double points
    if double_points:
        total_points *= 2

    return True, total_points, new_streak
