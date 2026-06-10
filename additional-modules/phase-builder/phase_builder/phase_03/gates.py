from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class GateResult:
    name: str
    status: str  # "pass", "fail", "warn"
    detail: str = ""
    meta: dict = field(default_factory=dict)


def check_lint_gate(state: dict) -> GateResult:
    lint = state.get("lint", {})
    last_pass = lint.get("lastPass", False)

    if last_pass:
        return GateResult(
            name="lint",
            status="pass",
            detail="Last lint run passed",
            meta={"result": lint.get("lastResult")},
        )

    return GateResult(
        name="lint",
        status="fail",
        detail="Lint has not passed or has not been run",
        meta={"result": lint.get("lastResult")},
    )


def check_test_gate(gate_input: dict) -> GateResult:
    tests = gate_input.get("tests", {})
    passed = tests.get("passed")

    if passed is True:
        return GateResult(
            name="tests",
            status="pass",
            detail=f"{tests.get('count', 0)} tests passed",
            meta={"count": tests.get("count", 0)},
        )

    return GateResult(
        name="tests",
        status="fail",
        detail="Tests have not all passed or have not been run",
        meta={"count": tests.get("count", 0)},
    )


def check_budget_gate(gate_input: dict) -> GateResult:
    budget = gate_input.get("budget", {})
    usage = budget.get("usage", 0)
    limit = budget.get("limit", 28000)

    remaining = max(0, limit - usage)
    pct = usage / limit if limit else 1.0

    if pct >= 0.90:
        status = "warn"
        detail = f"Budget at {pct:.0%} — consider compacting"
    else:
        status = "pass"
        detail = f"Budget at {pct:.0%}"

    return GateResult(
        name="budget",
        status=status,
        detail=detail,
        meta={"usage": usage, "limit": limit, "remaining": remaining, "pct": round(pct, 4)},
    )


def check_state_gate(state: dict) -> GateResult:
    if "version" not in state:
        return GateResult(name="state", status="fail", detail="Missing version field")

    if "activeModule" not in state:
        return GateResult(name="state", status="fail", detail="Missing activeModule")

    return GateResult(
        name="state",
        status="pass",
        detail="State schema valid",
        meta={"version": state.get("version"), "gate": state.get("architecture", {}).get("gate")},
    )


def evaluate_all_gates(state: dict, gate_input: dict) -> list[GateResult]:
    """Run all gate checks. Returns list of GateResult."""
    return [
        check_state_gate(state),
        check_lint_gate(state),
        check_test_gate(gate_input),
        check_budget_gate(gate_input),
    ]


def can_transition(state: dict, gate_input: dict) -> tuple[bool, list[GateResult]]:
    """Check if all gates pass (warn is acceptable). Returns (ok, results)."""
    results = evaluate_all_gates(state, gate_input)
    all_ok = all(r.status in ("pass", "warn") for r in results)
    return all_ok, results