# Autonomous Subagents Definition

This document defines the specialist subagents used by the autonomous pilot and the Senior orchestrator that coordinates them.

## Lead Orchestrator

- Role: `senior_developer`
- Name: Senior Developer Orchestrator
- Default model: `openai/gpt-5.5` (`high`)
- Responsibility: split issue into atomic tasks, assign specialists, integrate outputs, and control final quality gate.

## Specialist Subagents

1. `architect_expert`
- Focus: architecture decisions, contracts, and boundaries.
- Model: `openai/gpt-5.5` (`high`)
- Primary outputs: architecture decisions, system boundary map.

2. `product_expert`
- Focus: scope, acceptance criteria, and prioritization.
- Model: `openai/gpt-5.5` (`high`)
- Primary outputs: scope document, acceptance matrix.

3. `frontend_expert`
- Focus: client-side implementation, state, integration.
- Model: `local/qwen2.5:3b` (`medium`)
- Primary outputs: frontend diff, behavior verification notes.

4. `backend_expert`
- Focus: APIs, business logic, validations, error handling.
- Model: `local/qwen2.5:3b` (`medium`)
- Primary outputs: backend diff, API contract notes.

5. `db_expert`
- Focus: schema design, migrations, indexes, query strategy.
- Model: `local/qwen2.5:3b` (`medium`)
- Primary outputs: SQL migration, data rationale.

6. `supabase_expert`
- Focus: Supabase auth/RLS/functions and platform-safe setup.
- Model: `local/qwen2.5:3b` (`medium`)
- Primary outputs: RLS SQL, Supabase verification checklist.

7. `ui_expert`
- Focus: visual layer, design system consistency, components.
- Model: `local/qwen2.5:3b` (`medium`)
- Primary outputs: UI style notes, component updates.

8. `ux_expert`
- Focus: interaction flow and edge-case experience.
- Model: `openai/gpt-5.5` (`high`)
- Primary outputs: UX flow definition, edge-case map.

9. `copy_expert`
- Focus: microcopy for UI and product messaging.
- Model: `local/nemotron-3-nano:4b` (`low`)
- Primary outputs: copy set, consistency review.

## Skills Pack (Downloaded/Defined for this repo)

Role skill files are available here:

- `skills/autonomous-subagents/senior-developer/SKILL.md`
- `skills/autonomous-subagents/architect-expert/SKILL.md`
- `skills/autonomous-subagents/product-expert/SKILL.md`
- `skills/autonomous-subagents/frontend-expert/SKILL.md`
- `skills/autonomous-subagents/backend-expert/SKILL.md`
- `skills/autonomous-subagents/db-expert/SKILL.md`
- `skills/autonomous-subagents/supabase-expert/SKILL.md`
- `skills/autonomous-subagents/ui-expert/SKILL.md`
- `skills/autonomous-subagents/ux-expert/SKILL.md`
- `skills/autonomous-subagents/copy-expert/SKILL.md`

## Assignment Flow

1. Senior Developer receives issue and creates execution plan.
2. Product + Architect + UX define target behavior and boundaries.
3. Backend + DB + Supabase implement platform and data contracts.
4. Frontend + UI + Copy finish user-facing delivery.
5. Senior Developer integrates outputs and sends to testing/review gates.
