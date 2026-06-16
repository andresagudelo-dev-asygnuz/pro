export type ModelStage = "analysis" | "definition" | "implementation" | "testing" | "review";
export type SubagentRole =
  | "senior_developer"
  | "architect_expert"
  | "product_expert"
  | "frontend_expert"
  | "backend_expert"
  | "db_expert"
  | "supabase_expert"
  | "ui_expert"
  | "ux_expert"
  | "copy_expert";

export interface StageModel {
  provider: string;
  model: string;
  thinking: "low" | "medium" | "high" | "xhigh" | string;
}

export interface RoleSkill {
  name: string;
  purpose: string;
  source: "local-defined" | "community" | "system";
}

export interface SubagentDefinition {
  role: SubagentRole;
  displayName: string;
  model: StageModel;
  responsibilities: string[];
  outputs: string[];
  skills: RoleSkill[];
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
  };
  models: Record<ModelStage, StageModel>;
  gates: {
    commands: string[];
    maxAttemptsPerError: number;
    maxAttemptsPerIssue: number;
  };
  orchestration?: {
    leadRole: "senior_developer";
    maxParallelSpecialists: number;
    subagents: Record<SubagentRole, SubagentDefinition>;
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
