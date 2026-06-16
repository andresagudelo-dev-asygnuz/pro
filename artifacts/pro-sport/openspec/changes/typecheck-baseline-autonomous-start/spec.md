# Spec: Typecheck Baseline Fixes

## Requirement 1: Exhaustive payment status mappings

**GIVEN** PaymentStatus includes "rechazado"  
**WHEN** UI mapping records are declared as Record<PaymentStatus, ...>  
**THEN** all mappings must define "rechazado".

## Requirement 2: Safe post publish author id

**GIVEN** auth user may be null during render transitions  
**WHEN** publish flow computes media path or createPost payload  
**THEN** code must guard user presence before accessing user.id.
