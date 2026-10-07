-- Run after supabase-setup.sql and after your account exists. No records/photos are deleted.
-- If Authentication lists multiple users, set owner_override to YOUR user UUID before running.
begin;

create table if not exists public.dailyos_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id)
);
alter table public.dailyos_owner enable row level security;
revoke all on public.dailyos_owner from public, anon, authenticated;

do $$
declare
  owner_override uuid := null;
  owner_uuid uuid;
begin
  if exists (select 1 from public.dailyos_owner) then
    if owner_override is not null and not exists (
      select 1 from public.dailyos_owner where user_id=owner_override
    ) then raise exception 'Existing owner differs; refusing to change account access automatically'; end if;
    return;
  end if;
  if owner_override is not null then
    if not exists (select 1 from auth.users where id=owner_override) then
      raise exception 'Chosen owner does not exist in Authentication';
    end if;
    owner_uuid := owner_override;
  elsif (select count(*) from auth.users)=1 then
    select id into owner_uuid from auth.users limit 1;
  else
    raise exception 'Choose your account UUID using owner_override; cannot safely infer the owner';
  end if;
  insert into public.dailyos_owner(singleton,user_id) values (true,owner_uuid);
end $$;

create or replace function public.dailyos_is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dailyos_owner where user_id=(select auth.uid()));
$$;
revoke all on function public.dailyos_is_owner() from public, anon;
grant execute on function public.dailyos_is_owner() to authenticated;

drop policy if exists dailyos_account_guard on public.dailyos_records;
create policy dailyos_account_guard on public.dailyos_records as restrictive for all to authenticated
using ((select public.dailyos_is_owner())) with check ((select public.dailyos_is_owner()));
drop policy if exists dailyos_photos_account_guard on storage.objects;
create policy dailyos_photos_account_guard on storage.objects as restrictive for all to authenticated
using (bucket_id<>'dailyos-photos' or (select public.dailyos_is_owner()))
with check (bucket_id<>'dailyos-photos' or (select public.dailyos_is_owner()));

update storage.buckets set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg']
where id='dailyos-photos';
commit;
