-- Run this file alone, before 018. PostgreSQL cannot use a new enum value
-- in the same transaction that adds it.
alter type public.order_status add value if not exists 'en_prueba' after 'en_reparacion';
