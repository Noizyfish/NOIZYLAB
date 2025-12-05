# core/machines.py

from __future__ import annotations

import platform
import subprocess
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple

from .config import load_machines
from .logs import log_event


@dataclass
class CheckResult:
    check_type: str
    status: str  # "OK" | "WARN" | "FAIL" | "UNKNOWN"
    detail: str
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Machine:
    id: str
    label: str
    host: str
    role: str = "unknown"
    tags: List[str] = field(default_factory=list)
    checks: List[str] = field(default_factory=lambda: ["ping"])
    notes: str = ""

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Machine":
        return Machine(
            id=data.get("id", "").upper(),
            label=data.get("label", data.get("id", "Unnamed Machine")),
            host=data.get("host", "127.0.0.1"),
            role=data.get("role", "unknown"),
            tags=data.get("tags", []) or [],
            checks=data.get("checks", ["ping"]) or ["ping"],
            notes=data.get("notes", "") or "",
        )


def load_all_machines() -> Dict[str, Machine]:
    raw = load_machines()
    machines: Dict[str, Machine] = {}
    for mid, cfg in raw.items():
        machine = Machine.from_dict(cfg)
        machines[machine.id] = machine
    return machines


def _ping_host(host: str, timeout_seconds: int = 2) -> Tuple[bool, Optional[float]]:
    """
    Ping host once. Return (reachable, latency_ms or None).

    Uses system 'ping'.
    """
    system = platform.system().lower()
    count_flag = "-c" if system != "windows" else "-n"
    # Keep it simple. Some platforms differ in details, but this works on macOS/Linux.
    try:
        proc = subprocess.run(
            ["ping", count_flag, "1", host],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except Exception:
        return False, None

    if proc.returncode != 0:
        return False, None

    # Try to parse latency from output (e.g. "time=3.12 ms")
    latency_ms = None
    out = proc.stdout
    if "time=" in out:
        try:
            # naive parse
            start = out.index("time=") + 5
            end = out.index(" ", start)
            val = out[start:end].replace("ms", "").strip()
            latency_ms = float(val)
        except Exception:
            latency_ms = None

    return True, latency_ms


def run_check(machine: Machine, check_type: str) -> CheckResult:
    check_type = check_type.lower().strip()

    if check_type == "ping":
        reachable, latency_ms = _ping_host(machine.host)
        if reachable:
            detail = f"Reachable ({latency_ms:.1f} ms)" if latency_ms is not None else "Reachable"
            metrics = {"latency_ms": latency_ms}
            status = "OK"
        else:
            detail = "Unreachable"
            metrics = {}
            status = "FAIL"

        log_event(
            "check",
            f"ping {machine.id} -> {status}",
            extra={"machine": machine.id, "status": status, "latency_ms": latency_ms},
        )
        return CheckResult(check_type="ping", status=status, detail=detail, metrics=metrics)

    # Placeholder for future checks
    if check_type in ("disk", "cpu"):
        detail = "Not implemented yet"
        status = "UNKNOWN"
        log_event(
            "check",
            f"{check_type} {machine.id} -> {status}",
            extra={"machine": machine.id, "status": status},
        )
        return CheckResult(check_type=check_type, status=status, detail=detail, metrics={})

    # Unknown check type
    detail = "Unknown check type"
    status = "UNKNOWN"
    log_event(
        "check",
        f"{check_type} {machine.id} -> {status}",
        extra={"machine": machine.id, "status": status},
    )
    return CheckResult(check_type=check_type, status=status, detail=detail, metrics={})


def run_checks_for_machine(machine: Machine) -> List[CheckResult]:
    results: List[CheckResult] = []
    for check in machine.checks:
        results.append(run_check(machine, check))
    return results
