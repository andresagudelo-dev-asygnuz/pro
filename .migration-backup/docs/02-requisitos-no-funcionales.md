# Requisitos No Funcionales — PRO (borrador)

Derivado de `PRO-gestion.documental.md` (RNF1–RNF7). Cuantificar umbrales al cerrar MVP y arquitectura.

## Seguridad

- **Autenticación/Autorización:** roles jugador vs promotor; datos sensibles y documento de identidad solo donde aplique verificación de edad (RF informe).
- **Gestión de secretos:** fuera del repo; Vercel/Neon según `devops/deployment.md`.
- **Auditoría/logs:** acciones sensibles (resultados torneo, validación comprobantes) trazables en diseño técnico.

## Rendimiento

- **Tiempo de respuesta:** p95 LCP < 2 s para páginas de perfil y tabla de posiciones en conexión 4G (objetivo MVP1). Páginas SSR con Next.js + Vercel edge deben servir HTML en < 500 ms TTFB.
- **Throughput:** volumen esperado MVP1 bajo (~50–200 usuarios concurrentes); escalar según validación post-lanzamiento.

## Escalabilidad

- **Estrategia:** crecimiento usuarios, torneos y funcionalidades (RNF2).
- **Límites esperados:** *[placeholder]*

## Disponibilidad

- **SLA objetivo:** disponibilidad mayoritaria; minimizar inactividad (RNF5). *[Cuantificar si aplica.]*
- **Estrategia de recuperación:** rollback Vercel, backups Neon.

## Mantenibilidad

- **Convenciones:** template fábrica, PRs pequeños.
- **Cobertura mínima:** 90 % objetivo fábrica salvo excepción en `tasks/gate-status.md`.

## Usabilidad

- UI intuitiva y atractiva, inspirada en videojuegos deportivos FIFA/NBA (RNF4 informe).

## Compatibilidad

- Navegadores modernos y diseño responsivo móvil (RNF7). Si MVP es app nativa, actualizar con ADR.

## Observabilidad

- **Métricas:** errores, latencia, uso de features (alineado a KPI en intake/03).
- **Alertas:** *[definir post despliegue]*
