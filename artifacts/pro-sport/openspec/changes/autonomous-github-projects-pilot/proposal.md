# Proposal: Autonomous GitHub Projects Pilot

## Goal

Create a minimal autonomous orchestration layer for `pro` that can pull ready issues from GitHub Projects v2 and prepare execution with model routing.

## Scope

In scope:

- Config schema for project IDs, status mapping, labels, and model routing.
- Script to discover project field IDs/options from GraphQL.
- Script to run one pilot cycle (candidate selection + planned branch and model assignment).
- Dry-run first, then optional live mode.
- Documentation for setup and runbook.

Out of scope:

- Full implementation agent loop (code/test/fix) execution.
- Auto PR merge.
- Multi-repo orchestration.

## Why now

- We need a safe first slice that proves Project v2 integration and model split.
- The pilot isolates orchestration risk before scaling automation.

## Risks and mitigations

- Risk: wrong Project field IDs.
  - Mitigation: `autonomous:discover` script and explicit config validation.
- Risk: unexpected issue pickup.
  - Mitigation: label gate (`autonomous-approved`) and dry-run default.
- Risk: accidental status mutation.
  - Mitigation: live mode opt-in only.
