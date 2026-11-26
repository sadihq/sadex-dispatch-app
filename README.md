# SADEX Express Logistics — Dispatch App

Rider queue and CEO console for SADEX Express Logistics (Abuja). Orders live in a Notion database;
the browser never talks to Notion directly.

## Setup (Vercel)

Add these in **Vercel > Project > Settings > Environment Variables**, then redeploy:

| Name | What it is |
| --- | --- |
| `NOTION_API_KEY` | Notion integration secret. Never put it in code. |
| `NOTION_DATABASE_ID` | Orders database ID (defaults to the current one). |
| `RIDER_PIN` | 6-digit PIN riders use to log in. |
| `CEO_PIN` | 6-digit PIN for the CEO console. Different from the rider PIN. |
| `SESSION_SECRET` | Random 32+ character string that signs logins. Changing it logs everyone out. |
| `RIDER_PHONE` | Rider WhatsApp number for manifests, e.g. `2348031234567`. |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local development

Copy `.env.example` to `.env`, fill it in, then:

```bash
npm install
npm run dev
```

## Security model

- `/api/login` checks the PIN on the server and returns a signed session (rider 14h, CEO 8h).
  5 wrong tries locks that device's IP for 15 minutes (per server instance).
- `/api/notion` only allows: list orders (riders see active orders only), change an order's
  status, and create an order (CEO only). Orders must be Abuja addresses with a valid Nigerian phone.
- `/api/track`: riders send GPS; only the CEO can read it.
