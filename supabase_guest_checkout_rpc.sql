-- Run this in Supabase SQL Editor after the delivery_zones, discount_codes,
-- and orders columns migration has been applied.
-- This uses the existing private.create_store_order(text,text,text,text,jsonb)
-- to validate product prices/stock and create the order, then applies delivery
-- and discount totals atomically (exceptions roll back the transaction).

create or replace function private.create_store_order(
 p_customer_name text, p_phone text, p_address text, p_notes text, p_items jsonb,
 p_delivery_zone text, p_discount_code text default null
) returns table(order_id uuid, order_number bigint, subtotal numeric, discount_amount numeric, delivery_fee numeric, total numeric)
language plpgsql security definer set search_path = '' as $function$
declare
 v_old record;
 v_zone_fee numeric(10,2);
 v_discount numeric(12,2) := 0;
 v_delivery numeric(12,2) := 0;
 v_total numeric(12,2);
 v_code public.discount_codes%rowtype;
 v_code_text text := nullif(upper(trim(coalesce(p_discount_code,''))), '');
begin
 select dz.fee into v_zone_fee from public.delivery_zones dz where dz.zone_name=p_delivery_zone and dz.is_active=true;
 if not found then raise exception 'اختاري محافظة أو منطقة توصيل صحيحة'; end if;

 -- Existing routine checks product IDs, prices, stock and creates order/items.
 select * into v_old from private.create_store_order(p_customer_name,p_phone,p_address,p_notes,p_items);

 if v_code_text is not null then
  select * into v_code from public.discount_codes dc where upper(dc.code)=v_code_text and dc.is_active=true for update;
  if not found then raise exception 'كود الخصم غير صحيح أو غير مفعّل'; end if;
  if v_code.valid_from is not null and now()<v_code.valid_from then raise exception 'كود الخصم لم يبدأ بعد'; end if;
  if v_code.valid_until is not null and now()>v_code.valid_until then raise exception 'انتهت صلاحية كود الخصم'; end if;
  if v_old.total<v_code.min_subtotal then raise exception 'قيمة المنتجات أقل من الحد الأدنى لهذا الكود'; end if;
  if v_code.max_uses is not null and v_code.usage_count>=v_code.max_uses then raise exception 'انتهى عدد مرات استخدام كود الخصم'; end if;
  if v_code.discount_type='percentage' then
   v_discount:=round(v_old.total*v_code.discount_value/100,2);
   if v_code.max_discount is not null then v_discount:=least(v_discount,v_code.max_discount); end if;
  else
   v_discount:=v_code.discount_value;
  end if;
  v_discount:=least(v_discount,v_old.total);
 end if;

 if (v_old.total-v_discount)>=500 then v_delivery:=0; else v_delivery:=v_zone_fee; end if;
 v_total:=greatest(0,v_old.total-v_discount)+v_delivery;
 update public.orders set subtotal=v_old.total,delivery_zone=p_delivery_zone,delivery_fee=v_delivery,
   discount_code=v_code_text,discount_amount=v_discount,total=v_total where id=v_old.order_id;
 if v_code_text is not null then
  update public.discount_codes set usage_count=usage_count+1,updated_at=now() where id=v_code.id;
 end if;
 return query select v_old.order_id,v_old.order_number,v_old.total,v_discount,v_delivery,v_total;
end;
$function$;

create or replace function public.create_store_order(
 p_customer_name text, p_phone text, p_address text, p_notes text, p_items jsonb,
 p_delivery_zone text, p_discount_code text default null
) returns table(order_id uuid, order_number bigint, subtotal numeric, discount_amount numeric, delivery_fee numeric, total numeric)
language sql security invoker set search_path = '' as $function$
 select * from private.create_store_order(p_customer_name,p_phone,p_address,p_notes,p_items,p_delivery_zone,p_discount_code)
$function$;

grant execute on function private.create_store_order(text,text,text,text,jsonb,text,text) to anon, authenticated;
grant execute on function public.create_store_order(text,text,text,text,jsonb,text,text) to anon, authenticated;

-- After testing the new checkout successfully, revoke the old five-argument
-- RPC so clients cannot bypass delivery/discount calculations:
-- revoke all on function public.create_store_order(text,text,text,text,jsonb) from public, anon, authenticated;
