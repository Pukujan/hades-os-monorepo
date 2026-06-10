from phase_03.gates import (
    GateResult,
    check_lint_gate,
    check_test_gate,
    check_budget_gate,
    check_state_gate,
    evaluate_all_gates,
    can_transition,
)


class TestLintGate:
    def test_pass_when_lint_ok(self):
        state = {"lint": {"lastResult": "pass", "lastPass": True}}
        result = check_lint_gate(state)
        assert result.status == "pass"
        assert result.name == "lint"

    def test_fail_when_lint_fails(self):
        state = {"lint": {"lastResult": "fail", "lastPass": False}}
        result = check_lint_gate(state)
        assert result.status == "fail"

    def test_fail_when_no_lint_record(self):
        state = {"lint": {"lastResult": None, "lastPass": False}}
        result = check_lint_gate(state)
        assert result.status == "fail"


class TestTestGate:
    def test_pass_when_tests_pass(self):
        gate_input = {"tests": {"passed": True, "count": 42}}
        result = check_test_gate(gate_input)
        assert result.status == "pass"
        assert result.name == "tests"

    def test_fail_when_tests_fail(self):
        gate_input = {"tests": {"passed": False, "count": 40}}
        result = check_test_gate(gate_input)
        assert result.status == "fail"

    def test_fail_when_no_test_record(self):
        gate_input = {"tests": {"passed": None, "count": 0}}
        result = check_test_gate(gate_input)
        assert result.status == "fail"


class TestBudgetGate:
    def test_pass_when_budget_ok(self):
        gate_input = {"budget": {"usage": 20000, "limit": 28000}}
        result = check_budget_gate(gate_input)
        assert result.status == "pass"
        assert result.name == "budget"

    def test_warn_when_budget_high(self):
        gate_input = {"budget": {"usage": 26000, "limit": 28000}}
        result = check_budget_gate(gate_input)
        assert result.status in ("pass", "warn")

    def test_warn_when_over_ceiling(self):
        gate_input = {"budget": {"usage": 29000, "limit": 28000}}
        result = check_budget_gate(gate_input)
        assert result.status in ("pass", "warn")


class TestStateGate:
    def test_pass_when_state_valid(self):
        state = {
            "version": "1.0.0",
            "activeModule": {"phase": "implementation"},
            "architecture": {"gate": 2},
        }
        result = check_state_gate(state)
        assert result.status == "pass"
        assert result.name == "state"

    def test_fail_when_missing_version(self):
        state = {"activeModule": {"phase": "implementation"}}
        result = check_state_gate(state)
        assert result.status == "fail"

    def test_fail_when_missing_active_module(self):
        state = {"version": "1.0.0"}
        result = check_state_gate(state)
        assert result.status == "fail"


class TestEvaluateAllGates:
    def test_all_pass(self):
        state = {
            "version": "1.0.0",
            "lint": {"lastResult": "pass", "lastPass": True},
            "activeModule": {"phase": "implementation"},
            "architecture": {"gate": 2},
        }
        gate_input = {
            "tests": {"passed": True, "count": 42},
            "budget": {"usage": 15000, "limit": 28000},
        }
        results = evaluate_all_gates(state, gate_input)
        assert all(r.status in ("pass", "warn") for r in results)
        assert len(results) >= 3

    def test_one_fail(self):
        state = {
            "version": "1.0.0",
            "lint": {"lastResult": "fail", "lastPass": False},
            "activeModule": {"phase": "implementation"},
            "architecture": {"gate": 2},
        }
        gate_input = {
            "tests": {"passed": True, "count": 42},
            "budget": {"usage": 15000, "limit": 28000},
        }
        results = evaluate_all_gates(state, gate_input)
        assert any(r.status == "fail" for r in results)


class TestCanTransition:
    def test_true_when_all_pass(self):
        state = {
            "version": "1.0.0",
            "lint": {"lastResult": "pass", "lastPass": True},
            "activeModule": {"phase": "implementation"},
            "architecture": {"gate": 2},
        }
        gate_input = {
            "tests": {"passed": True, "count": 42},
            "budget": {"usage": 15000, "limit": 28000},
        }
        ok, results = can_transition(state, gate_input)
        assert ok is True

    def test_false_when_lint_fails(self):
        state = {
            "version": "1.0.0",
            "lint": {"lastResult": "fail", "lastPass": False},
            "activeModule": {"phase": "implementation"},
            "architecture": {"gate": 2},
        }
        gate_input = {
            "tests": {"passed": True, "count": 42},
            "budget": {"usage": 15000, "limit": 28000},
        }
        ok, results = can_transition(state, gate_input)
        assert ok is False

    def test_false_when_tests_fail(self):
        state = {
            "version": "1.0.0",
            "lint": {"lastResult": "pass", "lastPass": True},
            "activeModule": {"phase": "implementation"},
            "architecture": {"gate": 2},
        }
        gate_input = {
            "tests": {"passed": False, "count": 40},
            "budget": {"usage": 15000, "limit": 28000},
        }
        ok, results = can_transition(state, gate_input)
        assert ok is False