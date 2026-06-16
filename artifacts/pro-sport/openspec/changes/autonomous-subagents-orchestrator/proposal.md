# Proposal: Autonomous Subagents Orchestrator

## Context
The current pilot can pick issues from GitHub Project, create branch, and post a kickoff comment. It does not yet define real specialist subagents with explicit ownership and handoff rules.

## Problem
Without explicit role definitions and a lead orchestrator, execution quality is inconsistent and difficult to trace. The team needs a senior agent that decomposes tasks and assigns specialist subagents (frontend, backend, db, supabase, ui, ux, architect, product, copy).

## Goal
Add a formal subagent registry, role skills, and evidence output so each run clearly shows:
- who leads,
- which specialist is assigned,
- what each specialist must deliver.

## Scope
- Add typed subagent definitions in scripts.
- Add senior-led assignment rendering to issue comments.
- Add local evidence artifact per run.
- Add role skill files for each requested subagent.
- Add docs and CLI command to inspect current subagent map.
