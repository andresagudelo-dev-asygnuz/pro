import { execFileSync } from "node:child_process";

export function ghApiGraphql(query: string, variables: Record<string, string | number>) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    args.push("-F", `${key}=${value}`);
  }

  const out = execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(out);
}

export function ghRepoIssueComment(owner: string, repo: string, issue: number, body: string) {
  execFileSync("gh", ["issue", "comment", String(issue), "--repo", `${owner}/${repo}`, "--body", body], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}
