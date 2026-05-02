# PR #13 — HU-002 Verificación de edad — Plan de testing

> Contra Supabase local (`http://127.0.0.1:54321`) + Next.js dev (`http://localhost:3000`). Branch `devin/1776532510-g4-sprint1-prc-age-verification` @ commit `e9d12a1`.

## Qué cambió (user-visible)

1. **Ruta nueva `/verificacion`**: subir un documento (JPG/PNG/PDF, max 5 MB) para verificar +18. Muestra estado actual + formulario condicional.
2. **Banner global** en el layout `(app)`: si la verificación no está aprobada, aparece una barra arriba en `/verificacion`, `/feed`, `/profile`, `/matches`, etc. El texto cambia según estado: *sin fila* → "Subí tu documento", *pendiente* → "En revisión", *rechazada* → "Subí un nuevo documento", *aprobada* → no renderiza.
3. **Fix del Devin Review #1**: tras subida exitosa el form se **resetea** (archivo limpio, botón deshabilitado). Gated por `state.uploadedAt`, no por `state.message`, para soportar uploads consecutivos con el mismo texto de éxito.
4. **Fix del Devin Review #2**: `revalidatePath("/", "layout")` asegura que el banner refleje el nuevo estado en **todas** las rutas del grupo `(app)`, no sólo en `/verificacion`.

## Flujo principal (una sola pasada end-to-end)

Precondición: usuario fresco recién registrado, sin fila en `public.age_verifications`.

1. **Signup** en `/signup` con `test-prc-<ts>@test.dev` + password válida + "Jugador" marcado (default). Submit.
2. Redirige a `/onboarding` (o similar — completar si bloquea). Terminar en `/feed`.
3. En `/feed` observar el **banner naranja (warn)** con el texto **"Para inscribirte a torneos necesitamos verificar que sos +18."** y link **"Subí tu documento"** hacia `/verificacion`. Este es el estado baseline (usuario SIN fila).
4. Click en "Subí tu documento" → navega a `/verificacion`.
5. En `/verificacion`: el panel de estado muestra badge **"Sin verificar"** + copy **"Todavía no subiste ningún documento."** El formulario está visible.
6. Subir un PDF válido (< 5 MB) y click **Enviar para revisión**.
7. Tras la Server Action, en la misma página esperar:
   - **Mensaje de éxito**: texto exacto **"Documento subido. Lo vamos a revisar y te avisamos por email cuando esté aprobado."**
   - **Form reseteado** (fix #1): el `<input type=file>` vuelve a estado vacío (sin nombre de archivo visible) y el botón **Enviar para revisión** queda deshabilitado.
   - **Panel de estado actualizado**: badge **"Pendiente"** + copy **"Tu documento está en revisión. Te avisamos por email cuando se resuelva."**
   - **Banner cambió de tono**: de naranja (`warn`) a gris (`info`) con texto **"Tu documento está en revisión. Te avisamos cuando se resuelva."**
8. Navegar a `/feed` **sin recargar forzado** (click o `Link`).
   - **Banner en `/feed` ya es el gris de "pendiente"** (fix #2). Si fuera naranja "Subí tu documento", el layout-wide revalidate no estaría funcionando.
9. Verificar DB:

```bash
docker exec supabase_db_pro psql -U postgres -d postgres -c \
  "select status, mime_type, file_size_bytes, storage_path, uploaded_at
   from public.age_verifications av join auth.users u on u.id=av.user_id
   where u.email like 'test-prc-%@test.dev' order by av.created_at desc limit 1;"
```

Esperar **exactamente una fila** con `status='pendiente'`, `mime_type` = mime del archivo subido, `file_size_bytes` = tamaño real, `storage_path` empieza con `<user_id>/<epoch>_` y termina en `.pdf`/`.jpg`/`.png`.

10. Verificar objeto en bucket privado:

```bash
docker exec supabase_db_pro psql -U postgres -d postgres -c \
  "select name, bucket_id, owner from storage.objects where bucket_id='age-verifications' order by created_at desc limit 1;"
```

Esperar **una fila** con `bucket_id='age-verifications'`, `name` igual al `storage_path` de (9).

## Assertion crítica del fix #1 (evitar duplicados consecutivos)

Estando en `/verificacion` con estado `pendiente` (el uploader sigue visible porque `shouldShowUploader` permite reemplazo):

11. Subir un **segundo** documento distinto (mismo user). Submit.
12. Confirmar:
    - Mensaje de éxito vuelve a aparecer.
    - **Form reseteado de nuevo** (archivo vacío, botón deshabilitado). Si el `useEffect` se basara en `state.message` (string idéntico entre uploads), React no dispararía el effect y el form quedaría con el segundo archivo aún seleccionado — sería un fail visible.
13. En DB: **dos filas** con `status='pendiente'` para el mismo `user_id`, tiempos distintos.

## Assertion adversarial: si el fix no estuviera aplicado

- Sin fix #1 (el original): tras (7) el botón "Enviar para revisión" quedaría habilitado y el archivo seleccionado seguiría visible como "Seleccionado: <name>" → visible en screenshot. El test FALLA.
- Sin fix #2: en (8) el banner en `/feed` diría todavía "Para inscribirte a torneos necesitamos verificar que sos +18." (naranja) → test FALLA por diff de tono + texto.

## No incluido (fuera de alcance de PR C)

- Aprobar / rechazar el documento (flujo admin → PR D, Sprint 2).
- Enforcement en `/torneos/*` (Sprint 3 vía `requireAgeVerificationAprobada`).
- Testear `menor_edad` (sin UI user-facing en MVP1).

## Findings abiertos de Devin Review no abordados

- `requireAgeVerificationAprobada` no llama a `requireUser()` antes de chequear el status; la docstring dice que sí. Helper NO se invoca en Sprint 1 (se usa desde Sprint 3), así que no toca este test. Lo reporto al usuario y lo dejo a decisión suya (fix en este PR o followup).
