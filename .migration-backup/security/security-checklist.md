# Security Checklist (Baseline)

> Actualizado: 2026-04-16 | Gate: 1 (definición de producto)

## Repositorio y secretos

- [x] `.gitignore` configurado para excluir `.env*`, claves, `node_modules`, build artifacts
- [x] `.env.example` con variables documentadas y valores placeholder
- [x] No hay secretos hardcodeados en el repositorio (verificado con grep + Gitleaks)
- [x] Variables sensibles gestionadas por entorno (Vercel / Neon, según `devops/deployment.md`)

## CI/CD

- [x] Escaneo de secretos automático en CI (Gitleaks en `ci.yml`)
- [x] Verificación de gate en CI (`gate-check.yml`)
- [ ] Auditoría de dependencias en CI (`audit-ci` o `npm audit`) — habilitar cuando exista `package.json`
- [ ] Linting y type-checking en CI — habilitar cuando exista código de app

## Aplicación (pendiente — habilitar en Gate 4+)

- [ ] Validación de entrada en API (zod, joi, o similar)
- [ ] Control de acceso por rol (jugador vs promotor)
- [ ] Manejo seguro de errores (sin stack traces en producción)
- [ ] Rate limiting en endpoints públicos
- [ ] Sanitización de output (XSS prevention)

## CORS y headers

- [x] Template REST API usa origins desde env var (no wildcard `*`)
- [ ] Headers de seguridad configurados en Next.js (`X-Frame-Options`, `CSP`, `X-Content-Type-Options`, `Referrer-Policy`)
- [ ] HTTPS forzado en producción

## Autenticación (pendiente — habilitar en Gate 4+)

- [ ] JWT con secreto seguro (>= 256 bits, rotación planificada)
- [ ] Tokens de corta duración (access: 15min, refresh: 7d max)
- [ ] Hashing de passwords con bcrypt/argon2 (cost >= 10)
- [ ] Protección CSRF en formularios

## Dependencias (pendiente — habilitar en Gate 4+)

- [ ] Escaneo de vulnerabilidades ejecutado (`npm audit`, Snyk o Dependabot)
- [ ] Dependencias críticas actualizadas
- [ ] Dependabot o Renovate configurado

## Infra/Deploy (pendiente — habilitar en Gate 7)

- [ ] HTTPS forzado
- [ ] Headers de seguridad en CDN/proxy
- [ ] Backups automáticos de DB verificados
- [ ] Logs de acceso y auditoría habilitados

## Evidencia

- Reporte: [`security/security-report.md`](security-report.md)
- Fecha: 2026-04-16
- Herramientas: grep manual + Gitleaks (CI)
