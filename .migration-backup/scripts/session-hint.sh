#!/usr/bin/env bash
# Imprime rol(es) y prompt(s) sugeridos según tasks/current-gate.txt del repo del producto.
# Uso (desde la raíz del producto): ./scripts/session-hint.sh
# Uso (desde el wrapper): ./scripts/session-hint.sh projects/MiProducto
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n "${1:-}" ]]; then
  ROOT="$(cd "$1" && pwd)"
else
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
cd "$ROOT"

if [[ ! -f tasks/current-gate.txt ]]; then
  echo "❌ No se encontró tasks/current-gate.txt en $ROOT"
  exit 1
fi

GATE="$(tr -d '[:space:]' < tasks/current-gate.txt)"
echo "==> Repo producto: $ROOT"
echo "==> Gate activo (current-gate.txt): $GATE"
echo ""

prompt_line() {
  local id="$1"
  local file="$2"
  echo "   • Rol \`$id\` → factory/agents/prompts/$file"
}

echo "Roles y prompts sugeridos (ver factory/agents/gate-role-map.md):"
case "$GATE" in
  1) prompt_line "product" "product.md" ;;
  2) prompt_line "design" "design.md" ;;
  3)
    prompt_line "architecture" "architecture.md"
    prompt_line "db" "db.md"
    ;;
  4)
    prompt_line "backend" "backend.md"
    prompt_line "frontend" "frontend.md"
    ;;
  5) prompt_line "qa" "qa.md" ;;
  6) prompt_line "uat" "uat.md" ;;
  7)
    prompt_line "devops" "devops.md"
    prompt_line "security" "security.md"
    ;;
  *)
    echo "   (Gate no reconocido: $GATE — revisar tasks/current-gate.txt)"
    ;;
esac

echo ""
echo "Perfiles (contexto del rol): factory/agents/profiles/<mismo-id>.md"
echo "Definí FACTORY_ROOT al clon del wrapper para abrir esas rutas desde el IDE."
echo "Estado detallado: tasks/gate-status.md"
