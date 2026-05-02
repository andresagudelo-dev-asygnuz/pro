# Wireframe 02 — Verificación de edad

- **Flujo:** [Flujo 2](../user-flows.md#flujo-2--verificación-de-edad-del-jugador) · **HU:** [HU-002](../../tasks/hu/HU-002.md) · **RF:** RF-007.
- **Ruta:** `/verification/age`.
- **Usuario:** jugador autenticado con estado `pendiente` / `rechazada`.

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur                  Hola, Juan ▾ | Salir    │
├─────────────────────────────────────────────────────────────────┤
│  Verificación de edad                                           │
│  Para inscribirte a torneos necesitamos confirmar que sos +18.  │
│                                                                 │
│  Estado actual:  🟠 Pendiente                                    │
│                                                                 │
│  ┌───────────────────────────────────────────────┐              │
│  │  Subir documento de identidad                 │              │
│  │  (JPG, PNG o PDF · máx. 5 MB · sólo tu cara   │              │
│  │   y fecha de nacimiento visibles).            │              │
│  │                                               │              │
│  │  [  ⤴  Seleccionar archivo  ]                 │              │
│  │  o arrastrar aquí                             │              │
│  │                                               │              │
│  │  ◦ Tu documento sólo lo ven administradores.  │              │
│  │  ◦ Nunca se muestra en tu perfil público.     │              │
│  └───────────────────────────────────────────────┘              │
│                                                                 │
│            [   Enviar para revisión   ]                         │
│                                                                 │
│  ─── Historial ──────────────────────────────────               │
│  • 2026-04-17 · subido documento (esperando revisión)           │
│  • —                                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Variantes por estado

- **Estado `pendiente` sin documento:** uploader visible + CTA "Enviar para revisión" deshabilitado hasta adjuntar archivo.
- **Estado `pendiente` con documento cargado:** banner naranja "Tu documento está en revisión. Te avisaremos cuando se resuelva." + historial con entrada `subido`.
- **Estado `aprobada`:** banner verde "Verificación aprobada el YYYY-MM-DD. Ya podés completar tu perfil e inscribirte a torneos." + CTA "Ir a mi perfil" / "Ver torneos".
- **Estado `rechazada`:** banner rojo con motivo (ej. "Documento ilegible") + CTA "Subir nuevo documento".
- **Menor de edad detectado:** banner rojo "Por el momento PRO está abierto solo a +18. Tu cuenta queda inactiva; podrás reactivarla cuando cumplas 18." sin uploader.

## Componentes

- `VerificationStatusBadge` (verde / naranja / rojo).
- `FileUploader` (drag & drop, validación cliente tipo/tamaño, preview del archivo antes de enviar).
- `PrimaryButton`.
- `HistoryList` (timeline con eventos).

## Estados UX

- Validación de tipo/tamaño ocurre **antes** de enviar al backend.
- El archivo subido nunca se re-descarga al cliente autenticado: se muestra sólo el nombre + fecha.
- Si el usuario intenta otras rutas bloqueadas mientras está `pendiente`, aparece un banner persistente que redirige a esta página.

## Notas UX

- El mensaje de privacidad ("sólo administradores lo ven") debe ser visible **antes** de pedir el archivo, no después.
- Accesibilidad: foco por teclado en el uploader, `aria-live` para cambios de estado, contraste AA en los badges.
- Integración externa (ej. servicio KYC) es decisión de `ADR-003` — el wireframe no asume una u otra.
