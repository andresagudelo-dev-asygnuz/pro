import { PilotConfig, StageModel, SubagentDefinition, SubagentRole } from "./types";

function cloneModel(model: StageModel): StageModel {
  return { provider: model.provider, model: model.model, thinking: model.thinking };
}

type ModelConfig = Pick<PilotConfig, "models">;

function premiumModel(config: ModelConfig): StageModel {
  return cloneModel(config.models.analysis);
}

function localImplementationModel(config: ModelConfig): StageModel {
  return cloneModel(config.models.implementation);
}

function localTestingModel(config: ModelConfig): StageModel {
  return cloneModel(config.models.testing);
}

export function defaultSubagents(config: ModelConfig): Record<SubagentRole, SubagentDefinition> {
  return {
    senior_developer: {
      role: "senior_developer",
      displayName: "Senior Developer Orchestrator",
      model: premiumModel(config),
      responsibilities: [
        "Descomponer el issue en subtareas tecnicas sin solapamientos.",
        "Asignar especialistas por fase y secuencia de handoff.",
        "Integrar entregables y validar coherencia final.",
      ],
      outputs: ["plan-ejecucion.md", "checklist-integracion.md", "resumen-riesgos.md"],
      skills: [
        { name: "task-breakdown", purpose: "Divide trabajo en subtareas atomicas con dependencias claras.", source: "local-defined" },
        { name: "integration-gatekeeper", purpose: "Consolida resultados y asegura trazabilidad a OpenSpec.", source: "local-defined" },
      ],
    },
    architect_expert: {
      role: "architect_expert",
      displayName: "Software Architect Expert",
      model: premiumModel(config),
      responsibilities: [
        "Definir arquitectura objetivo y decisiones tecnicas clave.",
        "Establecer contratos entre frontend, backend y base de datos.",
      ],
      outputs: ["architecture-decisions.md", "system-diagram.md"],
      skills: [{ name: "architecture-review", purpose: "Analisis de tradeoffs y riesgos de diseno.", source: "local-defined" }],
    },
    product_expert: {
      role: "product_expert",
      displayName: "Product Expert",
      model: premiumModel(config),
      responsibilities: [
        "Traducir issue a alcance funcional medible.",
        "Definir criterios de aceptacion y prioridades.",
      ],
      outputs: ["scope.md", "acceptance-criteria.md"],
      skills: [{ name: "product-scoping", purpose: "Priorizacion por impacto/esfuerzo.", source: "local-defined" }],
    },
    frontend_expert: {
      role: "frontend_expert",
      displayName: "Frontend Expert",
      model: localImplementationModel(config),
      responsibilities: [
        "Implementar componentes y vistas del lado cliente.",
        "Asegurar integracion con APIs y manejo de estado.",
      ],
      outputs: ["frontend-diff.patch", "frontend-tests.md"],
      skills: [{ name: "frontend-delivery", purpose: "Entrega de UI funcional y mantenible.", source: "local-defined" }],
    },
    backend_expert: {
      role: "backend_expert",
      displayName: "Backend Expert",
      model: localImplementationModel(config),
      responsibilities: [
        "Implementar endpoints, servicios y validaciones de negocio.",
        "Asegurar idempotencia, manejo de errores y observabilidad.",
      ],
      outputs: ["backend-diff.patch", "api-contract.md"],
      skills: [{ name: "api-implementation", purpose: "Servicios robustos y contratos estables.", source: "local-defined" }],
    },
    db_expert: {
      role: "db_expert",
      displayName: "Database Expert",
      model: localImplementationModel(config),
      responsibilities: [
        "Disenar esquemas, migraciones e indices.",
        "Optimizar queries y consistencia de datos.",
      ],
      outputs: ["migration.sql", "db-performance-notes.md"],
      skills: [{ name: "db-design", purpose: "Modelo de datos y performance.", source: "local-defined" }],
    },
    supabase_expert: {
      role: "supabase_expert",
      displayName: "Supabase Expert",
      model: localImplementationModel(config),
      responsibilities: [
        "Configurar politicas RLS, funciones y auth en Supabase.",
        "Validar despliegue y seguridad de recursos Supabase.",
      ],
      outputs: ["supabase-rls.sql", "supabase-checklist.md"],
      skills: [{ name: "supabase-ops", purpose: "Buenas practicas para auth, RLS y functions.", source: "local-defined" }],
    },
    ui_expert: {
      role: "ui_expert",
      displayName: "UI Expert",
      model: localImplementationModel(config),
      responsibilities: [
        "Aplicar sistema visual consistente con diseno existente.",
        "Definir componentes reutilizables y tokens visuales.",
      ],
      outputs: ["ui-guidelines.md", "component-style-notes.md"],
      skills: [{ name: "visual-system", purpose: "Consistencia visual y calidad de interfaz.", source: "local-defined" }],
    },
    ux_expert: {
      role: "ux_expert",
      displayName: "UX Expert",
      model: premiumModel(config),
      responsibilities: [
        "Definir flujo de usuario y manejo de edge-cases.",
        "Optimizar friccion y claridad de interaccion.",
      ],
      outputs: ["ux-flow.md", "edge-cases.md"],
      skills: [{ name: "ux-flow-design", purpose: "Experiencia end-to-end y casos frontera.", source: "local-defined" }],
    },
    copy_expert: {
      role: "copy_expert",
      displayName: "Copy Expert",
      model: localTestingModel(config),
      responsibilities: [
        "Redactar mensajes de UI claros y accionables.",
        "Asegurar tono consistente en textos de producto.",
      ],
      outputs: ["copy-strings.md", "microcopy-review.md"],
      skills: [{ name: "microcopy", purpose: "Textos breves y orientados a conversion.", source: "local-defined" }],
    },
  };
}

const executionOrder: SubagentRole[] = [
  "product_expert",
  "architect_expert",
  "ux_expert",
  "ui_expert",
  "backend_expert",
  "db_expert",
  "supabase_expert",
  "frontend_expert",
  "copy_expert",
];

export function renderSubagentAssignment(config: PilotConfig): string {
  const registry = config.orchestration?.subagents ?? defaultSubagents(config);
  const lead = registry.senior_developer;
  const lines: string[] = [];
  lines.push("### Senior Orchestration");
  lines.push(`Lead: ${lead.displayName} (${lead.model.model})`);
  lines.push("");
  lines.push("### Specialist Routing");
  for (const role of executionOrder) {
    const agent = registry[role];
    lines.push(
      `- ${agent.displayName}: ${agent.responsibilities[0]} | output principal: ${agent.outputs[0]} | model: ${agent.model.model}`,
    );
  }
  lines.push("");
  lines.push("### Execution Rule");
  lines.push("- El Senior Developer divide el trabajo, asigna orden y consolida entregables antes de test/review.");
  return lines.join("\n");
}
