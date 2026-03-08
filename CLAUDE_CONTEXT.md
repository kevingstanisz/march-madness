# March Madness Draft App - Project Context

## Status: LIVE
- Public site: deployed on Vercel
- GitHub: https://github.com/kevingstanisz/march-madness
- Local dev: C:\projects\march-madness
- Run locally: `npm run dev` → http://localhost:3000

## Tech Stack
- **Frontend/Backend**: Next.js 14 (App Router, TypeScript)
- **Database + Auth**: Supabase
- **SMS**: Twilio (send + receive via webhook)
- **Scores**: ESPN unofficial API (auto-pulls)
- **Hosting**: Vercel (auto-deploys on git push)

## Architecture
- Public site (no login) → shows draft board + standings
- Admin login at /admin/login → one user (Kev), is_admin = TRUE in players table
- Players draft by TEXTING team name to Twilio number
- Twilio webhook → /api/webhook → validates + records pick + notifies all players
- ESPN API auto-updates standings every 60 seconds
- Admin can make backup picks via website

## Database (Supabase)
Tables:
- `players` — id, auth_user_id, name, email, phone, draft_order, is_admin
- `picks` — id, player_id, team_name, seed, pick_number, auto_assigned
- `draft_state` — id, current_pick_number, current_player_id, player_order, is_complete

Players:
- Kev (admin, draft_order: 1)
- Dan (draft_order: 2)
- Frank (draft_order: 3)
- Zack (draft_order: 4)

## Draft Rules (NEEDS CODE UPDATE - see below)
- Snake draft order: 1,2,3,4,4,3,2,1...
- Players pick ONE team per seed line
- ~~Seed must be picked in order~~ → REMOVED: players can pick ANY seed line on their turn
- Auto-assign: if 3 of 4 teams from a seed are picked, 4th player gets the remaining team FREE (doesn't count as their turn, marked as auto_assigned=true)
- 64 total picks (16 seeds × 4 players), but auto-assigns don't count as turns

## Scoring
- Points = 17 minus the seed of the team beaten
- Example: 1-seed beats 16-seed = 1 point. 16-seed upsets 1-seed = 16 points
- ESPN API pulls results automatically

## Pending Code Changes
_(none)_

## Key Files
- `src/app/page.tsx` — public home page (draft board + standings tabs)
- `src/app/admin/page.tsx` — admin panel (start draft, backup picks, all picks view)
- `src/app/admin/login/page.tsx` — admin login
- `src/app/api/webhook/route.ts` — Twilio SMS webhook (main draft pick handler)
- `src/app/api/draft/route.ts` — API route for web-based picks
- `src/app/api/standings/route.ts` — standings via ESPN API
- `src/lib/teams.ts` — all 64 teams with seeds and regions
- `src/lib/draft.ts` — draft logic helpers (snake order, auto-assign)
- `src/lib/espn.ts` — ESPN API fetcher
- `src/lib/twilio.ts` — SMS sender
- `src/lib/supabase.ts` — Supabase client

## Environment Variables (in .env.local and Vercel)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

## Workflow
1. Make changes in VS Code
2. `git add . && git commit -m "description" && git push`
3. Vercel auto-deploys in ~60 seconds

## Twilio Webhook (TODO: set after deploy)
Set in Twilio Console → Phone Numbers → your number → Messaging → Webhook URL:
`https://YOUR-APP.vercel.app/api/webhook`
Method: HTTP POST
