export type ModelStage = "analysis" | "definition" | "implementation" | "testing" | "review";

export interface StageModel {
  provider: string;
  model: string;
  thinking: "low" | "medium" | "high" | "xhigh" | string;
}

export interface PilotConfig {
  github: {
    owner: string;
    repo: string;
    projectNumber: number;
    projectId: string;
    statusFieldId: string;
    status: {
      backlog?: string;
      ready: string;
      inProgress: string;
      inReview: string;
      done: string;
      blocked?: string;
    };
  };
  filters: {
    requiredLabels: string[];
    readyStatusNames: string[];
  };
  execution: {
    dryRun: boolean;
    maxIssuesPerRun: number;
    branchPrefix: string;
    defaultBaseBranch: string;
    workerCommands?: string[];
    autoCreatePr?: boolean;
    autoMarkDoneFromMergedPr?: boolean;
  };
  models: Record<ModelStage, StageModel>;
  gates: {
    commands: string[];
    maxAttemptsPerError: number;
    maxAttemptsPerIssue: number;
  };
}

export interface ProjectIssueItem {
  itemId: string;
  issueNodeId: string;
  issueNumber: number;
  title: string;
  url: string;
  repository: string;
  labels: string[];
  statusName: string | null;
}
