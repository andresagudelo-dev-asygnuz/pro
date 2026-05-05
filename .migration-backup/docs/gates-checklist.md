# Gates checklist (producto)

Alineado con **`factory/governance/quality-gates.md`** en el repo de la fábrica (7 gates). Usa esta lista en el repo del producto para revisión humana; el script `./scripts/check-gate.sh` solo valida **presencia mínima de archivos** (ver comentarios en ese script).

## Gate 1: Producto
- [ ] PRD completo
- [ ] RF y RNF con criterios GIVEN/WHEN/THEN
- [ ] KPI de validación semanal definido

## Gate 2: Diseño
- [ ] Flujos de usuario mapeados a RF
- [ ] Wireframes base disponibles

## Gate 3: Arquitectura + DB-first
- [ ] Arquitectura aprobada
- [ ] Modelo de datos y migraciones iniciales
- [ ] ADRs críticos registrados

## Gate 4: Desarrollo
- [ ] HU implementadas con evidencia en PRs
- [ ] Convenciones SOLID / Clean Code revisadas

## Gate 5: QA
- [ ] Unit / integration / e2e ejecutados
- [ ] Cobertura global ≥ 90% (o excepción explícita aprobada)

## Gate 6: UAT
- [ ] Checklist UAT ejecutado
- [ ] Resultado aprobado o plan de corrección definido

## Gate 7: Release
- [ ] Seguridad baseline aprobada
- [ ] Deploy QA y producción controlado
- [ ] Matriz de trazabilidad actualizada
