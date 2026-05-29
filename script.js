// Fetches live project stats from /api/stats and renders them.
// If the API is unreachable (e.g. previewing the static file directly),
// falls back to projects.json with placeholder numbers so the layout still works.

(async function () {
  const panel       = document.getElementById('stats-panel');
  const totalVisits = document.getElementById('total-visits');
  const totalPlay   = document.getElementById('total-playing');
  const projGrid    = document.getElementById('projects-grid');
  const projCount   = document.getElementById('projects-count');

  let data;
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('api ' + res.status);
    data = await res.json();
  } catch (err) {
    console.warn('Live stats unavailable, using fallback:', err.message);
    data = await fallbackData();
  }

  render(data);

  function render(data) {
    panel.classList.remove('stats-loading');
    totalVisits.textContent = fmt(data.total.visits);
    totalPlay.textContent   = fmt(data.total.playing);
    projCount.textContent   = `${data.projects.length} projects`;

    projGrid.innerHTML = '';
    if (!data.projects.length) {
      projGrid.innerHTML = '<div class="placeholder-card">No projects yet.</div>';
      return;
    }
    const maxVisits = Math.max(...data.projects.map(p => p.visits || 1));
    data.projects
      .slice()
      .sort((a, b) => (b.visits || 0) - (a.visits || 0))
      .forEach(p => projGrid.appendChild(card(p, maxVisits)));
  }

  function card(p, maxVisits) {
    const a = document.createElement('a');
    a.className = 'project-card';
    a.href = `https://www.roblox.com/games/${p.placeId}`;
    a.target = '_blank';
    a.rel = 'noopener';

    const visits  = p.visits  != null ? fmt(p.visits)  : '—';
    const playing = p.playing != null ? fmt(p.playing) : '—';
    const widthPct = p.visits ? (p.visits / maxVisits * 100).toFixed(1) : 0;

    a.innerHTML = `
      <div class="project-row">
        <div>
          <div class="project-name">${esc(p.name || 'Unknown game')}</div>
          <div class="project-role">${esc(p.role || '')}</div>
        </div>
        <div class="project-metrics">
          <span class="m"><strong>${visits}</strong>visits</span>
          <span class="m playing"><strong>${playing}</strong>playing</span>
        </div>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${widthPct}%"></div></div>
    `;
    return a;
  }

  function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function fallbackData() {
    // Used when /api/stats is unavailable (local file preview).
    // Reads projects.json so the cards still render, with no numbers.
    try {
      const res = await fetch('projects.json');
      const json = await res.json();
      return {
        total: { visits: null, playing: null },
        projects: (json.projects || []).map(p => ({
          placeId: p.placeId,
          role: p.role,
          name: 'Project ' + p.placeId,
          visits: null,
          playing: null
        }))
      };
    } catch {
      return { total: { visits: null, playing: null }, projects: [] };
    }
  }
})();
