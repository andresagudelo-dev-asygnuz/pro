# Proposal: Autonomous Worker Loop End-to-End

## Why

The current autonomous pilot only performs kickoff actions (status transition, local branch creation, issue comment). It does not execute implementation commands, run gate loops, push commits, create PRs, or close project items automatically after merge.

## Scope

- Upgrade scripts/src/autonomous/pilot-once.ts into an end-to-end worker runner.
- Add execution loop with retries and error fingerprints.
- Add OpenSpec scaffold generation per issue.
- Add commit/push/PR automation.
- Add failure breaker behavior with status rollback to Blocked or Ready.
- Add status sync from merged PRs to Done.

## Non-Goals

- Replacing CI/CD checks with local checks.
- Full autonomous coding intelligence inside this script (worker commands remain configurable).
- Multi-issue parallel execution in this first worker implementation.

## Success Criteria

- A Ready issue with required label is moved to In progress, processed, and moved to In review with an open PR.
- Failures are reported with diagnostics and status moved to Blocked (or Ready fallback).
- Items in In review/In progress are moved to Done automatically when a merged PR closes the issue.
