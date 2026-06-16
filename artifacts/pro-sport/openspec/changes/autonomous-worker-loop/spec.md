# Spec: Autonomous Worker Loop

## Requirement 1: Execute Ready issue end-to-end

**GIVEN** a Project item with required labels and status Ready  
**WHEN** autonomous:once runs in live mode  
**THEN** the runner must move the item to In progress, create or reuse a feature branch, run worker+gate flow, and open/update a PR  
**AND** move the item to In review when a PR exists.

## Requirement 2: Enforce bounded retry loop

**GIVEN** a worker or gate command fails  
**WHEN** the runner detects command failure  
**THEN** it must retry up to maxAttemptsPerIssue  
**AND** stop early when the same error fingerprint repeats maxAttemptsPerError times.

## Requirement 3: Failure fallback status

**GIVEN** a run fails after breaker conditions  
**WHEN** the runner exits failed for that issue  
**THEN** it must move the project item to Blocked when configured, otherwise Ready  
**AND** post an issue comment with concise diagnostics.

## Requirement 4: OpenSpec scaffold guarantee

**GIVEN** the issue-specific OpenSpec files do not exist  
**WHEN** the runner starts processing an issue  
**THEN** it must generate proposal.md, tasks.md, and spec.md under artifacts/pro-sport/openspec/changes/issue-<number>/.

## Requirement 5: Done sync on merged PR

**GIVEN** a project item is in In review or In progress  
**WHEN** the linked issue has at least one merged PR in the repository  
**THEN** the runner must move that item to Done  
**AND** post a one-time completion comment.
