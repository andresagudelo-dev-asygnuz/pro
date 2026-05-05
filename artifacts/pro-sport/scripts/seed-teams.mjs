#!/usr/bin/env node
/**
 * seed-teams.mjs
 * Usa SUPABASE_SERVICE_ROLE_KEY para:
 * 1. Aplicar las políticas RLS correctas (fix recursión infinita)
 * 2. Crear usuarios de prueba + equipo de ejemplo
 *
 * Uso: node artifacts/pro-sport/scripts/seed-teams.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltan variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── UUIDs fijos ─────────────────────────────────────────────────────────────
const UID_PLAYER   = "aaaaaaaa-aaaa-aaaa-aaaa-000000000001";
const UID_PROMOTER = "aaaaaaaa-aaaa-aaaa-aaaa-000000000002";
const TEAM_ID      = "eeeeeeee-eeee-eeee-eeee-000000000001";

// ─── 1. Fix RLS: aplicar políticas sin recursión ──────────────────────────────
async function fixRls() {
  console.log("\n🔧 Aplicando políticas RLS...");

  // Usamos la REST API del admin para ejecutar SQL vía rpc
  // Supabase admin client no expone exec SQL directamente,
  // pero podemos usar fetch con el service role key.
  const sql = `
    -- Fix recursión: tm_select USING (true)
    DROP POLICY IF EXISTS tm_select ON team_members;
    CREATE POLICY tm_select ON team_members FOR SELECT USING (true);

    -- Fix teams_insert
    DROP POLICY IF EXISTS teams_insert ON teams;
    CREATE POLICY teams_insert ON teams
      FOR INSERT TO authenticated
      WITH CHECK (owner_id = auth.uid());

    -- Fix tm_insert: solo chequea user_id = auth.uid()
    DROP POLICY IF EXISTS tm_insert ON team_members;
    CREATE POLICY tm_insert ON team_members
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  `;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // exec_sql probably doesn't exist — use pg endpoint instead
    console.log("  ⚠️  rpc/exec_sql no disponible, intentando vía pg endpoint...");
    return fixRlsViaPg();
  }
  console.log("  ✅ Políticas RLS aplicadas");
}

async function fixRlsViaPg() {
  // Supabase exposes /pg/query for superuser SQL via service role
  const statements = [
    "DROP POLICY IF EXISTS tm_select ON team_members",
    "CREATE POLICY tm_select ON team_members FOR SELECT USING (true)",
    "DROP POLICY IF EXISTS teams_insert ON teams",
    `CREATE POLICY teams_insert ON teams FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())`,
    "DROP POLICY IF EXISTS tm_insert ON team_members",
    `CREATE POLICY tm_insert ON team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())`,
  ];

  for (const sql of statements) {
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.log(`  ⚠️  /pg/query falló (${res.status}): ${text.slice(0,200)}`);
      console.log("  ℹ️  Las políticas deben aplicarse manualmente en el SQL Editor de Supabase.");
      return false;
    }
    console.log(`  ✅ ${sql.slice(0, 60)}...`);
  }
  return true;
}

// ─── 2. Crear usuarios de prueba ──────────────────────────────────────────────
async function seedUsers() {
  console.log("\n👤 Creando usuarios de prueba...");

  const users = [
    { id: UID_PLAYER,   email: "jugador@pro.test",  name: "Juan Jugador",   isPlayer: true,  isPromoter: false },
    { id: UID_PROMOTER, email: "promotor@pro.test", name: "Pedro Promotor", isPlayer: false, isPromoter: true  },
  ];

  for (const u of users) {
    // Check if already exists
    const { data: existing } = await admin.auth.admin.getUserById(u.id);
    if (existing?.user) {
      console.log(`  ⏭️  ${u.email} ya existe`);
      continue;
    }

    const { error } = await admin.auth.admin.createUser({
      user_metadata: { full_name: u.name, is_player: u.isPlayer, is_promoter: u.isPromoter },
      email: u.email,
      password: "Test1234!",
      email_confirm: true,
      id: u.id,
    });
    if (error) {
      console.log(`  ⚠️  ${u.email}: ${error.message}`);
    } else {
      console.log(`  ✅ ${u.email} creado`);
    }
  }
}

// ─── 3. Seed profiles ─────────────────────────────────────────────────────────
async function seedProfiles() {
  console.log("\n📋 Upsert profiles...");
  const profiles = [
    { id: UID_PLAYER,   full_name: "Juan Jugador",   city: "Medellín",  username: "juan_jugador",   primary_skill_level: "intermedio" },
    { id: UID_PROMOTER, full_name: "Pedro Promotor", city: "Manizales", username: "pedro_promotor", primary_skill_level: "avanzado" },
  ];
  const { error } = await admin.from("profiles").upsert(profiles, { onConflict: "id" });
  if (error) console.log(`  ⚠️  profiles: ${error.message}`);
  else console.log("  ✅ Profiles OK");
}

// ─── 4. Seed user_roles ───────────────────────────────────────────────────────
async function seedRoles() {
  console.log("\n🎭 Upsert user_roles...");
  const roles = [
    { user_id: UID_PLAYER,   is_player: true,  is_promoter: false },
    { user_id: UID_PROMOTER, is_player: false, is_promoter: true  },
  ];
  const { error } = await admin.from("user_roles").upsert(roles, { onConflict: "user_id" });
  if (error) console.log(`  ⚠️  user_roles: ${error.message}`);
  else console.log("  ✅ Roles OK");
}

// ─── 5. Seed team ─────────────────────────────────────────────────────────────
async function seedTeam() {
  console.log("\n⚽ Creando equipo de ejemplo...");

  // Upsert team (admin bypasses RLS)
  const { data: team, error: teamErr } = await admin
    .from("teams")
    .upsert(
      {
        id: TEAM_ID,
        name: "Los Cracks FC",
        slug: "los-cracks-fc-seed",
        description: "Equipo de prueba creado por el seed",
        sport_type: "futbol_5",
        city: "Medellín",
        owner_id: UID_PLAYER,
        is_public: true,
        max_members: 20,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (teamErr) {
    console.log(`  ❌ Error creando equipo: ${teamErr.message} (code: ${teamErr.code})`);
    return;
  }
  console.log(`  ✅ Equipo "${team.name}" OK (id: ${team.id})`);

  // Upsert members
  const members = [
    { team_id: TEAM_ID, user_id: UID_PLAYER,   role: "owner" },
    { team_id: TEAM_ID, user_id: UID_PROMOTER, role: "player" },
  ];
  const { error: memErr } = await admin
    .from("team_members")
    .upsert(members, { onConflict: "team_id,user_id" });
  if (memErr) console.log(`  ⚠️  team_members: ${memErr.message}`);
  else console.log(`  ✅ Miembros del equipo OK`);
}

// ─── 6. Verificar que el INSERT funciona con anon autenticado ─────────────────
async function verifyInsertPolicy() {
  console.log("\n🔍 Verificando INSERT policy con usuario real...");

  // Sign in as jugador@pro.test
  const anonClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: "jugador@pro.test",
    password: "Test1234!",
  });
  if (signInErr) {
    console.log(`  ⚠️  No se pudo hacer sign in: ${signInErr.message}`);
    return;
  }
  console.log(`  ✅ Sign in OK como ${authData.user.email}`);

  // Try insert
  const { error: insErr } = await anonClient
    .from("teams")
    .insert({
      name: "Test Insert Policy",
      slug: "test-insert-policy-" + Date.now(),
      sport_type: "futbol_5",
      city: "Medellín",
      owner_id: authData.user.id,
      is_public: true,
      max_members: 10,
      updated_at: new Date().toISOString(),
    });

  if (insErr) {
    console.log(`  ❌ INSERT todavía falla: ${insErr.message} (code: ${insErr.code})`);
    if (insErr.code === "42501") {
      console.log("\n  ⚠️  ACCIÓN REQUERIDA: Las políticas RLS no están activas.");
      console.log("  Pegá este SQL en Supabase → SQL Editor → New query:\n");
      console.log("  DROP POLICY IF EXISTS teams_insert ON teams;");
      console.log("  CREATE POLICY teams_insert ON teams");
      console.log("    FOR INSERT TO authenticated");
      console.log("    WITH CHECK (owner_id = auth.uid());\n");
      console.log("  DROP POLICY IF EXISTS tm_select ON team_members;");
      console.log("  CREATE POLICY tm_select ON team_members FOR SELECT USING (true);\n");
      console.log("  DROP POLICY IF EXISTS tm_insert ON team_members;");
      console.log("  CREATE POLICY tm_insert ON team_members");
      console.log("    FOR INSERT TO authenticated");
      console.log("    WITH CHECK (user_id = auth.uid());");
    }
  } else {
    console.log("  ✅ INSERT funciona correctamente. ¡El equipo se puede crear desde la app!");
  }

  await anonClient.auth.signOut();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 PRO. — Seed Script");
  console.log(`   URL: ${SUPABASE_URL}`);

  await fixRls();
  await seedUsers();
  await seedProfiles();
  await seedRoles();
  await seedTeam();
  await verifyInsertPolicy();

  console.log("\n✅ Seed completado.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
