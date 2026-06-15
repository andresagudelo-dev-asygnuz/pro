# Autonomous Development Pilot (GitHub Projects + Model Routing)

This setup lets the repo pull candidate issues from GitHub Projects v2, route phases to different models, and start one pilot run safely in dry-run mode.

## 1. Branch and base

This setup was prepared from `release/mvp-v1` on branch:

- `feature/autonomous-pilot-setup`

## 2. Files added

- `scripts/config/autonomous-pilot.example.json`
- `scripts/src/autonomous/discover-project.ts`
- `scripts/src/autonomous/pilot-once.ts`
- `scripts/src/autonomous/project.ts`
- `scripts/src/autonomous/config.ts`
- `scripts/src/autonomous/gh.ts`
- `scripts/src/autonomous/types.ts`

## 3. OpenSpec policy

Every issue executed by the pilot must generate:

- `artifacts/pro-sport/openspec/changes/issue-<number>/proposal.md`
- `artifacts/pro-sport/openspec/changes/issue-<number>/tasks.md`
- `artifacts/pro-sport/openspec/changes/issue-<number>/spec.md`

No implementation starts before those docs exist.

## 4. One-time setup

1. Run bootstrap setup:
   - `pnpm --filter @workspace/scripts run autonomous:setup`
2. This command will:
   - create/update required labels in GitHub (`autonomous-approved`, `needs-human`, `risk-high`)
   - discover Project v2 IDs and status options
   - write active config to `scripts/config/autonomous-pilot.json`
3. Optional: inspect Project data manually:
   - `pnpm --filter @workspace/scripts run autonomous:discover`

## 5. Dry-run execution

Run exactly one candidate issue scan:

- `pnpm --filter @workspace/scripts run autonomous:once`

Dry-run behavior:
- reads project items
- filters by status + label
- prints branch/model plan
- does not mutate GitHub or git

## 6. Live execution

Set `execution.dryRun` to `false` in config and run again. Live mode will:

- move the selected item to `In progress`
- create a feature branch from `release/mvp-v1`
- post a kickoff comment on the issue

## 7. Suggested cron

After validating one successful run:

- every 5 minutes
- max 1 issue per run
- daytime window only

Example:

- `*/5 8-20 * * * cd /Users/andres/.openclaw/workspace/pro && pnpm --filter @workspace/scripts run autonomous:once >> /tmp/pro-autonomous.log 2>&1`

## 8. Safety defaults

- required label: `autonomous-approved`
- ready status name: `Ready`
- dry-run default: `true`
- max issues/run: `1`

## 9. Default model routing in generated config

- analysis: `gpt-5.5`
- definition: `gpt-5.5`
- implementation (local): `qwen2.5:3b`
- testing (local): `nemotron-3-nano:4b`
- review: `gpt-5.4-mini`
