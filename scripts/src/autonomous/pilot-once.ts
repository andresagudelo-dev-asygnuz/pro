import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";
import { ghRepoIssueComment } from "./gh";
import { getCandidateIssues, moveItemStatus } from "./project";
import { renderSubagentAssignment } from "./subagents";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function printPlan() {
  const config = loadConfig();
  const candidates = getCandidateIssues(config).slice(0, config.execution.maxIssuesPerRun);

  if (candidates.length === 0) {
    console.log("No candidate issues found (status + labels filter).");
    return;
  }

  for (const issue of candidates) {
    const leadRole = config.orchestration?.leadRole ?? "senior_developer";
    const leadAgentName = config.orchestration?.subagents?.[leadRole]?.displayName ?? "Senior Developer Orchestrator";
    const branch = `${config.execution.branchPrefix}/${issue.issueNumber}-${slugify(issue.title)}`;
    console.log("----");
    console.log(`Issue: #${issue.issueNumber} ${issue.title}`);
    console.log(`URL: ${issue.url}`);
    console.log(`Current status: ${issue.statusName}`);
    console.log(`Branch to create: ${branch} (base ${config.execution.defaultBaseBranch})`);
    console.log(
      `Models: analysis=${config.models.analysis.model}, implementation=${config.models.implementation.model}, testing=${config.models.testing.model}`,
    );
    console.log("Required OpenSpec files:");
    console.log(`  artifacts/pro-sport/openspec/changes/issue-${issue.issueNumber}/proposal.md`);
    console.log(`  artifacts/pro-sport/openspec/changes/issue-${issue.issueNumber}/tasks.md`);
    console.log(`  artifacts/pro-sport/openspec/changes/issue-${issue.issueNumber}/spec.md`);

    if (config.execution.dryRun) {
      console.log("Dry-run active: no status update, no git, no comments.");
      continue;
    }

    moveItemStatus(config, issue.itemId, config.github.status.inProgress);

    execSync(`git checkout ${config.execution.defaultBaseBranch}`, { stdio: "inherit" });
    execSync("git pull --ff-only", { stdio: "inherit" });
    execSync(`git checkout -b ${branch}`, { stdio: "inherit" });

    const orchestrationPlan = renderSubagentAssignment(config);
    const runDir = path.resolve(process.cwd(), "../artifacts/pro-sport/autonomous-runs");
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    const stamp = new Date().toISOString().replace(/[:]/g, "-");
    const evidencePath = path.join(runDir, `${stamp}-issue-${issue.issueNumber}.md`);
    const evidence = [
      `# Autonomous Run Evidence - Issue #${issue.issueNumber}`,
      "",
      `- Issue: ${issue.url}`,
      `- Branch: ${branch}`,
      `- Base: ${config.execution.defaultBaseBranch}`,
      `- Project status transition: ${issue.statusName} -> In progress`,
      "",
      orchestrationPlan,
    ].join("\n");
    fs.writeFileSync(evidencePath, evidence + "\n", "utf8");

    ghRepoIssueComment(
      config.github.owner,
      config.github.repo,
      issue.issueNumber,
      [
        `${leadAgentName} picked this issue.`,
        `Branch: \`${branch}\``,
        `Model split: analysis=\`${config.models.analysis.model}\`, implementation=\`${config.models.implementation.model}\`, testing=\`${config.models.testing.model}\`.`,
        "",
        orchestrationPlan,
        "",
        `Evidence file: \`${path.relative(path.resolve(process.cwd(), ".."), evidencePath)}\``,
      ].join("\n"),
    );
  }
}

printPlan();
