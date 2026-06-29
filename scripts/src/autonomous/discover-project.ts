import fs from "node:fs";
import path from "node:path";
import { ghApiGraphql } from "./gh";

const owner = process.env.GH_OWNER ?? "andresagudelo-dev-asygnuz";
const projectNumber = Number(process.env.GH_PROJECT_NUMBER ?? "1");
const outPath = process.env.GH_DISCOVERY_OUT;

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

const result = ghApiGraphql(query, { owner, number: projectNumber });
const project = result?.data?.user?.projectV2;

if (!project) {
  throw new Error(`Project not found for ${owner} #${projectNumber}`);
}

const payload = {
  owner,
  projectNumber,
  projectId: project.id,
  title: project.title,
  fields: project.fields.nodes,
};

if (outPath) {
  const finalPath = path.resolve(process.cwd(), outPath);
  fs.writeFileSync(finalPath, JSON.stringify(payload, null, 2));
  console.log(`Discovery written to ${finalPath}`);
} else {
  console.log(JSON.stringify(payload, null, 2));
}
