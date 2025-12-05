#!/usr/bin/env python3
"""
🔊 NOIZYLAB - Quantum Scheduler
Ultra-fast async task scheduling for real-time audio operations
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import asyncio
import time
from typing import Callable, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ScheduledTask:
    """A scheduled task with metadata"""
    name: str
    coro: Callable
    interval: float = 0
    last_run: float = 0
    run_count: int = 0
    priority: int = 0


class QuantumScheduler:
    """Ultra-fast async task scheduler for NOIZYLAB"""

    def __init__(self):
        self.tasks: List[ScheduledTask] = []
        self.running = False
        self.tick_rate = 0.001  # 1ms quantum
        self.stats = {
            "ticks": 0,
            "started": None,
            "tasks_executed": 0
        }

    def add(self, coro: Callable, name: str = None, interval: float = 0, priority: int = 0):
        """Add a coroutine to the scheduler"""
        task = ScheduledTask(
            name=name or f"task_{len(self.tasks)}",
            coro=coro,
            interval=interval,
            priority=priority
        )
        self.tasks.append(task)
        self.tasks.sort(key=lambda t: t.priority, reverse=True)
        return task

    def remove(self, name: str):
        """Remove a task by name"""
        self.tasks = [t for t in self.tasks if t.name != name]

    async def run(self):
        """Main scheduler loop - quantum speed"""
        self.running = True
        self.stats["started"] = datetime.now().isoformat()
        
        while self.running:
            now = time.perf_counter()
            
            # Collect tasks ready to run
            ready = []
            for task in self.tasks:
                if task.interval == 0 or (now - task.last_run) >= task.interval:
                    ready.append(task)
            
            # Execute ready tasks in parallel
            if ready:
                coros = []
                for task in ready:
                    task.last_run = now
                    task.run_count += 1
                    self.stats["tasks_executed"] += 1
                    coros.append(task.coro())
                
                await asyncio.gather(*coros, return_exceptions=True)
            
            self.stats["ticks"] += 1
            await asyncio.sleep(self.tick_rate)

    async def run_once(self):
        """Execute all tasks once"""
        coros = [task.coro() for task in self.tasks]
        return await asyncio.gather(*coros, return_exceptions=True)

    def stop(self):
        """Stop the scheduler"""
        self.running = False

    def status(self) -> dict:
        """Get scheduler status"""
        return {
            "running": self.running,
            "tasks": len(self.tasks),
            "tick_rate_ms": self.tick_rate * 1000,
            "stats": self.stats,
            "task_list": [
                {
                    "name": t.name,
                    "interval": t.interval,
                    "run_count": t.run_count,
                    "priority": t.priority
                }
                for t in self.tasks
            ]
        }


class RealtimeLoop:
    """Real-time loop for audio-critical operations"""

    def __init__(self, tick_rate: float = 0.001):
        self.tick_rate = tick_rate
        self.callbacks: List[Callable] = []
        self.running = False

    def on_tick(self, callback: Callable):
        """Register tick callback"""
        self.callbacks.append(callback)

    async def start(self):
        """Start real-time loop"""
        self.running = True
        while self.running:
            start = time.perf_counter()
            
            for cb in self.callbacks:
                if asyncio.iscoroutinefunction(cb):
                    await cb()
                else:
                    cb()
            
            # Precise timing
            elapsed = time.perf_counter() - start
            sleep_time = max(0, self.tick_rate - elapsed)
            await asyncio.sleep(sleep_time)

    def stop(self):
        self.running = False


# Convenience function
async def quantum_run(*coros):
    """Run coroutines at quantum speed"""
    scheduler = QuantumScheduler()
    for coro in coros:
        scheduler.add(coro)
    await scheduler.run_once()


def main():
    """Demo the quantum scheduler"""
    import random

    async def task_a():
        print(f"⚡ Task A - {time.time():.3f}")

    async def task_b():
        print(f"🔥 Task B - {time.time():.3f}")

    async def task_c():
        await asyncio.sleep(0.01)
        print(f"🚀 Task C - {time.time():.3f}")

    async def demo():
        scheduler = QuantumScheduler()
        scheduler.add(task_a, name="TaskA", interval=0.1)
        scheduler.add(task_b, name="TaskB", interval=0.2)
        scheduler.add(task_c, name="TaskC", interval=0.5, priority=10)

        print("🔊 QUANTUM SCHEDULER STARTING...")
        print(f"   Tick rate: {scheduler.tick_rate * 1000}ms")
        print(f"   Tasks: {len(scheduler.tasks)}")
        print()

        # Run for 2 seconds
        async def stop_after():
            await asyncio.sleep(2)
            scheduler.stop()
            print("\n✅ Scheduler stopped")
            print(f"   Stats: {scheduler.stats}")

        await asyncio.gather(
            scheduler.run(),
            stop_after()
        )

    asyncio.run(demo())
    print("\n🔥 GORUNFREE! 🎸🔥")


if __name__ == "__main__":
    main()
