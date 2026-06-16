const rawSchema =
  import.meta.env.VITE_SUPABASE_DB_SCHEMA ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA ||
  "public";

const normalized = rawSchema.trim().toLowerCase();

const safeSchema = /^[a-z_][a-z0-9_]*$/.test(normalized) ? normalized : "public";

export const SUPABASE_DB_SCHEMA = safeSchema;

