# 00 — Índice y alcance (intake) — PRO

## Identidad del producto

- **Nombre:** PRO
- **Una línea:** Ecosistema digital para deportistas amateur/semipro y organizadores; experiencia “tipo profesional / FIFA” (perfiles, equipos, torneos, comunidad).

## Fuente consolidada (migración en curso)

El contenido detallado vive hoy en el monolito **[`../../PRO-gestion.documental.md`](../../PRO-gestion.documental.md)**. La meta es **vaciar por secciones** hacia `01`–`08` para alinear con el estándar de la fábrica.

### Mapa monolito → archivos intake

| Archivo intake | Secciones aproximadas en `PRO-gestion.documental.md` |
|----------------|------------------------------------------------------|
| `01-contexto-y-vision.md` | Metodologías (referencia) + inicio informe + misión/visión del business plan |
| `02-usuarios-y-mercado.md` | Perfiles de usuario del informe + estudio Manizales + tabla deportes |
| `03-propuesta-valor-y-mvp.md` | Objetivos MVP informe + definición MVP Manizales + **decisión MVP única** |
| `04-requisitos-funcionales-borrador.md` | RF1.x – RF8.x del informe |
| `05-requisitos-no-funcionales-borrador.md` | RNF del informe |
| `06-validacion-y-encuestas.md` | Encuesta + respuestas R// |
| `07-modelo-negocio-y-roadmap.md` | Business plan, monetización, 3/5/10 años |
| `08-anexos.md` | Metodologías Design Thinking / FODA / SCAMPER (si no van a 01) |

## Decisión de MVP

**MVP elegido para la siguiente iteración:** **Híbrido — "Opción A Acotada"**: núcleo de torneos + perfil tipo ficha (RF-001 a RF-005) con lanzamiento geográfico focalizado en Eje Cafetero (Pereira/Manizales). Solo fútbol, mayores de edad. Plataforma web responsiva (Next.js / Vercel). Ver detalle y justificación en `03-propuesta-valor-y-mvp.md`.

**Fuera del MVP actual:**

- Live streaming (RF7) — mayor complejidad, no necesario para validar hipótesis centrales.
- Feed social completo + chat (RF5) — reemplazado por notificaciones simples (inscripción confirmada, resultado publicado).
- Pagos in-app de inscripciones — post-MVP según informe.
- Módulo árbitros y resolución de disputas — post-MVP.
- Mapa de recintos / discovery de usuarios (Opción B) — candidato para MVP2 una vez validado el loop de torneos.
- Multi-deporte — solo fútbol en MVP1 según validación encuesta.

**Riesgo / ambigüedad (resuelta):** Se descartó Opción B pura (app móvil hiperlocal) porque requiere stack nativo diferente al acordado (Next.js/Vercel) y el enfoque multi-deporte contradice la validación de encuesta (solo fútbol +18). Se conserva de Opción B la restricción geográfica (Eje Cafetero) como decisión de go-to-market.

## Revisión definición — qué hay y qué falta

| Insumo | Estado |
|--------|--------|
| Contexto, usuarios, MVP en intake | `01`, `02`, `03` con síntesis desde monolito; **decisión MVP cerrada** (Opción A Acotada) |
| PRD formal | `docs/00-prd.md` alineado con MVP elegido; alcance y KPI definidos |
| RF formales | `docs/01-requisitos-funcionales.md` con 5 RF núcleo (RF-001 a RF-005) confirmados para MVP |
| RNF formales | `docs/02-requisitos-no-funcionales.md` borrador con umbral de rendimiento (p95 LCP < 2 s) |
| Migración RF/RNF completos | `intake/04`, `intake/05` + resto de monolito |
| Perfil negocio / pre-factibilidad | Monolito: secciones aún "Pendiente" — completar o enlazar |
| Encuestas ejecutadas + resultados | Diseño en monolito; falta consolidar hallazgos en `intake/06` |

**Para marcar G1 "Listo para revisión":** MVP único, PRD con alcance cerrado, RF prioritarios con GWT, RNF con al menos un umbral medible donde aplique.

## Índice del intake (estado)

| # | Archivo | Estado |
|---|---------|--------|
| 01 | contexto-y-vision | síntesis cargada |
| 02 | usuarios-y-mercado | síntesis cargada |
| 03 | propuesta-valor-y-mvp | **decisión MVP cerrada** — Opción A Acotada (torneos + perfil, 5 RF) |
| 04 | RF borrador | pendiente migración desde monolito |
| 05 | RNF borrador | pendiente (RNF ya reflejados en parte en `docs/02-requisitos-no-funcionales.md`) |
| 06 | validacion | pendiente migración encuestas |
| 07 | modelo-negocio | pendiente migración business plan |
| 08 | anexos | pendiente metodologías |

## Enlaces externos

[COMPLETAR]
