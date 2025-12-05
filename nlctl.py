#!/usr/bin/env python3
"""
nlctl - NoizyLab Control CLI
COMPLETE EDITION - ALL COMMANDS
"""
from __future__ import annotations
import argparse
import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List

from core.machines import load_all_machines, run_checks_for_machine
from core.logs import log_event, get_latest_log_file, tail_log_file, get_logs_dir
from core.ai_summary import summarize_logs


def cmd_status(machine_id: Optional[str] = None) -> int:
    machines = load_all_machines()
    if machine_id:
        mid = machine_id.upper()
        if mid not in machines:
            print(f"ERROR: machine '{machine_id}' not found")
            return 1
        machine = machines[mid]
        print(f"[{machine.id}] {machine.role} @ {machine.host}")
        results = run_checks_for_machine(machine)
        for r in results:
            metrics_str = ""
            if r.metrics:
                metrics_str = " | " + " ".join(f"{k}={v}" for k, v in r.metrics.items() if v is not None)
            print(f"  - {r.check_type}: {r.status} ({r.detail}){metrics_str}")
        log_event("status", f"checked {machine.id}")
        return 0

    if not machines:
        print("No machines configured")
        return 0

    print("=== MACHINE STATUS ===")
    for machine in machines.values():
        results = run_checks_for_machine(machine)
        overall = "OK"
        for r in results:
            if r.status in ("FAIL", "WARN"):
                overall = r.status
                break
        latency_ms = None
        for r in results:
            if r.check_type == "ping":
                latency_ms = r.metrics.get("latency_ms")
                break
        lat_str = f"{latency_ms:.1f} ms" if latency_ms is not None else "n/a"
        print(f"[{machine.id}] {machine.role} @ {machine.host} -> {overall} (ping {lat_str})")
    log_event("status", "checked all machines", extra={"machines": len(machines)})
    return 0


def cmd_pulse() -> int:
    print("🔥 MC96 STATUS PULSE 🔥")
    print("")
    return cmd_status()


def cmd_quick() -> int:
    print("⚡ QUICK HEALTH CHECK ⚡")
    print("")
    cmd_status()
    print("")
    print("─" * 40)
    return cmd_ai_summary(lines=20)


def cmd_log_test() -> int:
    lf = log_event("log-test", "test entry OK")
    print(f"Test log entry written to: {lf.name}")
    return 0


def cmd_log_note(note: str) -> int:
    lf = log_event("USER-NOTE", note)
    print(f"📌 Logged: {note}")
    return 0


def cmd_ai_summary(lines: int = 40) -> int:
    summary = summarize_logs(num_lines=lines)
    print(summary)
    return 0


def cmd_volumes() -> int:
    print("=== CONNECTED VOLUMES ===")
    result = subprocess.run(["df", "-h"], capture_output=True, text=True)
    for line in result.stdout.split('\n'):
        if '/Volumes/' in line:
            parts = line.split()
            if len(parts) >= 6:
                size, used, avail, cap = parts[1:5]
                mount = parts[-1]
                name = mount.split('/')[-1] if '/' in mount else mount
                # Color code by capacity
                if '99%' in cap or '98%' in cap or '97%' in cap:
                    status = "🔴"
                elif '9' in cap[0]:
                    status = "🟡"
                else:
                    status = "🟢"
                print(f"  {status} {name:25} {used:>8} / {size:>8} ({cap})")
    return 0


def cmd_scan() -> int:
    print("🔍 NETWORK SCAN")
    ips = ["10.0.0.1", "10.0.0.71", "192.168.1.1", "192.168.1.10", "192.168.1.20", "192.168.1.50", "192.168.1.100"]
    for ip in ips:
        result = subprocess.run(["ping", "-c", "1", "-W", "1", ip], capture_output=True)
        status = "✅" if result.returncode == 0 else "❌"
        print(f"  {ip:20} {status}")
    return 0


def cmd_logs(lines: int = 50) -> int:
    print("📋 RECENT LOGS")
    log_file = get_latest_log_file()
    if not log_file:
        print("No logs found")
        return 1
    print(f"File: {log_file.name}")
    print("─" * 40)
    log_lines = tail_log_file(log_file, lines=lines)
    for line in log_lines:
        print(line)
    return 0


def cmd_session_start(name: str = "dev") -> int:
    log_event("SESSION-START", f"Session: {name}")
    print(f"🚀 SESSION STARTED: {name}")
    return 0


def cmd_session_end(note: str = "complete") -> int:
    log_event("SESSION-END", note)
    print(f"🏁 SESSION ENDED: {note}")
    return 0


def cmd_health() -> int:
    print("🏥 FULL HEALTH CHECK")
    print("")
    cmd_status()
    print("")
    cmd_volumes()
    print("")
    cmd_ai_summary(lines=30)
    return 0


def cmd_report() -> int:
    print("📊 SYSTEM REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    print("")
    cmd_status()
    print("")
    cmd_volumes()
    print("")
    print("=== RECENT ACTIVITY ===")
    cmd_logs(lines=20)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="nlctl", description="NoizyLab Control CLI")
    subparsers = parser.add_subparsers(dest="command", required=False)

    # Core commands
    p = subparsers.add_parser("status", help="Machine status")
    p.add_argument("machine_id", nargs="?")
    
    subparsers.add_parser("pulse", help="MC96 Status Pulse")
    subparsers.add_parser("quick", help="Quick health check")
    subparsers.add_parser("health", help="Full health check")
    subparsers.add_parser("report", help="Full system report")
    subparsers.add_parser("volumes", help="Volume status")
    subparsers.add_parser("scan", help="Network scan")
    
    # Logging commands
    subparsers.add_parser("log-test", help="Test logging")
    
    p = subparsers.add_parser("log-note", help="Log a note")
    p.add_argument("note", help="Note text")
    
    p = subparsers.add_parser("logs", help="Show recent logs")
    p.add_argument("--lines", "-n", type=int, default=50)
    
    p = subparsers.add_parser("ai-summary", help="AI summary")
    p.add_argument("--lines", "-n", type=int, default=40)
    
    # Session commands
    p = subparsers.add_parser("session-start", help="Start session")
    p.add_argument("name", nargs="?", default="dev")
    
    p = subparsers.add_parser("session-end", help="End session")
    p.add_argument("note", nargs="?", default="complete")

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    parser = build_parser()
    args = parser.parse_args(argv)

    commands = {
        "status": lambda: cmd_status(getattr(args, "machine_id", None)),
        "pulse": cmd_pulse,
        "quick": cmd_quick,
        "health": cmd_health,
        "report": cmd_report,
        "volumes": cmd_volumes,
        "scan": cmd_scan,
        "log-test": cmd_log_test,
        "log-note": lambda: cmd_log_note(args.note),
        "logs": lambda: cmd_logs(getattr(args, "lines", 50)),
        "ai-summary": lambda: cmd_ai_summary(getattr(args, "lines", 40)),
        "session-start": lambda: cmd_session_start(getattr(args, "name", "dev")),
        "session-end": lambda: cmd_session_end(getattr(args, "note", "complete")),
    }

    if not args.command:
        return cmd_pulse()

    if args.command in commands:
        return commands[args.command]()

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
