# Planning Handoff Template

## User Context Packet

- User goal:
- User constraints:
- Architecture/context provided by user:
- Bug symptoms:
- Preferred direction:
- Anti-goals:
- Exact files/docs/APIs/systems mentioned:

## Evidence Log

- User context read:
- Repo files inspected:
- Local docs inspected:
- Existing implementation inspected:
- Dependency versions confirmed:
- External call signatures confirmed:
- Tests or schemas inspected:
- Unknowns:

## Red Tests

- Test file:
- Failing command:
- Failure observed:
- Behavior being locked:

## OpenCode Execution Scope

- Files OpenCode may edit:
- Files OpenCode should not edit:
- Smallest expected implementation:
- Commands OpenCode should run first:
- Commands OpenCode should run after implementation:

## Hosted Verification

- Phase tags: auth / proxy / oauth / cross-service / media / none
- Hosted check required:
- Exact hosted command or manual check:
- If skipped, reason:

## Stop Conditions

- Stop if dependency signatures differ from this handoff.
- Stop if secrets or env vars are missing.
- Stop if tests cannot reproduce the issue.
- Stop if implementation requires broad refactor or new architecture.
- Stop if Hermes-related work has not read `docs/hermes-agent/`.
