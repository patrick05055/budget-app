# Patty's Budget Dashboard

A personal finance dashboard built with React + Vite, backed by Supabase.

## Local development

```bash
npm install
cp .env.example .env.local
# fill in your Supabase credentials in .env.local
npm run dev
```

## Deploy to Vercel (free, never sleeps)

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Add these environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_KEY` → your Supabase anon key
4. Click Deploy — done!

## Supabase tables required

Run this SQL in your Supabase SQL Editor:

```sql
-- Main config table (already exists if you used the Streamlit app)
create table if not exists dashboard_data (
  id   text primary key,
  data jsonb
);

-- Weekly history
create table if not exists weekly_history (
  week_of        text primary key,
  month          text,
  grocery_spent  numeric default 0,
  fun_spent      numeric default 0,
  health_spent   numeric default 0,
  total_spent    numeric default 0,
  grocery_budget numeric default 0,
  fun_budget     numeric default 0,
  health_budget  numeric default 0,
  total_budget   numeric default 0,
  groceries      jsonb default '[]',
  fun            jsonb default '[]',
  health         jsonb default '[]'
);

-- Add health columns if weekly_history already exists
alter table weekly_history
  add column if not exists health_spent  numeric default 0,
  add column if not exists health_budget numeric default 0,
  add column if not exists health        jsonb   default '[]';
```
