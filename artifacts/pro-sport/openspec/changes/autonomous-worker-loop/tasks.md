# Tasks

- [x] Extend types/config for worker loop and PR behavior.
- [x] Add GitHub helpers for issue details and PR creation/discovery.
- [x] Add project item listing for status-sync workflows.
- [x] Implement end-to-end worker in pilot-once.ts:
  - [x] sync merged PRs to Done.
  - [x] create/open branch safely.
  - [x] generate OpenSpec files.
  - [x] run worker commands + gate loop with breaker.
  - [x] commit/push/create PR and move to In review.
  - [x] failure rollback to Blocked/Ready with diagnostics.
- [x] Update docs and config example for new behavior.
- [x] Run typecheck and dry/live validation commands.
