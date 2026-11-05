-- 041: Run this file alone, before 042. PostgreSQL cannot use a new enum value
-- in the same transaction that adds it.
alter type public.app_role add value if not exists 'seller' after 'garage_manager';
