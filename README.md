# 🏀 March Madness Draft App

## Setup Guide

### Step 1: Supabase Database

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the contents of `supabase-schema.sql`
3. Go to **Authentication → Users** and create 4 users (email + password for each player)
4. After creating users, copy each user's **UUID** from the Users table
5. Go back to SQL Editor and run the INSERT statement at the bottom of the schema file with the real UUIDs and player info

### Step 2: Environment Variables

Copy `.env.local.example` to `.env.local`:
```
cp .env.local.example .env.local
```

Fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
ADMIN_EMAIL=your_admin_email@example.com
```

### Step 3: Run Locally (to test)

```bash
npm install
npm run dev
```

Visit http://localhost:3000

### Step 4: Deploy to Vercel

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "March Madness app"
   git remote add origin https://github.com/YOUR_USERNAME/march-madness.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo

3. In Vercel project settings → **Environment Variables**, add all 5 variables from your `.env.local`

4. Click **Deploy** — done!

---

## How to Run the Draft

1. Log in with the admin account
2. Go to **Admin** tab
3. Click **Start Draft**
4. Share the site URL with all 4 players
5. Each player logs in — the app shows whose turn it is in real time

## Scoring

Points = **17 − seed of team beaten**

| Upset | Points |
|-------|--------|
| 1 beats 16 | 1 pt |
| 8 beats 9 | 8 pts |
| 16 beats 1 | 16 pts |

## Twilio Trial Note

On a Twilio free trial, you can only text **verified numbers**. Go to:
Twilio Console → Phone Numbers → Verified Caller IDs → Add all 4 player numbers

---

## Team Data

The app uses 2025 NCAA Tournament teams. To update teams, edit `src/lib/teams.ts`.
