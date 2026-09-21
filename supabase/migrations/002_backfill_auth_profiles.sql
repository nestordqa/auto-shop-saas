insert into public.profiles (id, full_name, phone, role)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    split_part(users.email, '@', 1)
  ),
  nullif(trim(users.raw_user_meta_data ->> 'phone'), ''),
  case
    when users.raw_app_meta_data ->> 'role' in ('admin', 'garage_owner', 'mechanic', 'client')
      then (users.raw_app_meta_data ->> 'role')::public.app_role
    else 'client'::public.app_role
  end
from auth.users as users
where not exists (
  select 1 from public.profiles where profiles.id = users.id
);