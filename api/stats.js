// Vercel Serverless Function: GET /api/stats
// Reads projects.json from the repo root, resolves each placeId to a universeId,
// then fetches live Roblox game data and returns aggregated stats.
//
// Cached at the edge for 60s. Re-deploys (or after cache expiry) pull fresh numbers.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export default async function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'projects.json');
    const raw  = await fs.readFile(file, 'utf-8');
    const cfg  = JSON.parse(raw);

    const results = await Promise.all(
      (cfg.projects || []).map(p => fetchProject(p).catch(e => {
        console.error('project failed', p.placeId, e.message);
        return fromFallback(p);
      }))
    );

    const projects = results.filter(Boolean);
    const total = projects.reduce(
      (acc, p) => ({
        visits:  acc.visits  + (p.visits  || 0),
        playing: acc.playing + (p.playing || 0),
      }),
      { visits: 0, playing: 0 }
    );

    const avatar = await fetchAvatar(cfg.userId || 2530954279).catch(() => null);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ projects, total, avatar, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('stats handler error', err);
    res.status(500).json({ error: 'Failed to load stats', detail: err.message });
  }
}

async function fetchProject(p) {
  const universeId = await placeToUniverse(p.placeId);
  if (!universeId) return fromFallback(p);

  const [gamesRes, images] = await Promise.all([
    fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`),
    fetchThumbnails(universeId).catch(() => []),
  ]);
  if (!gamesRes.ok) throw new Error(`games api ${gamesRes.status}`);
  const json = await gamesRes.json();
  const game = json.data && json.data[0];
  if (!game) return fromFallback(p);

  const linkPlaceId = game.rootPlaceId || p.placeId;
  return {
    placeId:     p.placeId,
    universeId,
    role:        p.role,
    description: p.description,
    name:        game.name,
    visits:      game.visits,
    playing:     game.playing,
    url:         `https://www.roblox.com/games/${linkPlaceId}`,
    images,                    // all carousel thumbnails (for the slideshow)
    thumbnail:   images[0] || null,
  };
}

// All of a game's carousel thumbnails (16:9), as CDN image URLs.
async function fetchThumbnails(universeId) {
  const r = await fetch(
    `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=10&size=768x432&format=Png`
  );
  if (!r.ok) return [];
  const j = await r.json();
  const thumbs = (j && j.data && j.data[0] && j.data[0].thumbnails) || [];
  return thumbs.filter(t => t.state === 'Completed' && t.imageUrl).map(t => t.imageUrl);
}

// Resolve HaqtanEfe's Roblox avatar headshot to a CDN image URL.
async function fetchAvatar(userId) {
  const r = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
  );
  if (!r.ok) return null;
  const j = await r.json();
  const first = j && j.data && j.data[0];
  return first && first.state === 'Completed' ? first.imageUrl : null;
}

// When live data isn't available for a project, fall back to the static
// snapshot in projects.json. Returns null if no snapshot was provided.
function fromFallback(p) {
  if (!p.fallback) return null;
  return {
    placeId:     p.placeId,
    role:        p.role,
    description: p.description,
    name:        p.fallback.name,
    visits:      p.fallback.visits,
    playing:     p.fallback.playing,
    url:         `https://www.roblox.com/games/${p.placeId}`,
    images:      [],
    thumbnail:   null,
  };
}

async function placeToUniverse(placeId) {
  const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  if (!r.ok) throw new Error(`universe api ${r.status}`);
  const j = await r.json();
  return j.universeId;
}
