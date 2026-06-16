import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ghApiGraphql } from "./gh";
import { defaultSubagents } from "./subagents";

function run(cmd: string, args: string[]) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function ensureLabel(repo: string, name: string, color: string, description: string) {
  try {
    run("gh", ["label", "create", name, "--repo", repo, "--color", color, "--description", description]);
    console.log(`Created label: ${name}`);
  } catch {
    run("gh", ["label", "edit", name, "--repo", repo, "--color", color, "--description", description]);
    console.log(`Updated label: ${name}`);
  }
}

function main() {
  const repo = process.env.GH_REPO ?? "andresagudelo-dev-asygnuz/pro";
  const configDir = path.resolve(process.cwd(), "config");
  const configPath = path.join(configDir, "autonomous-pilot.json");
  const templatePath = path.join(configDir, "autonomous-pilot.example.json");

  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  // Ensure required labels exist for safe pickup logic.
  ensureLabel(repo, "autonomous-approved", "0e8a16", "Issue can be executed by autonomous runner");
  ensureLabel(repo, "needs-human", "fbca04", "Requires human decision before autonomous execution");
  ensureLabel(repo, "risk-high", "b60205", "High-risk change, requires manual review");

  const query = `
query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      id
      title
      fields(first: 30) {
        nodes {
          ... on ProjectV2FieldCommon {
            id
            name
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            options { id name }
          }
        }
      }
    }
  }
}
`;
  const discovery = ghApiGraphql(query, { owner: "andresagudelo-dev-asygnuz", number: 1 })?.data?.user?.projectV2;
  if (!discovery) {
    throw new Error("Project discovery failed.");
  }
  const fields = discovery.fields?.nodes ?? [];
  const statusField = fields.find((field: any) => field.name === "Status");
  if (!statusField) {
    throw new Error("Status field not found in project discovery output.");
  }

  const optionByName = (name: string) => {
    const option = (statusField.options ?? []).find((item: any) => item.name.toLowerCase() === name.toLowerCase());
    if (!option) throw new Error(`Status option "${name}" not found.`);
    return option.id as string;
  };

  const models = {
    analysis: { provider: "openai", model: "gpt-5.5", thinking: "high" },
    definition: { provider: "openai", model: "gpt-5.5", thinking: "high" },
    implementation: { provider: "local", model: "qwen2.5:3b", thinking: "medium" },
    testing: { provider: "local", model: "nemotron-3-nano:4b", thinking: "low" },
    review: { provider: "openai", model: "gpt-5.4-mini", thinking: "medium" },
  };

  const config = {
    github: {
      owner: "andresagudelo-dev-asygnuz",
      repo: "pro",
      projectNumber: 1,
      projectId: discovery.id,
      statusFieldId: statusField.id,
      status: {
        backlog: optionByName("Backlog"),
        ready: optionByName("Ready"),
        inProgress: optionByName("In progress"),
        inReview: optionByName("In review"),
        done: optionByName("Done"),
      },
    },
    filters: {
      requiredLabels: ["autonomous-approved"],
      readyStatusNames: ["Ready"],
    },
    execution: {
      dryRun: true,
      maxIssuesPerRun: 1,
      branchPrefix: "auto",
      defaultBaseBranch: "release/mvp-v1",
    },
    models,
    gates: {
      commands: [
        "pnpm -w run typecheck",
        "pnpm --filter @workspace/pro-sport run typecheck",
      ],
      maxAttemptsPerError: 3,
      maxAttemptsPerIssue: 8,
    },
    orchestration: {
      leadRole: "senior_developer",
      maxParallelSpecialists: 3,
      subagents: defaultSubagents({ models }),
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`Wrote ${configPath}`);

  if (!fs.existsSync(templatePath)) {
    fs.writeFileSync(templatePath, JSON.stringify(config, null, 2) + "\n", "utf8");
    console.log(`Wrote missing template at ${templatePath}`);
  }
}

main();
