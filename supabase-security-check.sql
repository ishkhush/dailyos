-- Run in Supabase SQL Editor after supabase-setup.sql. This rolls back all test changes.
begin;

select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as row_security
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') order by c.relname;
select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;

do $$ begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='dailyos_records' and c.relrowsecurity) then
    raise exception 'FAIL: Daily OS row security is not enabled';
  end if;
  if not exists (select 1 from storage.buckets where id='dailyos-photos' and not public
    and file_size_limit=10485760 and allowed_mime_types=array['image/jpeg']) then
    raise exception 'FAIL: Photo privacy or upload limits are incorrect';
  end if;
  if has_function_privilege('anon','public.dailyos_merge(jsonb)','EXECUTE')
    or has_function_privilege('anon','public.dailyos_seed(jsonb)','EXECUTE') then
    raise exception 'FAIL: Anonymous users can execute sync functions';
  end if;
  if not exists (select 1 from public.dailyos_owner) then
    raise exception 'FAIL: Apply supabase-security-hardening.sql to restrict this project to your account';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin
    perform 1 from public.dailyos_records limit 1;
    raise exception 'FAIL: Anonymous users can query Daily OS records';
  exception when insufficient_privilege then
    raise notice 'PASS: Anonymous database access is denied';
  end;
  if exists (select 1 from storage.objects where bucket_id='dailyos-photos') then
    raise exception 'FAIL: Anonymous users can read photo objects';
  end if;
  raise notice 'PASS: Anonymous photo listing reveals nothing';
end $$;
reset role;

-- A fabricated account exercises a different user without creating an Auth account.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
  if public.dailyos_is_owner() then
    raise exception 'Test account unexpectedly matches the owner; change its UUID before testing';
  end if;
  if exists (select 1 from public.dailyos_records
    where user_id<>'00000000-0000-4000-8000-000000000001'::uuid) then
    raise exception 'FAIL: Another user can read existing records';
  end if;
  if exists (select 1 from storage.objects where bucket_id='dailyos-photos'
    and split_part(name,'/',1)<>'00000000-0000-4000-8000-000000000001') then
    raise exception 'FAIL: Another user can read existing photo objects';
  end if;
  begin
    insert into public.dailyos_records(user_id,path,value,deleted,stamp,device)
    values ('00000000-0000-4000-8000-000000000002','security-test',null,false,0,'security-test');
    raise exception 'FAIL: Another user can write someone else''s record';
  exception when insufficient_privilege then
    raise notice 'PASS: Writing another user''s data is denied';
  end;
  raise notice 'PASS: Another user cannot read existing records or photos';
end $$;
reset role;
rollback;
