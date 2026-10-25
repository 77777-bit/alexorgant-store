-- Alexorgant manual wallet / InstaPay payment proof flow
-- Run once in Supabase SQL Editor after the existing checkout migrations.

alter table public.orders add column if not exists payment_method text not null default 'cod';
alter table public.orders add column if not exists payment_status text not null default 'not_required';
alter table public.orders add column if not exists payment_proof_path text;
alter table public.orders add column if not exists payment_reviewed_at timestamptz;
alter table public.orders add column if not exists payment_review_note text;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
 check (payment_method in ('cod','wallet','instapay'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
 check (payment_status in ('not_required','pending_review','approved','rejected'));

-- Private bucket: customer uploads are not publicly readable.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Anonymous customers can upload a receipt into a folder named with the order UUID.
-- The app validates order ID + order number again through the RPC below.
drop policy if exists "Customer upload payment proofs" on storage.objects;
create policy "Customer upload payment proofs" on storage.objects
 for insert to anon, authenticated
 with check (bucket_id='payment-proofs' and name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9._-]+$');

create or replace function public.submit_payment_proof(
 p_order_id uuid, p_order_number bigint, p_payment_method text, p_proof_path text
) returns boolean
language plpgsql security definer set search_path = '' as $function$
begin
 if p_payment_method not in ('wallet','instapay') then raise exception 'طريقة الدفع غير صحيحة'; end if;
 if p_proof_path is null or split_part(p_proof_path,'/',1) <> p_order_id::text then
   raise exception 'مسار إيصال الدفع غير صحيح';
 end if;
 update public.orders
 set payment_method=p_payment_method,payment_status='pending_review',payment_proof_path=p_proof_path
 where id=p_order_id and order_number=p_order_number;
 if not found then raise exception 'رقم الطلب غير صحيح'; end if;
 return true;
end;
$function$;
revoke all on function public.submit_payment_proof(uuid,bigint,text,text) from public;
grant execute on function public.submit_payment_proof(uuid,bigint,text,text) to anon,authenticated;

-- Admin review is intentionally performed in Supabase Table Editor for this first version:
-- public.orders.payment_status = approved or rejected; set payment_reviewed_at=now().
-- For the receipt, use Storage > payment-proofs to create a temporary signed URL for the admin.
