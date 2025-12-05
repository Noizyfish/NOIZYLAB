# core/ai_summary.py

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional

from .logs import get_latest_log_file, tail_log_file, log_event


def _build_stub_summary(log_lines: List[str], log_file: Optional[Path]) -> str:
    header = "=== AI SUMMARY (STUB) ==="
    if log_file:
        header += f"\nLog file: {log_file.name}"
    header += f"\nLines analyzed: {len(log_lines)}\n"
    body = "\n".join(log_lines) if log_lines else "(no log lines)"
    return f"{header}\n\n{body}\n\n(real AI summary not yet implemented)"


def summarize_logs(num_lines: int = 40) -> str:
    """
    Summarize the latest log file.

    For now, this:
    - finds latest nlctl-YYYYMMDD.log
    - reads last N lines
    - returns stub text

    You can later:
    - Integrate OpenAI if OPENAI_API_KEY is set
    """
    log_file = get_latest_log_file()
    if not log_file:
        msg = "No log files found in logs/"
        log_event("ai-summary", "no logs found")
        return f"=== AI SUMMARY ===\n{msg}\n"

    lines = tail_log_file(log_file, lines=num_lines)

    # Optional: integrate OpenAI if env var set
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Stub mode
        summary = _build_stub_summary(lines, log_file)
        log_event(
            "ai-summary",
            "stub summary generated (no OPENAI_API_KEY set)",
            extra={"log_file": log_file.name, "lines": num_lines},
        )
        return summary

    # --- Real AI integration (optional, requires `openai` package) ---

    try:
        from openai import OpenAI  # type: ignore
    except ImportError:
        # Fallback to stub if library not installed
        summary = _build_stub_summary(lines, log_file)
        log_event(
            "ai-summary",
            "stub summary generated (openai package missing)",
            extra={"log_file": log_file.name, "lines": num_lines},
        )
        return summary

    client = OpenAI(api_key=api_key)

    text_block = "\n".join(lines)
    prompt = (
        "You are a system diagnostic assistant for an IT repair environment.\n"
        "You will be given recent log lines from a tool called nlctl.\n\n"
        "Provide a concise summary with the following sections:\n"
        "1) Overall status\n"
        "2) Key issues\n"
        "3) Suggested next actions\n\n"
        "Use short bullet points where helpful.\n\n"
        f"LOG LINES:\n{text_block}\n"
    )

    try:
        # Using the Responses API-style call; adjust if needed for your environment.
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You summarize infrastructure and diagnostic logs."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        content = response.choices[0].message.content
    except Exception as exc:  # pragma: no cover - network/API issues
        summary = _build_stub_summary(lines, log_file)
        log_event(
            "ai-summary",
            f"stub summary generated (AI call failed: {exc})",
            extra={"log_file": log_file.name, "lines": num_lines},
        )
        return summary

    log_event(
        "ai-summary",
        "AI summary generated",
        extra={"log_file": log_file.name, "lines": num_lines},
    )

    header = "=== AI SUMMARY ==="
    header += f"\nLog file: {log_file.name}\nLines analyzed: {len(lines)}\n"
    return f"{header}\n\n{content}"
