import fs from "node:fs";
import path from "node:path";
import { PilotConfig } from "./types";

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config/autonomous-pilot.json");

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function loadConfig(): PilotConfig {
  const configuredPath = process.env.AUTONOMOUS_CONFIG_PATH;
  const finalPath = configuredPath ? path.resolve(process.cwd(), configuredPath) : DEFAULT_CONFIG_PATH;

  if (!fs.existsSync(finalPath)) {
    throw new Error(
      `Config not found at ${finalPath}. Copy scripts/config/autonomous-pilot.example.json to scripts/config/autonomous-pilot.json and edit it.`,
    );
  }

  const raw = fs.readFileSync(finalPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!isObject(parsed) || !isObject(parsed.github) || !isObject(parsed.execution) || !isObject(parsed.models)) {
    throw new Error(`Invalid config shape at ${finalPath}`);
  }

  return parsed as unknown as PilotConfig;
}
