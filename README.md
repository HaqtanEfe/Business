# haqtanefe.dev

HaqtanEfe's Roblox developer portfolio / for-hire page (served at the `haqtanefe.dev`
apex; the old `business.haktanefe.com` 301-redirects here). Static HTML/CSS/JS with
two Vercel serverless functions. Ported from a Claude Design mockup.

## Structure

| File | What it is |
|------|-----------|
| `index.html` | The page — all sections, with inline styles matching the design 1:1. |
| `styles.css` | Global tokens, keyframes, responsive rules. Accent is a CSS variable. |
| `content.js` | **All editable copy/data** (projects, reviews, skills, tiers, FAQs, snippets, chats…). Edit here, not the markup. |
| `config.json` | Birthdate (age auto-computes), fallback visits, IDs. |
| `app.js` | Vanilla controller: terminal cycler, live visits, accent switcher, accordion, form, easter eggs. |
| `api/stats.js` | `GET /api/stats` — real Roblox visits + thumbnails + avatar (from `projects.json`). |
| `api/contact.js` | `POST /api/contact` — forwards the inquiry to Discord (webhook is server-side only). |
| `projects.json` | The games featured in "Selected work" (placeIds + fallbacks). |

## Editing common things

- **Age** — set `birthDate` in `config.json` once. It computes automatically; nothing else to touch.
- **Featured games** — edit `projects.json` (placeId + fallback name/visits). Live data overrides fallbacks.
- **Reviews / copy / pricing / FAQ** — edit `content.js`.
- **Accent colors** — edit `swatches` in `content.js` (the nav picker persists the choice per visitor).

## Local dev

```bash
# Static preview only (visits/avatar fall back, form + live data need the API):
npx serve Business

# Full stack incl. /api routes (needs Vercel CLI + .env.local):
cp Business/.env.example Business/.env.local   # then fill DISCORD_WEBHOOK_URL
vercel dev
```

## Deploy (Vercel)

1. Push to the `business.haktanefe.com` GitHub repo (Vercel auto-deploys).
2. In the Vercel project → Settings → Environment Variables, set `DISCORD_WEBHOOK_URL`.
3. The `haqtanefe.dev` domain is attached to the project (apex); `business.haktanefe.com`
   is kept on the project as a permanent redirect to it.

## Env vars

See `.env.example`. Only `DISCORD_WEBHOOK_URL` is required (for the contact form).
It must **never** be committed or exposed to the browser.
