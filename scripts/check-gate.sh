#!/usr/bin/env bash
# Verificación MÍNIMA: solo comprueba que existan archivos esperados y no estén vacíos.
# NO valida: calidad del texto, cobertura real ≥90%, existencia de PRs (requeriría gh/API),
# ni criterios GIVEN/WHEN/THEN. Para eso usá revisión humana y docs/gates-checklist.md.
# Uso: ./scripts/check-gate.sh [N]  —  si omitís N, lee tasks/current-gate.txt
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

GATE="${1:-}"
if [[ -z "$GATE" ]]; then
  if [[ -f tasks/current-gate.txt ]]; then
    GATE="$(tr -d '[:space:]' < tasks/current-gate.txt)"
  else
    echo "❌ Falta tasks/current-gate.txt o argumento numérico"
    exit 1
  fi
fi

ok() { echo "✅ $1"; }
fail() { echo "❌ $1"; FAIL=1; }

FAIL=0
need_file() {
  local f="$1"
  local msg="$2"
  if [[ -f "$f" && -s "$f" ]]; then ok "$msg"; else fail "$msg (falta o vacío: $f)"; fi
}

echo "==> Verificando Gate $GATE en $ROOT"
echo "    (modo: archivos mínimos; ver cabecera de este script para límites)"

case "$GATE" in
  1)
    need_file "docs/00-prd.md" "PRD"
    need_file "docs/01-requisitos-funcionales.md" "Requisitos funcionales"
    need_file "docs/02-requisitos-no-funcionales.md" "Requisitos no funcionales"
    ;;
  2)
    need_file "design/user-flows.md" "Flujos de usuario"
    ;;
  3)
    need_file "architecture/solution-architecture.md" "Arquitectura de solución"
    need_file "db/data-model.md" "Modelo de datos"
    ;;
  4)
    need_file "tasks/sprint-week-XX.md" "Plan sprint (plantilla o activo)"
    if ! compgen -G "tasks/hu/*.md" >/dev/null 2>&1; then
      fail "Al menos una HU en tasks/hu/*.md"
    else
      ok "Historias en tasks/hu/"
    fi
    echo "    ℹ️  Gate 4: no se verifican PRs ni SOLID; solo presencia de plan/HU."
    ;;
  5)
    need_file "qa/test-plan.md" "Plan de pruebas"
    need_file "qa/coverage-report.md" "Reporte de cobertura"
    echo "    ℹ️  Gate 5: no se parsea cobertura ≥90%; revisar el markdown a mano o CI de tests."
    ;;
  6)
    need_file "uat/uat-checklist.md" "Checklist UAT"
    if ! compgen -G "uat/uat-results-*.md" >/dev/null 2>&1; then
      fail "Resultados UAT (uat/uat-results-*.md)"
    else
      ok "Resultados UAT"
    fi
    echo "    ℹ️  Gate 6: no se valida aprobación de negocio ni texto del resultado."
    ;;
  7)
    need_file "security/security-checklist.md" "Checklist seguridad"
    need_file "traceability/matriz-trazabilidad.md" "Matriz de trazabilidad"
    need_file "security/security-report.md" "Reporte de seguridad"
    echo "    ℹ️  Gate 7: no se verifica deploy real ni baseline de seguridad en código."
    ;;
  *)
    echo "❌ Gate desconocido: $GATE (usa 1-7)"
    exit 1
    ;;
esac

if [[ "${FAIL:-0}" -ne 0 ]]; then
  echo "==> Gate $GATE: falló la verificación"
  exit 1
fi
echo "==> Gate $GATE: verificación mínima OK (solo archivos; ver docs/gates-checklist.md para criterios completos)"
exit 0
