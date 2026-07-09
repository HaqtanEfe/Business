// Vercel Serverless Function: GET /api/avatars?userIds=1,2,3
// Resolves Roblox user IDs to avatar-headshot CDN URLs (for named client reviews).
// Returns { "1": "https://…", "2": "https://…" }. Cached at the edge for 1h.

export default async function handler(req, res) {
  try {
    const raw = (req.query && req.query.userIds) || parseQuery(req.url).userIds || '';
    const ids = String(raw).split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s)).slice(0, 50);
    if (!ids.length) return res.status(200).json({});

    const r = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.join(',')}&size=150x150&format=Png&isCircular=false`
    );
    if (!r.ok) throw new Error(`thumbnails api ${r.status}`);
    const j = await r.json();

    const map = {};
    (j.data || []).forEach(d => {
      if (d.state === 'Completed' && d.imageUrl) map[d.targetId] = d.imageUrl;
    });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(map);
  } catch (err) {
    console.error('avatars handler error', err);
    res.status(200).json({}); // soft-fail: reviews fall back to initials
  }
}

function parseQuery(url) {
  const q = {};
  const i = (url || '').indexOf('?');
  if (i === -1) return q;
  url.slice(i + 1).split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) q[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return q;
}
