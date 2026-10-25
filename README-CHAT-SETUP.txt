ALEXORGANT LIVE CHAT SETUP

Files added:
- supabase_live_chat.sql: creates chat tables and secure RPC functions.
- admin-chat.html: admin inbox and reply page.
- index.html / script.js / style.css: customer chat bubble on the storefront.

IMPORTANT SETUP STEPS
1) Open Supabase Dashboard > SQL Editor > New query.
2) Paste the FULL contents of supabase_live_chat.sql and click Run.
3) Confirm the SQL query succeeds.
4) Upload the updated storefront files to the ROOT of the GitHub repository, overwriting index.html, script.js and style.css. Also upload admin-chat.html and the two setup files. Keep logo.jpg in the same root.
5) Wait for Vercel deployment to show Ready.
6) Open https://alexorgant-store.vercel.app/admin-chat.html and sign in with the existing store admin account.

The admin RPCs are restricted to the existing admin auth user ID configured in the SQL and admin page. If the admin account is ever changed, update that UUID in both files.

Customer chat is anonymous and does not require a customer account. The conversation token and ID are saved in that browser's localStorage. Polling refreshes messages every 5 seconds. Do not publish service-role keys in the site.
