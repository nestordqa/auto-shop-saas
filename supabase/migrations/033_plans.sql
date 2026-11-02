-- Plans (see src/lib/plans.ts):
--   bujia      -> $30/month, up to 15 vehicles a month
--   alternador -> $48/month, up to 40 vehicles a month
--   piston     -> 2% of accepted budgets, minimum $60 and maximum $150 a month, unlimited vehicles
-- (USD, payable at the BCV rate.) Extra vehicles over a subscription limit cost $1.99 each; every extra branch adds $10/month on any plan.
-- `garages.plan` is the plan chosen when the garage is created (suggested for its paid contract);
-- `contracts.plan` is what each paid contract actually bills. Old paid contracts keep plan null and
-- are billed as before (commission % only).
alter table public.garages add column if not exists plan text check (plan in ('bujia', 'alternador', 'piston'));
alter table public.contracts add column if not exists plan text check (plan in ('bujia', 'alternador', 'piston'));
