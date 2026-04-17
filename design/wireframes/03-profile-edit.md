# Wireframe 03 — Edición del perfil tipo ficha (4 bloques + visibilidad)

- **Flujo:** [Flujo 3](../user-flows.md#flujo-3--onboarding-del-perfil-tipo-ficha-con-visibilidad-por-campo) · **HU:** [HU-003](../../tasks/hu/HU-003.md) · **RF:** RF-002.
- **Ruta:** `/profile/edit`.
- **Usuario:** jugador con verificación de edad `aprobada`.

## Layout — vista desktop

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur            [Previsualizar como…] [ Guardar ]       │
├───────────────────────────────────────────────────────────────────────────┤
│  Mi perfil                                           Progreso: 7 / 12 ▓▓▓ │
│  ┌──────────────┐ ┌─────────────────────────────────────────────────────┐ │
│  │  Bloques     │ │  [|] Bloque 1 · Identidad                           │ │
│  │  ───────     │ │  ───────────────────────────────────                │ │
│  │  ● Identidad │ │  Nombre completo           Visibilidad: <público ▾>  │ │
│  │  ○ Morfol.   │ │  {Juan Pérez García                       }          │ │
│  │  ○ Capacid.  │ │                                                      │ │
│  │  ○ Destrezas │ │  Edad                      (derivada: 22 años 🔒)    │ │
│  │              │ │  ─ viene de verificación de edad, no editable        │ │
│  │  ── MVP1 ──  │ │                                                      │ │
│  │  fútbol      │ │  Ubicación                 Visibilidad: <público ▾>  │ │
│  │              │ │  {Manizales, Caldas, Col.                 }          │ │
│  │  Default     │ │                                                      │ │
│  │  visibilidad │ │  Disciplina principal      Visibilidad: <público ▾>  │ │
│  │  del bloque: │ │  <fútbol ▾>                                          │ │
│  │  <público ▾> │ │                                                      │ │
│  │              │ │  Intereses (opcional)      Visibilidad: <público ▾>  │ │
│  │              │ │  {Senderismo, nutrición deportiva…        }          │ │
│  │              │ │                                                      │ │
│  │              │ │  Habilidades blandas       Visibilidad: <público ▾>  │ │
│  │              │ │  Tags: [liderazgo ✕] [comunicación asertiva ✕] +     │ │
│  │              │ │  Descripción:                                        │ │
│  │              │ │  {Texto libre 500–1000 chars…            }           │ │
│  │              │ │                                                      │ │
│  └──────────────┘ └─────────────────────────────────────────────────────┘ │
│  Núcleo MVP1 obligatorio: ✔ nombre · ✔ ubicación · ✔ disciplina           │
│  · ✔ lateralidad · ✔ posición preferida · ✔ pie hábil                     │
└───────────────────────────────────────────────────────────────────────────┘
```

### Bloque 2 · Morfológico (pestaña)

```
  Estatura (m)          Visibilidad: <promotores ▾>   (MVP1 opcional)
  {1.75                                         }

  Peso competitivo (kg) Visibilidad: <promotores ▾>   (MVP1 opcional)
  {72                                           }

  Envergadura (m)       Visibilidad: <promotores ▾>   (opcional)
  {—                                            }

  Lateralidad           Visibilidad: <público ▾>
  ( ) Diestro  ( ) Zurdo  ( ) Ambidiestro

  Somatotipo            Visibilidad: <promotores ▾>   (opcional)
  <Mesomorfo ▾>
```

### Bloque 3 · Capacidades condicionales (pestaña)

```
  Fuerza                Visibilidad: <público ▾>
  Tags: [explosiva] [tren inferior] +
  {Texto corto 200–400 chars…                   }

  Velocidad             Visibilidad: <público ▾>
  Tags: [reacción] [lateral] +
  {Texto corto…                                 }

  Resistencia           Visibilidad: <público ▾>
  Tags: [anaeróbica] +
  {Texto corto…                                 }

  Flexibilidad          Visibilidad: <público ▾>
  Tags: [hombros] +
  {Texto corto…                                 }
```

### Bloque 4 · Destrezas — fútbol MVP1 (pestaña)

```
  Posición preferida     Visibilidad: <público ▾>
  <Mediocampista ▾>   (+ subposición opcional)

  Pie hábil              Visibilidad: <público ▾>
  ( ) Derecho  ( ) Izquierdo  ( ) Ambos

  Rendimiento individual Visibilidad: <público ▾>
  {Texto libre + métricas (goles, asistencias…)…}

  Rol táctico            Visibilidad: <público ▾>
  {Texto libre…                                 }

  Stats derivadas (auto) Visibilidad: <público ▾>
  ◦ Se alimentan por RF-005 cuando haya resultados cargados.
  ◦ Podés ocultar estos stats con visibilidad <privado>.
```

## Componentes

- `ProfileBlockTabs` (4 pestañas con indicador de completitud por bloque).
- `FieldWithVisibility` — input + `<VisibilitySelect>` a la derecha con opciones `público` / `promotores` / `privado`.
- `VisibilitySelect` (dropdown con iconografía por nivel + tooltip explicativo).
- `TagPicker` (multi-select desde catálogo cerrado, con búsqueda, + botón "agregar").
- `TextAreaWithCounter` (cuenta chars con rango visible).
- `ReadonlyField` (p. ej. edad derivada de verificación).
- `ProgressHeader` (barra + contador "7 / 12").
- `PreviewAsMenu` (desplegable con "Previsualizar como… público / promotor / privado").

## Estados UX

- **Persistencia por bloque**: se guarda al cambiar de pestaña o con botón "Guardar" explícito; indicador `guardado hace 3s`.
- **Validación de tags**: sólo del catálogo cerrado; tag fuera → error en el picker.
- **Regla de visibilidad**: `documento de identidad` nunca sale de `privado` (no editable); el selector aparece deshabilitado con tooltip explicativo.
- **Default por bloque**: cambiar "Default visibilidad del bloque" aplica a los campos que no tengan override explícito (affordance + confirmación al hacerlo).
- **Modo `Previsualizar como…`**: renderiza la vista pública según el nivel elegido; con CTA visible "Volver a edición".

## Notas UX

- En mobile, las pestañas se convierten en un `accordion` vertical y el selector de visibilidad se mueve bajo el label del campo.
- El selector de visibilidad por campo es **el control más repetido de la app** — tiene que ser compacto (ícono + texto corto + dropdown), no un radio grupal por cada campo.
- Accesibilidad: label asociado al selector de visibilidad vía `aria-describedby`; cada `select` tiene etiqueta "Visibilidad de {nombre_campo}".
