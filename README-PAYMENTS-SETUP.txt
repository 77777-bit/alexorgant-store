Alexorgant — Manual wallet / InstaPay payment setup

IMPORTANT: This adds manual transfer + receipt upload, not automatic card payments.

1) In Supabase Dashboard > SQL Editor, run supabase_manual_payments.sql.
2) Ensure the existing checkout RPC migration and delivery/discount tables are already applied (they are required by the current checkout).
3) Upload the contents of this Alexorgant folder to the ROOT of the GitHub repository, replacing the old files. Keep the SQL files in the repository for reference.
4) Wait for Vercel deployment to finish, then hard-refresh the site (Ctrl+F5).
5) Test a COD order first, then test a wallet/InstaPay order with a small test order. Verify that the order is saved and payment_status becomes pending_review.

Payment destination numbers shown to customers:
- Wallet: 01098703879
- Wallet / InstaPay: 01505447626

Reviewing a transfer (manual first version):
- Supabase > Table Editor > public.orders
- Find the order_number, check payment_status and payment_proof_path.
- To view the private receipt: Supabase > Storage > payment-proofs; create a temporary signed URL for the matching object.
- Set payment_status to approved or rejected and payment_reviewed_at to the current timestamp.

Security notes:
- The receipt bucket is private and limited to 5 MB image files.
- Never put a Supabase service-role key in frontend code.
- This is not automatic payment verification. Do not ship the order until you personally verify the transfer.
