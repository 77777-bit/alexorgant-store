-- Alexorgant customer support chat
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  phone text,
  customer_token text not null unique,
  status text not null default 'open' check (status in ('open','closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','admin')),
  message text not null check (char_length(message) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id, created_at);
create index if not exists chat_conversations_last_message_idx on public.chat_conversations(last_message_at desc);
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
revoke all on public.chat_conversations from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant usage on schema public to anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_proc where proname='customer_chat_open' and pronamespace='public'::regnamespace) then null; end if;
end $$;

create or replace function public.customer_chat_open(p_customer_name text, p_phone text, p_token text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 100 then raise exception 'رمز المحادثة غير صالح'; end if;
  if p_customer_name is null or char_length(trim(p_customer_name)) not between 1 and 80 then raise exception 'اكتبي اسمك'; end if;
  insert into public.chat_conversations(customer_name,phone,customer_token)
  values(trim(p_customer_name),nullif(trim(coalesce(p_phone,'')),''),p_token)
  on conflict(customer_token) do update set customer_name=excluded.customer_name, phone=coalesce(excluded.phone,chat_conversations.phone)
  returning id into v_id;
  return jsonb_build_object('conversation_id',v_id);
end; $$;

create or replace function public.customer_chat_send(p_conversation_id uuid, p_token text, p_message text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id bigint;
begin
  if p_message is null or char_length(trim(p_message)) not between 1 and 1500 then raise exception 'الرسالة فارغة أو طويلة'; end if;
  if not exists(select 1 from public.chat_conversations where id=p_conversation_id and customer_token=p_token and status='open') then raise exception 'المحادثة غير متاحة'; end if;
  insert into public.chat_messages(conversation_id,sender_role,message) values(p_conversation_id,'customer',trim(p_message)) returning id into v_id;
  update public.chat_conversations set last_message_at=now() where id=p_conversation_id;
  return jsonb_build_object('message_id',v_id);
end; $$;

create or replace function public.customer_chat_messages(p_conversation_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_messages jsonb;
begin
  if not exists(select 1 from public.chat_conversations where id=p_conversation_id and customer_token=p_token) then raise exception 'المحادثة غير متاحة'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender_role',m.sender_role,'message',m.message,'created_at',m.created_at) order by m.created_at), '[]'::jsonb)
  into v_messages from public.chat_messages m where m.conversation_id=p_conversation_id;
  return v_messages;
end; $$;

-- Admin RPCs are restricted to the existing store admin auth user.
create or replace function public.admin_chat_conversations()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is distinct from '9c16b4a7-318a-4720-b3b6-7779cf4e928e'::uuid then raise exception 'غير مصرح'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.last_message_at desc),'[]'::jsonb) from (
    select c.id,c.customer_name,c.phone,c.status,c.created_at,c.last_message_at,
      (select m.message from public.chat_messages m where m.conversation_id=c.id order by m.created_at desc limit 1) as last_message
    from public.chat_conversations c
  ) x);
end; $$;

create or replace function public.admin_chat_messages(p_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_messages jsonb;
begin
  if auth.uid() is distinct from '9c16b4a7-318a-4720-b3b6-7779cf4e928e'::uuid then raise exception 'غير مصرح'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender_role',m.sender_role,'message',m.message,'created_at',m.created_at) order by m.created_at),'[]'::jsonb)
  into v_messages from public.chat_messages m where m.conversation_id=p_conversation_id;
  return v_messages;
end; $$;

create or replace function public.admin_chat_reply(p_conversation_id uuid,p_message text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id bigint;
begin
  if auth.uid() is distinct from '9c16b4a7-318a-4720-b3b6-7779cf4e928e'::uuid then raise exception 'غير مصرح'; end if;
  if p_message is null or char_length(trim(p_message)) not between 1 and 1500 then raise exception 'الرسالة فارغة أو طويلة'; end if;
  if not exists(select 1 from public.chat_conversations where id=p_conversation_id) then raise exception 'المحادثة غير موجودة'; end if;
  insert into public.chat_messages(conversation_id,sender_role,message) values(p_conversation_id,'admin',trim(p_message)) returning id into v_id;
  update public.chat_conversations set last_message_at=now() where id=p_conversation_id;
  return jsonb_build_object('message_id',v_id);
end; $$;

create or replace function public.admin_chat_set_status(p_conversation_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is distinct from '9c16b4a7-318a-4720-b3b6-7779cf4e928e'::uuid then raise exception 'غير مصرح'; end if;
  if p_status not in ('open','closed') then raise exception 'حالة غير صالحة'; end if;
  update public.chat_conversations set status=p_status where id=p_conversation_id;
  return jsonb_build_object('ok',true);
end; $$;

revoke all on function public.customer_chat_open(text,text,text) from public;
revoke all on function public.customer_chat_send(uuid,text,text) from public;
revoke all on function public.customer_chat_messages(uuid,text) from public;
revoke all on function public.admin_chat_conversations() from public;
revoke all on function public.admin_chat_messages(uuid) from public;
revoke all on function public.admin_chat_reply(uuid,text) from public;
revoke all on function public.admin_chat_set_status(uuid,text) from public;
grant execute on function public.customer_chat_open(text,text,text) to anon,authenticated;
grant execute on function public.customer_chat_send(uuid,text,text) to anon,authenticated;
grant execute on function public.customer_chat_messages(uuid,text) to anon,authenticated;
grant execute on function public.admin_chat_conversations() to authenticated;
grant execute on function public.admin_chat_messages(uuid) to authenticated;
grant execute on function public.admin_chat_reply(uuid,text) to authenticated;
grant execute on function public.admin_chat_set_status(uuid,text) to authenticated;
