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
        return null;
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

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ projects, total, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('stats handler error', err);
    res.status(500).json({ error: 'Failed to load stats', detail: err.message });
  }
}

async function fetchProject(p) {
  const universeId = await placeToUniverse(p.placeId);
  if (!universeId) return null;

  const r = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  if (!r.ok) throw new Error(`games api ${r.status}`);
  const json = await r.json();
  const game = json.data && json.data[0];
  if (!game) return null;

  return {
    placeId:  p.placeId,
    role:     p.role,
    name:     game.name,
    visits:   game.visits,
    playing:  game.playing,
  };
}

async function placeToUniverse(placeId) {
  const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  if (!r.ok) throw new Error(`universe api ${r.status}`);
  const j = await r.json();
  return j.universeId;
}
