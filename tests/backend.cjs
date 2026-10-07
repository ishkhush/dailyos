const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const sql=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
(async()=>{
  const db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth,storage to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]
    $$;
    create publication supabase_realtime;
    insert into auth.users values ('${owner}');
  `);
  await db.exec(sql('supabase-setup.sql'));
  await db.exec(sql('supabase-security-hardening.sql'));
  await db.exec(sql('supabase-setup.sql'));
  await db.exec(sql('supabase-security-hardening.sql'));
  await db.exec(`
    insert into auth.users values ('${other}');
    insert into public.dailyos_records values ('${owner}','existing','{"name":"Kept"}',false,1,'phone');
    insert into storage.objects(bucket_id,name) values ('dailyos-photos','${owner}/original.jpg');
    create policy accidental_public on storage.objects for all to anon,authenticated using (true) with check (true);
    create policy accidental_public on public.dailyos_records for all to authenticated using (true) with check (true);
  `);
  await db.exec(sql('supabase-security-hardening.sql'));
  assert.equal((await db.query('select user_id from public.dailyos_owner')).rows[0].user_id,owner,'Rerunning hardening after another signup must preserve the chosen owner');
  const asUser=async(id,statement)=>{
    await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`);
    try{return await db.query(statement);}finally{await db.exec('rollback;');}
  };
  assert.equal((await asUser(owner,'select * from public.dailyos_records')).rows.length,1);
  assert.equal((await asUser(other,'select * from public.dailyos_records')).rows.length,0);
  assert.equal((await asUser(owner,"select * from storage.objects where bucket_id='dailyos-photos'")).rows.length,1);
  assert.equal((await asUser(other,"select * from storage.objects where bucket_id='dailyos-photos'")).rows.length,0);
  await assert.rejects(asUser(other,`insert into public.dailyos_records values ('${owner}','forbidden',null,false,2,'other')`),/row-level security/);
  await assert.rejects(asUser(other,`insert into public.dailyos_records values ('${other}','forbidden',null,false,2,'other')`),/row-level security/);
  await assert.rejects(asUser(other,`insert into storage.objects(bucket_id,name) values ('dailyos-photos','${other}/forbidden.jpg')`),/row-level security/);
  await assert.rejects(asUser(owner,'select * from public.dailyos_owner'),/permission denied/);
  await assert.rejects(asUser(other,'update public.dailyos_owner set user_id=auth.uid()'),/permission denied/);
  assert.equal((await asUser(other,`update storage.objects set name='${other}/stolen.jpg' where name='${owner}/original.jpg' returning *`)).rows.length,0);
  await asUser(owner,"select * from public.dailyos_merge('[{\"path\":\"new\",\"value\":true,\"deleted\":false,\"stamp\":2,\"device\":\"phone\"}]'::jsonb)");
  await db.exec(sql('supabase-security-check.sql'));
  assert.equal((await db.query('select * from public.dailyos_records')).rows.length,1,'Verification probes must not persist changes');
  assert.equal((await db.query('select * from storage.objects')).rows.length,1,'Original photo metadata must remain');
  await db.close();
  console.log('Backend security: migrations idempotent; owner permitted; anonymous/foreign access blocked despite permissive policies; originals preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
