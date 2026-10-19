-- Private bucket for intake photos. The app reads and writes it only from the
-- server with the secret key, handing the browser short-lived signed URLs,
-- so no storage.objects policies are needed and nothing is public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('intake-photos', 'intake-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
