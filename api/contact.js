// Vercel Serverless Function: POST /api/contact
// Receives a project inquiry from the contact form and forwards it to Discord
// via a webhook. The webhook URL lives ONLY in the DISCORD_WEBHOOK_URL env var —
// it is never sent to the browser (unlike the raw mockup, which posted directly).

// Very light in-memory rate limit. Resets on cold start; enough to blunt spam
// bursts for a low-traffic portfolio. (For hard limits, move to Vercel KV.)
const HITS = new Map(); // ip -> [timestamps]
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

function clip(v, n) {
  const s = String(v == null ? "" : v).trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.error("DISCORD_WEBHOOK_URL is not configured");
    return res.status(500).json({ error: "Contact form isn't configured yet. DM me @HaqtanEfe instead." });
  }

  // Vercel usually parses JSON bodies; fall back to manual parse just in case.
  let body = req.body;
  if (!body || typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch (_) { body = {}; }
  }

  // Honeypot: real users never fill this hidden field. Pretend success, drop it.
  if (body.website) return res.status(200).json({ ok: true });

  const name = clip(body.name, 100);
  const message = clip(body.message, 1500);
  if (!name || !message) {
    return res.status(400).json({ error: "Please include your name and project details." });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many messages, try again in a bit or DM me @HaqtanEfe." });
  }

  const discord = clip(body.discord, 100) || "-";
  const ptype = clip(body.ptype, 100) || "-";
  const budget = clip(body.budget, 100) || "-";

  const payload = {
    username: "Portfolio · Inquiry",
    embeds: [{
      title: "New project inquiry",
      color: 12886271, // #C4A6FF
      fields: [
        { name: "From", value: name, inline: true },
        { name: "Discord", value: discord, inline: true },
        { name: "Type", value: ptype, inline: true },
        { name: "Budget", value: budget, inline: true },
        { name: "Details", value: message }
      ],
      footer: { text: "business.haktanefe.com" },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      console.error("discord webhook failed", r.status, await r.text().catch(() => ""));
      return res.status(502).json({ error: "Couldn't reach Discord. DM me @HaqtanEfe instead." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact handler error", err);
    return res.status(500).json({ error: "Something went wrong. DM me @HaqtanEfe instead." });
  }
}
