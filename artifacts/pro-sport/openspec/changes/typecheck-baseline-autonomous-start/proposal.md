# Proposal: Typecheck Baseline Fixes for Autonomous Start

## Why

Autonomous execution depends on green gates. Existing type-level fragility around payment status mappings and nullable auth user references can block the worker loop.

## Scope

- Complete PaymentStatus mappings where "rechazado" is part of the union.
- Add null-safe guard in CommunityFeedTab publish flow.
- Validate typecheck in workspace root and pro-sport package.

## Success Criteria

- `pnpm -w run typecheck` passes from repository root.
- Runner can execute without failing immediately on known baseline type errors.
