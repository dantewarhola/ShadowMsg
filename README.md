# SecureChat v2 — End-to-End Encrypted Messaging

A fully browser-side encrypted chat app. Messages are encrypted with **XSalsa20-Poly1305** (TweetNaCl) before leaving your device. The server never sees plaintext.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend/Realtime:** Supabase (Postgres + Realtime WebSockets)
- **Encryption:** TweetNaCl (XSalsa20-Poly1305 + SHA-256 key derivation)
- **Hosting:** Vercel

---

## Deploy in 5 minutes

### Step 1 — Supabase setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Open **SQL Editor** and paste the contents of `supabase-setup.sql` → Run
3. Go to **Database → Replication** → enable Realtime for the `rooms` table
4. Go to **Project Settings → API** → copy:
   - `Project URL`
   - `anon public` key

### Step 2 — Environment variables

Create a `.env` file (copy `.env.example`):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Step 3 — Deploy to Vercel

```bash
# Option A: Via Vercel CLI
npm i -g vercel
vercel --prod

# Option B: Via GitHub
# 1. Push this folder to a GitHub repo
# 2. Import at vercel.com/new
# 3. Add the two env vars above in Vercel project settings
# 4. Deploy
```

Vercel auto-detects Vite. The `vercel.json` handles SPA routing.

---

## Run locally

```bash
npm install
cp .env.example .env   # fill in your Supabase credentials
npm run dev
```

---

## How the encryption works

1. The room password is **never sent to the server** — it stays in your browser session storage
2. `SHA-256(password)` is used as a 32-byte symmetric key
3. Every message is encrypted with `nacl.secretbox` (XSalsa20-Poly1305) before being broadcast
4. Messages are sent via Supabase Realtime **broadcast channels** — they are never stored in the database
5. The receiving browser decrypts locally using the same derived key

This means: even if Supabase were compromised, an attacker would only see random-looking ciphertext.

---

## Limitations / Notes

- Max 2 users per room (configurable in DB)
- Messages are ephemeral — they disappear when you leave (no history stored)
- Room passwords are stored as plaintext in Supabase (fine for demo; hash them for production)
- Member count resets on page refresh due to browser nature — this is cosmetic only
