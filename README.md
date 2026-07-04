# e-Invoice Reminder

Capture paper receipts now, then register them for **Malaysia LHDN e-invoice** at the
right time. Malaysian receipts can only be self-registered *after* the merchant syncs
them (a few days later) and *before* a printed deadline — this app tracks that window,
reminds you when it opens, and gives you one-tap access to the merchant's registration
page plus reusable buyer-detail templates to fill it in fast.

A mobile-first PWA built with Next.js 16 + Supabase, deployed on Vercel.

## Features

- 📸 **Capture** — snap a paper receipt, record merchant, amount, purchase date, the
  "wait N days" and "register before" deadline.
- ⏰ **Reminder queue** — receipts grouped by window state: _Waiting → Open now → Due
  soon → Overdue → Registered_.
- 🔗 **One-tap registration** — jump straight to the receipt's QR/registration link.
- 🪪 **Buyer profiles** — save TIN / name / address / email once, copy into any
  merchant's form (per-field or copy-all).
- 👥 **Team sharing** — teammates sign in individually and share receipts + profiles
  via an invite code (Supabase Auth + Row-Level Security).
- 📲 **Installable PWA** — add to home screen, offline shell.

## Tech stack

- **Next.js 16** (App Router, React 19, Turbopack) — note: middleware is `src/proxy.ts`
- **Supabase** — Postgres + Auth + Storage, all access guarded by RLS
- **Tailwind CSS v4**, IBM Plex Sans, Lucide icons

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project values
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |

## Database

The full schema (tables, RLS policies, signup trigger, storage bucket) lives in
[`supabase/schema.sql`](supabase/schema.sql). It was applied to the project via
migrations; the file is a consolidated reference for re-provisioning.

Key tables: `profiles`, `teams`, `team_members`, `buyer_profiles`, `receipts`.
Every row is scoped to a team; access is enforced by the `is_team_member()` RLS helper.

## Deploy (Vercel)

1. Import the GitHub repo in Vercel.
2. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.
3. In Supabase → Authentication → URL Configuration, add your Vercel domain to the
   allowed redirect URLs.

## Notes

- Email confirmation is **on** (Supabase default). For production email at volume,
  configure custom SMTP in Supabase.
- v1 handles paper receipts; digital/email receipt import is a future addition.
