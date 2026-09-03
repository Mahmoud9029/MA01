# Trainingsnotizen — Supabase + Next.js version

Real cross-device sync: your training log, weights, and photos are stored in a
cloud database (Supabase) instead of your phone's browser storage. Open the
app from any device, log in with your email, and see the same data.

## One-time setup (do this when you're ready)

### 1. Supabase — set up the database
1. Go to your Supabase project dashboard.
2. Open **SQL Editor** → **New query**.
3. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   This creates the tables and the security rules (each user only ever sees their own data).
4. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public key**.

### 2. Local setup
```bash
npm install
cp .env.local.example .env.local
```
Open `.env.local` and paste in the Project URL and anon key from step 1.4.

### 3. Run it locally to test
```bash
npm run dev
```
Open `http://localhost:3000` — you should see the login screen.

### 4. Enable email login in Supabase
In Supabase dashboard → **Authentication → Providers**, make sure **Email**
is enabled (it is by default). That's what powers the "magic link" login —
no password needed, just click the link that arrives by email.

### 5. Deploy to Vercel
1. Push this folder to a GitHub repository.
2. In Vercel: **New Project** → import that GitHub repo.
3. In Vercel's project settings → **Environment Variables**, add the same two
   values from your `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Click **Deploy**. You'll get a permanent link like `yourapp.vercel.app`
   that works identically on your phone and computer, with the same data.

## What changed vs. the old single-file version

- Data now lives in Supabase (Postgres) instead of `localStorage` — this is
  what makes it sync across devices.
- Photos upload to Supabase Storage instead of being saved as base64 text
  in the browser (this is also why the app stays fast even with many photos).
- Login is required (email magic link) so the app knows which user's data
  to load — this is the trade-off for real sync.
- Everything else (the plan, the icons, the calendar, the weight chart, the
  calorie estimate) works exactly like before.

## Cost
Both Supabase and Vercel are free for this use case (personal app, one user).
The only optional cost is a custom domain (~€10–15/year) if you don't want
the free `yourapp.vercel.app` address.
