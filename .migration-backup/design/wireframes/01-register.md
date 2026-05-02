# Wireframe 01 — Registro con rol

- **Flujo:** [Flujo 1](../user-flows.md#flujo-1--registro-con-rol-jugador--promotor) · **HU:** [HU-001](../../tasks/hu/HU-001.md) · **RF:** RF-001.
- **Ruta:** `/register`.
- **Usuario:** visitante sin cuenta.

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur                              Iniciar sesión│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            Crear cuenta en PRO                                  │
│            ---------------------                                │
│                                                                 │
│   Email                                                         │
│   {ejemplo@correo.com                                      }    │
│                                                                 │
│   Contraseña                                                    │
│   {•••••••••                                              }    │
│   Confirmar contraseña                                          │
│   {•••••••••                                              }    │
│   ◦ Mín. 10 chars · 1 número · 1 símbolo (reglas en G3)         │
│                                                                 │
│   Soy…                                                          │
│   ( ) Jugador          ( ) Promotor                             │
│   (puedes marcar ambos si participas como jugador y organizas)  │
│                                                                 │
│   ( ) Acepto términos y tratamiento de datos                    │
│                                                                 │
│            [   Crear cuenta   ]                                 │
│                                                                 │
│   ¿Ya tenés cuenta? → Iniciar sesión                            │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes

- `AppHeader` (logo + link a login).
- `FormField` (label + input + helper text + error).
- `PasswordField` (campo + barra de cumplimiento de reglas).
- `RoleSelector` (2 checkboxes con descripción corta; validación: al menos uno).
- `TermsCheckbox`.
- `PrimaryButton` (loading state + disabled).
- `InlineError` bajo cada campo.

## Estados

- **Vacío / neutro** (por defecto, CTA deshabilitado hasta que todos los campos tengan contenido válido).
- **Validando** (spinner en el botón tras pulsar "Crear cuenta").
- **Error de campo** (email mal formado, contraseñas no coinciden, contraseña débil, rol no marcado, términos no aceptados).
- **Error global** (email ya registrado → mensaje con CTA "Iniciar sesión"; 5xx → toast con reintento).
- **Éxito** → redirección: si rol incluye `jugador` → `/verification/age`; si sólo `promotor` → `/tournaments/mine`.

## Notas UX

- El rol debe ser un **checkbox múltiple**, no radio: el modelo de dominio permite ambos roles.
- Password rules deben leerse en tiempo real (mini-checklist debajo del campo) y ser consistentes con la regla final definida en ADR-004.
- Formulario responsive: en mobile, los campos ocupan el 100% del ancho; el "Soy…" se apila vertical.
- No se pide nombre/ubicación/edad en este paso — eso pertenece al onboarding del perfil (Flujo 3) y a verificación (Flujo 2).
