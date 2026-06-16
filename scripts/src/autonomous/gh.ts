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

export interface GhIssueDetails {
  number: number;
  title: string;
  body?: string;
  state: "OPEN" | "CLOSED";
  mergedPrs: Array<{
    number: number;
    url: string;
    mergedAt: string;
  }>;
}

const GET_ISSUE_DETAILS = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number
      title
      body
      state
      closedByPullRequestsReferences(first: 20) {
        nodes {
          number
          url
          mergedAt
        }
      }
    }
  }
}
`;

export function ghGetIssueDetails(owner: string, repo: string, issueNumber: number): GhIssueDetails {
  const payload = ghApiGraphql(GET_ISSUE_DETAILS, {
    owner,
    repo,
    number: issueNumber,
  });
  const issue = payload?.data?.repository?.issue;
  if (!issue) {
    throw new Error(`Issue #${issueNumber} not found in ${owner}/${repo}`);
  }
  const mergedPrs = (issue.closedByPullRequestsReferences?.nodes ?? [])
    .filter((node: { mergedAt?: string | null }) => Boolean(node?.mergedAt))
    .map((node: { number: number; url: string; mergedAt: string }) => ({
      number: node.number,
      url: node.url,
      mergedAt: node.mergedAt,
    }));
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state,
    mergedPrs,
  };
}

export function ghCreatePr(owner: string, repo: string, base: string, head: string, title: string, body: string): string {
  const out = execFileSync(
    "gh",
    ["pr", "create", "--repo", `${owner}/${repo}`, "--base", base, "--head", head, "--title", title, "--body", body],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return out.trim();
}

export function ghFindPrUrlByHead(owner: string, repo: string, head: string): string | null {
  const out = execFileSync(
    "gh",
    ["pr", "list", "--repo", `${owner}/${repo}`, "--head", head, "--json", "url", "--limit", "1"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const parsed = JSON.parse(out);
  const first = Array.isArray(parsed) ? parsed[0] : null;
  return first?.url ?? null;
}
