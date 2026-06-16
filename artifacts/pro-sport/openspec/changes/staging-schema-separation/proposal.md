# Proposal: Staging Schema Separation

## Goal

Allow the app to run against a dedicated Supabase schema (`staging`) while keeping `public` for production.

## Scope

- Make Supabase schema configurable via environment variables.
- Remove hardcoded `public` in realtime subscriptions in app runtime.
- Expose `staging` in Supabase local API config.
- Add migration to create/grant the `staging` schema.
- Add setup documentation for environment wiring.

## Out of scope

- Full migration of every historical SQL file from `public.*` to dynamic schema.
- Automatic cloning of all RLS policies/functions/triggers into `staging`.
