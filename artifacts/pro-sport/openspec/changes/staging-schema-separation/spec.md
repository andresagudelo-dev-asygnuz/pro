# Spec: Staging Schema Separation

## Requirement 1: Runtime schema routing

GIVEN `VITE_SUPABASE_DB_SCHEMA=staging`  
WHEN the frontend initializes Supabase  
THEN all standard table queries MUST use schema `staging`.

GIVEN `VITE_SUPABASE_DB_SCHEMA=public`  
WHEN the frontend initializes Supabase  
THEN all standard table queries MUST use schema `public`.

## Requirement 2: Realtime schema routing

GIVEN realtime subscriptions are created for notifications/bookings/messages  
WHEN the app subscribes  
THEN the subscription schema MUST match the configured runtime schema.

## Requirement 3: Supabase local API exposure

GIVEN local Supabase is started with project config  
WHEN API schemas are loaded  
THEN both `public` and `staging` MUST be exposed.

## Requirement 4: Schema bootstrap

GIVEN migrations are applied  
WHEN bootstrap migration executes  
THEN schema `staging` MUST exist with baseline grants for `anon`, `authenticated`, and `service_role`.
