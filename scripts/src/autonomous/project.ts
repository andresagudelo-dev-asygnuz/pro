import { ghApiGraphql } from "./gh";
import { PilotConfig, ProjectIssueItem } from "./types";

const GET_PROJECT_ITEMS = `
query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      id
      title
      items(first: 50) {
        nodes {
          id
          content {
            ... on Issue {
              id
              number
              title
              url
              repository {
                nameWithOwner
              }
              labels(first: 50) {
                nodes {
                  name
                }
              }
            }
          }
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue {
              name
              optionId
            }
          }
        }
      }
    }
  }
}
`;

const SET_ITEM_STATUS = `
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: { singleSelectOptionId: $optionId }
  }) {
    projectV2Item {
      id
    }
  }
}
`;

export function getCandidateIssues(config: PilotConfig): ProjectIssueItem[] {
  const payload = ghApiGraphql(GET_PROJECT_ITEMS, {
    owner: config.github.owner,
    number: config.github.projectNumber,
  });

  const nodes = payload?.data?.user?.projectV2?.items?.nodes ?? [];
  const wantedStatuses = new Set(config.filters.readyStatusNames.map((name) => name.toLowerCase()));

  const items: ProjectIssueItem[] = [];
  for (const node of nodes) {
    const issue = node?.content;
    if (!issue?.number) {
      continue;
    }

    const labels = (issue.labels?.nodes ?? []).map((label: { name: string }) => label.name);
    const hasRequiredLabel = config.filters.requiredLabels.every((label) => labels.includes(label));
    if (!hasRequiredLabel) {
      continue;
    }

    const statusName = node.fieldValueByName?.name ?? null;
    if (!statusName || !wantedStatuses.has(String(statusName).toLowerCase())) {
      continue;
    }

    items.push({
      itemId: node.id,
      issueNodeId: issue.id,
      issueNumber: issue.number,
      title: issue.title,
      url: issue.url,
      repository: issue.repository.nameWithOwner,
      labels,
      statusName,
    });
  }

  return items;
}

export function getAllProjectIssues(config: PilotConfig): ProjectIssueItem[] {
  const payload = ghApiGraphql(GET_PROJECT_ITEMS, {
    owner: config.github.owner,
    number: config.github.projectNumber,
  });
  const nodes = payload?.data?.user?.projectV2?.items?.nodes ?? [];
  const items: ProjectIssueItem[] = [];
  for (const node of nodes) {
    const issue = node?.content;
    if (!issue?.number) {
      continue;
    }
    const labels = (issue.labels?.nodes ?? []).map((label: { name: string }) => label.name);
    items.push({
      itemId: node.id,
      issueNodeId: issue.id,
      issueNumber: issue.number,
      title: issue.title,
      url: issue.url,
      repository: issue.repository.nameWithOwner,
      labels,
      statusName: node.fieldValueByName?.name ?? null,
    });
  }
  return items;
}

export function moveItemStatus(config: PilotConfig, itemId: string, optionId: string) {
  ghApiGraphql(SET_ITEM_STATUS, {
    projectId: config.github.projectId,
    itemId,
    fieldId: config.github.statusFieldId,
    optionId,
  });
}
