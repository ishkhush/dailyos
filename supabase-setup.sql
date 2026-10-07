create table if not exists public.dailyos_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  value jsonb,
  deleted boolean not null default false,
  stamp bigint not null,
  device text not null,
  primary key (user_id, path)
);
alter table public.dailyos_records enable row level security;
drop policy if exists dailyos_private on public.dailyos_records;
create policy dailyos_private on public.dailyos_records for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.dailyos_records from anon;
grant select, insert, update on public.dailyos_records to authenticated;

create or replace function public.dailyos_merge(changes jsonb)
returns setof public.dailyos_records language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  return query
  insert into public.dailyos_records as existing (user_id,path,value,deleted,stamp,device)
  select auth.uid(),r.path,r.value,r.deleted,r.stamp,r.device
  from jsonb_to_recordset(changes) as r(path text,value jsonb,deleted boolean,stamp bigint,device text)
  order by r.path
  on conflict (user_id,path) do update
  set value=excluded.value, deleted=excluded.deleted, stamp=excluded.stamp, device=excluded.device
  where (excluded.stamp,excluded.device) > (existing.stamp,existing.device)
  returning existing.*;
  return query select * from public.dailyos_records
    where user_id=auth.uid() and path in (select r->>'path' from jsonb_array_elements(changes) r);
end $$;
insert into storage.buckets (id,name,public) values ('dailyos-photos','dailyos-photos',false)
on conflict (id) do update set public=false;
drop policy if exists dailyos_photos_private on storage.objects;
create policy dailyos_photos_private on storage.objects for all to authenticated
using (bucket_id='dailyos-photos' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='dailyos-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.dailyos_seed(changes jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if not exists (select 1 from public.dailyos_records where user_id=auth.uid()) then
    insert into public.dailyos_records(user_id,path,value,deleted,stamp,device)
    select auth.uid(),r.path,r.value,r.deleted,r.stamp,r.device
    from jsonb_to_recordset(changes) as r(path text,value jsonb,deleted boolean,stamp bigint,device text);
  end if;
end $$;
revoke all on function public.dailyos_merge(jsonb), public.dailyos_seed(jsonb) from public, anon;
grant execute on function public.dailyos_merge(jsonb), public.dailyos_seed(jsonb) to authenticated;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='dailyos_records' and schemaname='public') then
    alter publication supabase_realtime add table public.dailyos_records;
  end if;
end $$;
