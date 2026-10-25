Alexorgant Cosmetics - guest checkout update

Changes in this package:
- Removed the customer login/account UI from the storefront. Supabase Auth remains available for admin-side use; no customer sign-in is required to place an order.
- Added delivery-zone selection and optional discount-code input to checkout.
- Added delivery zone and discount database tables, order total fields, and initial delivery fees.
- Added an SQL migration file for the new checkout RPC. It MUST be run in Supabase SQL Editor before checkout can save orders with delivery/discount settings.

Initial delivery fees seeded in Supabase:
- القاهرة: 50 EGP
- الجيزة: 50 EGP
- الإسكندرية: 45 EGP
- باقي المحافظات: 75 EGP

Free delivery rule: product subtotal after discount >= 500 EGP.
Discount types: percentage or fixed amount. Percentage discounts can have a per-code max_discount.

IMPORTANT:
1. In Supabase Dashboard > SQL Editor, run `supabase_guest_checkout_rpc.sql` before deploying these frontend files.
2. The RPC migration wraps the existing order-creation function; it validates the selected delivery zone and discount and updates the saved order total.
3. The legacy five-argument create_store_order RPC still exists and should have EXECUTE revoked from anon/authenticated after verifying the new checkout works. See the commented SQL at the end of the migration.
4. Prices can be edited later in public.delivery_zones from Supabase Table Editor. Admin UI for editing delivery/discounts is not included yet.
5. No real payment processing or payment-proof upload is included in this package; the current checkout still labels payment as cash on delivery.
6. Upload the contents of the `Alexorgant` folder to the GitHub repository, replacing the existing storefront files, then let Vercel redeploy.
