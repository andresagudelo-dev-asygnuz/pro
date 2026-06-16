# Spec: Autonomous GitHub Projects Pilot

## Requirement 1: Candidate selection by status and labels

GIVEN a GitHub Project v2 item linked to an issue  
WHEN the issue does not have all required labels from config  
THEN the runner MUST skip that item.

GIVEN a GitHub Project v2 item linked to an issue  
WHEN its `Status` field value is not in configured ready status names  
THEN the runner MUST skip that item.

GIVEN multiple eligible items  
WHEN `maxIssuesPerRun` is set  
THEN the runner MUST process at most that many items in one run.

## Requirement 2: Dry-run safety

GIVEN `execution.dryRun = true`  
WHEN the runner executes  
THEN it MUST NOT change project status, create branches, or post comments.

GIVEN `execution.dryRun = true`  
WHEN candidates exist  
THEN it MUST print planned branch names and model routing.

## Requirement 3: Live mode side effects

GIVEN `execution.dryRun = false` and one eligible issue  
WHEN the runner executes  
THEN it MUST move the issue item status to the configured `inProgress` option.

GIVEN `execution.dryRun = false` and one eligible issue  
WHEN the runner executes  
THEN it MUST create a branch from the configured base branch.

GIVEN `execution.dryRun = false` and one eligible issue  
WHEN the runner executes  
THEN it MUST post a kickoff comment that includes branch name and model assignment.

## Requirement 4: Model routing must be explicit

GIVEN a valid config  
WHEN the runner prints plan output  
THEN it MUST include model assignment for analysis, implementation, and testing stages.
