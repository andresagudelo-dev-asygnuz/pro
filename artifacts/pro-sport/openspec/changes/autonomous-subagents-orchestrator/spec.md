# Spec: Autonomous Subagents Orchestrator

## Requirement 1: Senior-led decomposition
GIVEN an issue is selected by the autonomous runner
WHEN live execution starts
THEN the runner MUST produce an assignment plan led by `senior_developer`
AND the plan MUST include all specialist roles configured for the pilot.

## Requirement 2: Specialist role definitions
GIVEN the pilot configuration is loaded
WHEN subagent definitions are resolved
THEN each role MUST have:
- display name,
- model mapping,
- responsibilities,
- expected outputs,
- skill list.

## Requirement 3: Run evidence
GIVEN a live issue pickup
WHEN the runner finishes kickoff actions
THEN it MUST persist a local evidence file under `artifacts/pro-sport/autonomous-runs/`
AND it MUST publish assignment evidence in the issue comment.

## Requirement 4: Inspectability
GIVEN an operator needs to audit role setup
WHEN they run `autonomous:subagents`
THEN the command MUST print lead role, max parallel specialists, and per-role model + primary outputs.
