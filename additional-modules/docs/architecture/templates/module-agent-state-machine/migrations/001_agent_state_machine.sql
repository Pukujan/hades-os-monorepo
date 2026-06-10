-- Module agent state machine v001
-- Contract: docs/architecture/contracts/moduleAgentStateMachine.contract.md
-- Copy to: backend/src/modules/<module>/repositories/migrations/

CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  module_name TEXT NOT NULL,
  machine_version TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_module_status ON agent_runs (module_name, status);

CREATE TABLE IF NOT EXISTS agent_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs (run_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_run_events_run_id ON agent_run_events (run_id);
