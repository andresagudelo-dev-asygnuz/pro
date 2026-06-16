import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadConfig } from "./config";
import { ghCreatePr, ghFindPrUrlByHead, ghGetIssueDetails, ghRepoIssueComment } from "./gh";
import { getAllProjectIssues, getCandidateIssues, moveItemStatus } from "./project";
import { PilotConfig, ProjectIssueItem } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function runCommand(command: string): { ok: true; output: string } | { ok: false; error: string } {
  try {
    const output = execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (error) {
    const err = error as { message?: string; stdout?: Buffer; stderr?: Buffer };
    const stdout = err.stdout ? String(err.stdout) : "";
    const stderr = err.stderr ? String(err.stderr) : "";
    const message = err.message ?? "unknown error";
    return { ok: false, error: [message, stdout, stderr].filter(Boolean).join("\n").trim() };
  }
}

function mustRun(command: string) {
  const result = runCommand(command);
  if (!result.ok) {
    throw new Error("Command failed: " + command + "\n" + result.error);
  }
  return result.output.trim();
}

function sanitizeForFingerprint(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function diagnosticSnippet(raw: string): string {
  return raw.split("\n").slice(-25).join("\n").slice(0, 1800);
}

function ensureOpenSpec(issue: ProjectIssueItem, modelsSummary: string) {
  const changeDir = path.resolve(
    process.cwd(),
    "artifacts/pro-sport/openspec/changes",
    "issue-" + String(issue.issueNumber),
  );
  fs.mkdirSync(changeDir, { recursive: true });

  const proposalPath = path.join(changeDir, "proposal.md");
  const tasksPath = path.join(changeDir, "tasks.md");
  const specPath = path.join(changeDir, "spec.md");

  if (!fs.existsSync(proposalPath)) {
    const proposal = [
      "# Proposal: Issue #" + String(issue.issueNumber) + " - " + issue.title,
      "",
      "## Why",
      "",
      "Implement this issue through the autonomous pipeline with OpenSpec traceability.",
      "",
      "## Context",
      "",
      "- Issue: " + issue.url,
      "- Model routing: " + modelsSummary,
      "",
    ].join("\n");
    fs.writeFileSync(proposalPath, proposal, "utf8");
  }

  if (!fs.existsSync(tasksPath)) {
    const tasks = [
      "# Tasks",
      "",
      "- [ ] Analyze scope and constraints from issue.",
      "- [ ] Define acceptance behavior in spec.",
      "- [ ] Implement minimal code changes to satisfy spec.",
      "- [ ] Run configured gates successfully.",
      "- [ ] Prepare PR with traceability to this issue.",
      "",
    ].join("\n");
    fs.writeFileSync(tasksPath, tasks, "utf8");
  }

  if (!fs.existsSync(specPath)) {
    const spec = [
      "# Spec: Issue #" + String(issue.issueNumber),
      "",
      "## Requirement 1",
      "",
      "**GIVEN** the issue requirements are defined",
      "**WHEN** implementation is executed",
      "**THEN** resulting behavior must satisfy acceptance criteria without gate failures.",
      "",
    ].join("\n");
    fs.writeFileSync(specPath, spec, "utf8");
  }
}

function syncDoneFromMergedPr(config: PilotConfig) {
  if (config.execution.autoMarkDoneFromMergedPr === false) {
    return;
  }
  const issues = getAllProjectIssues(config);
  const candidateStatuses = new Set(["in progress", "in review"]);
  for (const issue of issues) {
    const status = (issue.statusName ?? "").toLowerCase();
    if (!candidateStatuses.has(status)) {
      continue;
    }
    const details = ghGetIssueDetails(config.github.owner, config.github.repo, issue.issueNumber);
    if (details.mergedPrs.length === 0) {
      continue;
    }
    if (!config.execution.dryRun) {
      moveItemStatus(config, issue.itemId, config.github.status.done);
      ghRepoIssueComment(
        config.github.owner,
        config.github.repo,
        issue.issueNumber,
        "Autonomous sync: moved to Done after merged PR (" + details.mergedPrs[0].url + ").",
      );
    }
    console.log("Synced Done: #" + String(issue.issueNumber));
  }
}

function runWorkerForIssue(config: PilotConfig, issue: ProjectIssueItem) {
  const branch = config.execution.branchPrefix + "/" + String(issue.issueNumber) + "-" + slugify(issue.title);
  const modelSummary = "analysis=" + config.models.analysis.model + ", implementation=" + config.models.implementation.model + ", testing=" + config.models.testing.model;

  console.log("----");
  console.log("Issue: #" + String(issue.issueNumber) + " " + issue.title);
  console.log("URL: " + issue.url);
  console.log("Current status: " + String(issue.statusName));
  console.log("Branch: " + branch + " (base " + config.execution.defaultBaseBranch + ")");
  console.log("Models: " + modelSummary);

  if (config.execution.dryRun) {
    console.log("Dry-run active: no status update, no git mutations, no comments.");
    return;
  }

  moveItemStatus(config, issue.itemId, config.github.status.inProgress);

  const maxAttempts = Math.max(1, config.gates.maxAttemptsPerIssue);
  const maxPerFingerprint = Math.max(1, config.gates.maxAttemptsPerError);
  const workerCommands = config.execution.workerCommands ?? [];
  const gateCommands = config.gates.commands ?? [];
  const fingerprintCounts = new Map<string, number>();
  let lastError = "";

  try {
    const dirty = mustRun("git status --porcelain");
    if (dirty.length > 0) {
      throw new Error("Working tree is dirty. Use a clean runner checkout for autonomous execution.");
    }

    mustRun("git fetch origin --prune");
    mustRun("git checkout " + config.execution.defaultBaseBranch);
    mustRun("git pull --ff-only");
    const branchExists = runCommand("git rev-parse --verify " + branch);
    if (branchExists.ok) {
      mustRun("git checkout " + branch);
      mustRun("git rebase " + config.execution.defaultBaseBranch);
    } else {
      mustRun("git checkout -b " + branch);
    }

    ensureOpenSpec(issue, modelSummary);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let failed = "";
      for (const command of workerCommands) {
        const result = runCommand(command);
        if (!result.ok) {
          failed = "worker command failed (" + command + ")\n" + result.error;
          break;
        }
      }

      if (!failed) {
        for (const command of gateCommands) {
          const result = runCommand(command);
          if (!result.ok) {
            failed = "gate command failed (" + command + ")\n" + result.error;
            break;
          }
        }
      }

      if (!failed) {
        const statusAfter = mustRun("git status --porcelain");
        if (!statusAfter.trim()) {
          moveItemStatus(config, issue.itemId, config.github.status.ready);
          ghRepoIssueComment(
            config.github.owner,
            config.github.repo,
            issue.issueNumber,
            "Autonomous run finished with no file changes. Item moved back to Ready.",
          );
          return;
        }

        mustRun("git add -A");
        mustRun("git commit -m \"feat(auto): issue #" + String(issue.issueNumber) + " autonomous worker run\"");
        mustRun("git push -u origin " + branch);

        let prUrl = ghFindPrUrlByHead(config.github.owner, config.github.repo, branch);
        if (!prUrl && config.execution.autoCreatePr !== false) {
          prUrl = ghCreatePr(
            config.github.owner,
            config.github.repo,
            config.execution.defaultBaseBranch,
            branch,
            "[AUTO] #" + String(issue.issueNumber) + " " + issue.title,
            [
              "Automated run for issue #" + String(issue.issueNumber) + ".",
              "",
              "Model routing:",
              "- analysis: " + config.models.analysis.model,
              "- implementation: " + config.models.implementation.model,
              "- testing: " + config.models.testing.model,
            ].join("\n"),
          );
        }

        moveItemStatus(config, issue.itemId, config.github.status.inReview);
        ghRepoIssueComment(
          config.github.owner,
          config.github.repo,
          issue.issueNumber,
          [
            "Autonomous worker completed this run.",
            "Branch: " + branch,
            prUrl ? "PR: " + prUrl : "PR: not created (autoCreatePr=false)",
            "Attempts: " + String(attempt) + "/" + String(maxAttempts),
          ].join("\n"),
        );
        return;
      }

      lastError = failed;
      const fingerprint = sanitizeForFingerprint(failed);
      const count = (fingerprintCounts.get(fingerprint) ?? 0) + 1;
      fingerprintCounts.set(fingerprint, count);
      console.log("Attempt " + String(attempt) + "/" + String(maxAttempts) + " failed.");
      if (count >= maxPerFingerprint) {
        lastError = failed + "\n\nBreaker: repeated fingerprint (" + String(count) + "/" + String(maxPerFingerprint) + ").";
        break;
      }
      if (attempt === maxAttempts) {
        break;
      }
    }

    const fallbackStatus = config.github.status.blocked ?? config.github.status.ready;
    moveItemStatus(config, issue.itemId, fallbackStatus);
    ghRepoIssueComment(
      config.github.owner,
      config.github.repo,
      issue.issueNumber,
      [
        "Autonomous worker stopped due to breaker/attempt limit.",
        "Status moved to: " + (config.github.status.blocked ? "Blocked" : "Ready"),
        "",
        "Diagnostics:",
        "~~~",
        diagnosticSnippet(lastError || "Unknown error"),
        "~~~",
      ].join("\n"),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackStatus = config.github.status.blocked ?? config.github.status.ready;
    moveItemStatus(config, issue.itemId, fallbackStatus);
    ghRepoIssueComment(
      config.github.owner,
      config.github.repo,
      issue.issueNumber,
      [
        "Autonomous worker aborted before completion.",
        "Status moved to: " + (config.github.status.blocked ? "Blocked" : "Ready"),
        "",
        "Diagnostics:",
        "~~~",
        diagnosticSnippet(message),
        "~~~",
      ].join("\n"),
    );
  }
}

function main() {
  const config = loadConfig();

  syncDoneFromMergedPr(config);

  const candidates = getCandidateIssues(config).slice(0, config.execution.maxIssuesPerRun);
  if (candidates.length === 0) {
    console.log("No candidate issues found (status + labels filter).");
    return;
  }

  for (const issue of candidates) {
    runWorkerForIssue(config, issue);
  }
}

main();
