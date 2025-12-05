# core/jobs.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any, List, Optional


@dataclass
class JobDefinition:
    id: str
    label: str
    steps: List[str]


@dataclass
class JobInstance:
    job_id: str
    job_type: str
    machine_id: str
    status: str  # "queued" | "running" | "done" | "failed"
    created_at: str
    updated_at: str
    result_summary: Optional[str] = None


# For now, this is just a placeholder — we designed it so it's easy to expand later.
# You can add functions like:
#
# - load_job_definitions()
# - create_job_instance()
# - run_job(...)
#
# when you're ready to build the job system.
