import { loadConfig } from "./config";
import { defaultSubagents } from "./subagents";

function main() {
  const config = loadConfig();
  const leadRole = config.orchestration?.leadRole ?? "senior_developer";
  const maxParallel = config.orchestration?.maxParallelSpecialists ?? 3;
  const subagents = config.orchestration?.subagents ?? defaultSubagents({ models: config.models });

  console.log("Autonomous subagents");
  console.log(`Lead role: ${leadRole}`);
  console.log(`Max parallel specialists: ${maxParallel}`);
  console.log("");

  for (const [key, agent] of Object.entries(subagents)) {
    console.log(`- ${key} => ${agent.displayName}`);
    console.log(`  model: ${agent.model.provider}/${agent.model.model} (${agent.model.thinking})`);
    console.log(`  focus: ${agent.responsibilities[0]}`);
    console.log(`  output: ${agent.outputs[0]}`);
    console.log(`  skills: ${agent.skills.map((skill) => skill.name).join(", ")}`);
  }
}

main();

