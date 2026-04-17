# Wireframe 04 — Perfil público (vista de otros)

- **Flujo:** [Flujo 3](../user-flows.md#flujo-3--onboarding-del-perfil-tipo-ficha-con-visibilidad-por-campo) · **HU:** [HU-003](../../tasks/hu/HU-003.md) · **RF:** RF-002.
- **Ruta:** `/u/:slug`.
- **Usuario:** cualquiera (autenticado o no). Visibilidad del contenido depende de la relación y del selector por campo.

## Layout — vista pública (visitante sin sesión)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur                              [ Crear cuenta ]      │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐   Juan Alberto Pérez García             ⚽ Fútbol          │
│  │  avatar   │   Manizales, Caldas, Colombia · 22 años                    │
│  │           │   Mediocampista · Pie hábil: derecho                       │
│  └───────────┘   [ Ver torneos donde participa ]                          │
│                                                                           │
│  ── Habilidades blandas ──                                                │
│  #liderazgo  #comunicación asertiva  #disciplina                          │
│  "Liderazgo positivo en situaciones de presión, alta capacidad de         │
│   comunicación asertiva con el entrenador y disciplina en horarios."      │
│                                                                           │
│  ── Capacidades condicionales ──                                          │
│  Fuerza: explosiva, tren inferior                                         │
│  Velocidad: reacción, desplazamiento lateral                              │
│  Resistencia: anaeróbica alta                                             │
│  Flexibilidad: rango óptimo en hombros                                    │
│                                                                           │
│  ── Destrezas técnicas (fútbol) ──                                        │
│  Rol táctico: mediocampista central, apoyo defensivo en segunda línea     │
│                                                                           │
│  ── Historial en PRO ──                                                   │
│  Torneos jugados: 3 · Goles: 5 · Asistencias: 7                           │
│                                                                           │
│  (morfológicos no visibles — sólo promotores pueden verlos)               │
└───────────────────────────────────────────────────────────────────────────┘
```

## Layout — vista de un promotor (autenticado, rol promotor)

Mismo layout que arriba, **más** un bloque:

```
  ── Análisis morfológico y biométrico (sólo promotores) ──
  Estatura: 1.75 m · Peso competitivo: 72 kg · Lateralidad: diestro
  Somatotipo: mesomorfo
```

El promotor también ve un CTA adicional: `[ Invitar a mi torneo ]` que abre la flujo de inscripción/invitación (post-MVP si corresponde).

## Layout — vista propia (owner del perfil)

Sobre el header aparece:

```
  [ Editar perfil ]   [ Previsualizar como… ▾ ]   ●●● privado · configurar
```

## Componentes

- `ProfileHeader` (avatar + identidad + CTAs contextuales).
- `TagList` (chips con `#tag`).
- `SectionBlock` (heading + contenido; se oculta completo si el usuario no tiene permisos para ningún campo de la sección).
- `StatGrid` (2–4 métricas compactas).
- `VisibilityHint` (nota "X contenido sólo visible para promotores" cuando aplique).
- `CTAStrip` (botonera contextual por rol del visitante).

## Estados UX

- Bloques cuyo contenido completo está en visibilidad que excluye al visitante → **no se renderizan** (ni siquiera su encabezado), para no filtrar metadatos.
- Visitante sin sesión no ve campos `promotores` ni `privado`.
- Promotor ve campos `público` y `promotores` — nunca `privado`.
- Owner ve todo lo suyo, incluso `privado`, con badge indicando el nivel del campo.
- Campos de tipo "stats derivadas" solo aparecen si RF-005 ya generó datos; si no, se omiten.

## Notas UX

- Privacy-by-design: el **backend** es la única fuente de verdad de visibilidad. La UI renderiza exactamente lo que el backend devuelve según el viewer. Evita flashes de contenido privado al autenticarse / desautenticarse.
- SEO: sólo campos `público` entran al `<head>` / OpenGraph / sitemap. Campos `promotores` y `privado` nunca.
- URL con `slug` mnemónico (`/u/juan-perez-manizales`), independiente del ID numérico.
