#!/usr/bin/env bash
# Misma instalación que el wrapper de la fábrica (skills.sh → Cursor, Claude Code, Antigravity).
# Uso: desde la raíz del repo del producto: ./scripts/install-skills.sh
# Doc: docs/skills-profiles.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AGENTS=(cursor claude-code antigravity)
A=()
for x in "${AGENTS[@]}"; do A+=(-a "$x"); done

echo "==> Instalando skills en: ${AGENTS[*]} (proyecto: $ROOT)"

run_add() {
  local repo="$1"
  shift
  # shellcheck disable=SC2068
  npx skills add "$repo" "$@" "${A[@]}" -y
}

run_add vercel-labs/agent-skills \
  --skill vercel-react-best-practices \
  --skill web-design-guidelines \
  --skill deploy-to-vercel \
  --skill vercel-composition-patterns

run_add vercel-labs/next-skills \
  --skill next-best-practices \
  --skill next-cache-components

run_add neondatabase/agent-skills --skill neon-postgres

run_add anthropics/skills \
  --skill frontend-design \
  --skill webapp-testing

run_add shadcn/ui --skill shadcn

run_add wshobson/agents \
  --skill nodejs-backend-patterns \
  --skill api-design-principles

run_add github/awesome-copilot \
  --skill prd \
  --skill git-commit \
  --skill create-github-action-workflow-specification

run_add google-labs-code/stitch-skills \
  --skill design-md \
  --skill enhance-prompt

run_add obra/superpowers \
  --skill writing-plans \
  --skill executing-plans

echo "==> Listo. Ver: npx skills list"
