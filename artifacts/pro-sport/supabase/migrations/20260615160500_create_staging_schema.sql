-- Staging schema bootstrap.
-- This migration only creates and exposes the schema boundary.
-- Table/function rollout into staging should happen through dedicated migrations.

create schema if not exists staging;

grant usage on schema staging to anon, authenticated, service_role;
grant create on schema staging to service_role;

alter default privileges in schema staging
  grant select, insert, update, delete, truncate, references, trigger on tables to authenticated, service_role;

alter default privileges in schema staging
  grant usage, select, update on sequences to authenticated, service_role;

alter default privileges in schema staging
  grant execute on functions to authenticated, service_role;
