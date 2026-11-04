// ============================================================
//  Site settings controlled by the admin (portal → Site settings)
//  Background videos accept: an uploaded file (/uploads/videos/…),
//  a YouTube or Vimeo link, or a direct link to an .mp4/.webm file.
// ============================================================
const db = require('../database/db');

const DEFAULTS = {
  hero_video: '',        // homepage background video (link or /uploads/…)
  page_video: '',        // optional video behind every page header
  hero_video_type: '',   // 'file' when a link was confirmed as a video by asking its server
  page_video_type: '',
  video_strength: '42',  // how visible the video is, 10–90 (%)
  announce_on: '0',
  announce_text: '',
  announce_link: '',
};

function all() {
  const rows = db.prepare(`SELECT key, value FROM site_settings`).all();
  return { ...DEFAULTS, ...Object.fromEntries(rows.filter((r) => r.key in DEFAULTS).map((r) => [r.key, r.value])) };
}

function save(values) {
  const up = db.prepare(`INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
  db.transaction(() => Object.entries(values).forEach(([k, v]) => { if (k in DEFAULTS) up.run(k, String(v)); }))();
}

// What kind of video a link is: { kind: 'file'|'youtube'|'vimeo', src, id } or null
function classifyVideo(link) {
  const s = String(link || '').trim();
  if (!s) return null;
  if (/^\/uploads\/videos\/[a-f0-9]{24}\.(mp4|webm)$/.test(s)) return { kind: 'file', src: s };
  let u;
  try { u = new URL(s); } catch { return undefined; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/) || [])[1] || '';
  if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'youtube', id };
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = (u.pathname.match(/(\d{5,12})/) || [])[1];
    if (v) return { kind: 'vimeo', id: v };
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { kind: 'file', src: u.href };
  return undefined; // a link, but not one we know how to play yet
}

// For unknown links, ask the other server whether it is actually a video
async function probeVideo(link) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    let res = await fetch(link, { method: 'HEAD', redirect: 'follow', signal: ctl.signal });
    if (!res.ok || !res.headers.get('content-type')) res = await fetch(link, { method: 'GET', headers: { Range: 'bytes=0-0' }, redirect: 'follow', signal: ctl.signal });
    clearTimeout(t);
    return /^video\//i.test(res.headers.get('content-type') || '') ? { kind: 'file', src: res.url || link } : null;
  } catch { return null; }
}

// Public view: only what the site needs to render
function publicView() {
  const s = all();
  const strength = Math.min(90, Math.max(10, Number(s.video_strength) || 42));
  const video = (link, type) => classifyVideo(link) || (type === 'file' && /^https?:\/\//.test(link) ? { kind: 'file', src: link } : null);
  return {
    hero_video: video(s.hero_video, s.hero_video_type),
    page_video: video(s.page_video, s.page_video_type),
    video_strength: strength,
    announce: s.announce_on === '1' && s.announce_text ? { text: s.announce_text, link: s.announce_link } : null,
  };
}

module.exports = { DEFAULTS, all, save, classifyVideo, probeVideo, publicView };
