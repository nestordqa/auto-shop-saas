-- Run this file alone, before 009. PostgreSQL cannot use a new enum value
-- in the same transaction that adds it.
alter type public.app_role add value if not exists 'garage_manager' after 'garage_owner';
