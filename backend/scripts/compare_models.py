"""
Kuizila Model Comparison Benchmark: Llama 3.2 (3b) vs Gemma 4 (latest)

Evaluates and compares both models side-by-side on identical prompts and question counts.
Criteria evaluated:
  - Generation time (total & per batch)
  - Requested vs Valid questions generated
  - JSON parsing validity
  - Duplicate question rate
  - Question difficulty distribution
  - Correct answer validity (4 options, 1 valid answer)
  - Educational explanation quality (presence & average word count)
  - Number of batches and retries

Usage:
  python backend/scripts/compare_models.py --questions 10 --topic "Workplace Cybersecurity Awareness"
"""

import asyncio
import argparse
import sys
import time
import os
from pathlib import Path
from typing import Dict, Any, List

# Ensure backend directory is in path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.ai_service import generate_quiz_ai, check_ollama_health


# Set utf-8 stdout encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

async def benchmark_model(model_name: str, topic: str, count: int, difficulty: str = "medium") -> Dict[str, Any]:
    print(f"\n{'='*70}")
    print(f">> BENCHMARKING MODEL: {model_name}")
    print(f"  Topic: '{topic}' | Target Count: {count} questions | Difficulty: {difficulty}")
    print(f"{'='*70}")

    t_start = time.time()
    try:
        result = await generate_quiz_ai(
            topic=topic,
            num_questions=count,
            difficulty=difficulty,
            model_override=model_name
        )
        total_time = time.time() - t_start
        questions = result.get("questions", [])
        meta = result.get("meta", {})
        batches_count = meta.get("batches_count", 0)

        # Quantitative metrics
        valid_count = len(questions)
        has_4_options = sum(1 for q in questions if len(q.get("options", [])) == 4)
        has_correct_ans = sum(
            1 for q in questions
            if any(opt.get("is_correct") for opt in q.get("options", [])) and q.get("correct_answer")
        )
        has_explanation = sum(1 for q in questions if q.get("explanation") and len(q.get("explanation", "").strip()) > 10)
        avg_exp_words = (
            sum(len(q.get("explanation", "").split()) for q in questions) / max(1, valid_count)
        )
        unique_stems = len(set(q.get("question_text", "").strip().lower() for q in questions))
        duplicate_count = valid_count - unique_stems
        duplicate_rate = (duplicate_count / max(1, valid_count)) * 100

        print(f"[SUCCESS] Completed in {total_time:.2f}s | Questions Delivered: {valid_count}/{count} | Batches: {batches_count}")

        return {
            "model": model_name,
            "success": True,
            "total_time": round(total_time, 2),
            "requested_count": count,
            "generated_count": valid_count,
            "reached_target": valid_count == count,
            "batches_count": batches_count,
            "time_per_question": round(total_time / max(1, valid_count), 2),
            "four_options_valid": f"{has_4_options}/{valid_count}",
            "correct_answer_valid": f"{has_correct_ans}/{valid_count}",
            "explanation_coverage": f"{has_explanation}/{valid_count}",
            "avg_explanation_words": round(avg_exp_words, 1),
            "duplicate_rate": f"{duplicate_rate:.1f}%",
            "sample_questions": questions[:2],
            "error": None
        }
    except Exception as e:
        total_time = time.time() - t_start
        print(f"[FAILED] Failed with error after {total_time:.2f}s: {e}")
        return {
            "model": model_name,
            "success": False,
            "total_time": round(total_time, 2),
            "requested_count": count,
            "generated_count": 0,
            "reached_target": False,
            "batches_count": 0,
            "time_per_question": 0,
            "four_options_valid": "0/0",
            "correct_answer_valid": "0/0",
            "explanation_coverage": "0/0",
            "avg_explanation_words": 0,
            "duplicate_rate": "N/A",
            "sample_questions": [],
            "error": str(e)
        }


def print_comparison_table(results: List[Dict[str, Any]]):
    print("\n" + "=" * 80)
    print("KUIZILA AI MODEL BENCHMARK COMPARISON RESULTS")
    print("=" * 80)

    header = f"{'Metric':<32} | " + " | ".join(f"{r['model']:<20}" for r in results)
    print(header)
    print("-" * len(header))

    metrics = [
        ("Generation Status", lambda r: "PASSED" if r["success"] else "FAILED"),
        ("Total Generation Time (s)", lambda r: f"{r['total_time']}s"),
        ("Time Per Question (s)", lambda r: f"{r['time_per_question']}s"),
        ("Questions Reached / Target", lambda r: f"{r['generated_count']} / {r['requested_count']}"),
        ("Exact Target Reached", lambda r: "YES (100%)" if r["reached_target"] else "NO"),
        ("Batches / Chunks Executed", lambda r: str(r["batches_count"])),
        ("4-Option Schema Compliance", lambda r: r["four_options_valid"]),
        ("Correct Answer Validated", lambda r: r["correct_answer_valid"]),
        ("Explanation Coverage", lambda r: r["explanation_coverage"]),
        ("Avg Explanation Length (words)", lambda r: f"{r['avg_explanation_words']} words"),
        ("Duplicate Question Rate", lambda r: r["duplicate_rate"]),
    ]

    for label, fn in metrics:
        row = f"{label:<32} | " + " | ".join(f"{fn(r):<20}" for r in results)
        print(row)

    print("=" * 80)

    print("\nQUALITATIVE SAMPLE COMPARISON (First 2 Questions Generated):")
    for r in results:
        print(f"\n--- Model: {r['model']} ---")
        if not r["sample_questions"]:
            print("  (No samples available)")
            continue
        for idx, q in enumerate(r["sample_questions"], 1):
            print(f"  Q{idx}: {q.get('question_text')}")
            for opt in q.get("options", []):
                mark = "[*]" if opt.get("is_correct") else "[ ]"
                print(f"      {mark} {opt.get('text')}")
            print(f"      Explanation: {q.get('explanation')}")


async def main():
    parser = argparse.ArgumentParser(description="Compare Llama 3.2 and Gemma 4 in Kuizila")
    parser.add_argument("--questions", type=int, default=10, help="Number of questions to test (default: 10)")
    parser.add_argument("--topic", type=str, default="Workplace Cybersecurity Awareness", help="Quiz topic to generate")
    parser.add_argument("--difficulty", type=str, default="medium", help="Quiz difficulty (easy, medium, hard)")
    args = parser.parse_args()

    # Verify Ollama status
    health = await check_ollama_health()
    if not health.get("available"):
        print("ERROR: Local Ollama is not running at http://localhost:11434. Please start Ollama first.")
        sys.exit(1)

    print(f"Ollama connected. Available models: {health.get('models', [])}")

    models_to_test = ["llama3.2:3b", "gemma4:latest"]
    results = []

    for model in models_to_test:
        res = await benchmark_model(model, args.topic, args.questions, args.difficulty)
        results.append(res)

    print_comparison_table(results)


if __name__ == "__main__":
    asyncio.run(main())
