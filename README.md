# Withdraw Console + Telegram Live Feed

Two systems in this repo, sharing one MongoDB database:

1. **Next.js app** (`/src`) — user dashboard with mock balance, withdraw
   requests, and an admin review panel. Also hosts the `/telegram` page that
   displays the live message feed.
2. **Telegram bot service** (`/telegram-bot`) — a standalone Node process
   that joins Telegram groups, reads every message (privacy mode disabled),
   saves them to MongoDB, and pushes them out over Socket.IO in real time.

These are two separate running processes. The Next.js app does **not** run
the bot internally — Next's API routes aren't built for an always-on
long-polling connection, so the bot needs its own process.

## 1. Withdraw dashboard + admin panel

### Setup

```bash
cp .env.local.example .env.local
# edit .env.local: set MONGODB_URI and a real JWT_SECRET
npm install
npm run dev
```

Visit `http://localhost:3000`.

- Register an account at `/register` — every new user is seeded with a mock
  balance of 100000 USDT (see `src/models/User.js` if you want to change the
  default).
- Submit a withdraw request from `/dashboard`.
- To review requests, you need an admin account. Promote any existing user:

```bash
node scripts/make-admin.js you@example.com
```

Then log in as that user and visit `/admin` to approve or reject requests.
Approving deducts the amount from that user's mock balance; nothing touches
a real wallet or blockchain — it's all in MongoDB.

### How auth works

Standard JWT-in-an-httpOnly-cookie pattern (cookie name `token`, payload
`{ id: userId }`, secret from `process.env.JWT_SECRET`) — matches the
convention used in other projects, so it should feel familiar.

## 2. Telegram bot + live feed

### One-time Telegram setup (you'll do this in the Telegram app / BotFather)

1. Create a bot via [@BotFather](https://t.me/BotFather) and grab the token.
2. **Disable privacy mode**: message BotFather → `/setprivacy` → choose your
   bot → `Disable`. Without this, the bot only sees messages that mention it.
3. Add the bot to your group(s) **as an admin** (you mentioned you'll handle
   this part).

### Running the service

```bash
cd telegram-bot
cp .env.example .env
# edit .env: set MONGODB_URI (same DB as the Next.js app) and TELEGRAM_BOT_TOKEN
npm install
npm start
```

This starts two things in one process:
- The Telegram bot (long polling) — saves every message it sees to the
  `telegrammessages` collection.
- A Socket.IO server on `BOT_SOCKET_PORT` (default `4001`) — emits a
  `telegram:message` event for every new message.

### Viewing the feed

With both the Next.js app and the bot service running, log in and visit
`/telegram`. It loads the last 100 messages from MongoDB on page load, then
stays connected via Socket.IO for new ones as they arrive — no refresh
needed.

`NEXT_PUBLIC_SOCKET_URL` in `.env.local` tells the frontend where to find the
bot's socket server. If you deploy the bot service somewhere other than
`localhost:4001`, update both that variable and `SOCKET_ALLOWED_ORIGINS` in
the bot's `.env` to match your actual app URL.

## Notes on scope

- Balances are mock numbers in MongoDB — there's no real USDT, wallet, or
  blockchain integration here, by design (per what we discussed).
- The two processes are independent; you can run, deploy, or restart the bot
  service without touching the Next.js app, and vice versa.
- If you deploy the Next.js app to something like Vercel, the bot service
  still needs to run somewhere that supports long-running processes (a small
  VPS, Railway, Render, etc.) — serverless platforms aren't a fit for a
  bot that needs to stay connected via long polling.



  ## final running steps
  1. Run the ocr project to Read images We are us api
  2. run the backend - npm start (if you found another process is running then run ):
  netstat -ano | findstr :4001
  taskkill /PID <pid_from_listening_line> /F
  3. npm run dev
  

