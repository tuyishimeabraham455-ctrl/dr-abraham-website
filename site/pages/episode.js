// ============================================================
//  EPISODE PAGE — summary, takeaways, guest bio, player,
//  transcript, share buttons, related talk and resource
// ============================================================
const fs = require('fs');
const nodePath = require('path');
const { show, episodes } = require('../content/podcast');
const PREVIEWS = require('../content/podcast-previews.json');
const { talks } = require('../content/talks');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, sampleTag } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const RESOURCES = {
  workbook: ['Free workbook: Is your idea a real problem?', 'learn/workbook/'],
  'funding-checklist': ['Free checklist: Funding-ready in 30 days', 'learn/funding-checklist/'],
};

module.exports = (slug) => {
  const e = episodes.find((x) => x.slug === slug);
  const depth = 2, r = rel(depth), path = `podcast/${e.slug}/`;
  const bc = crumbs([['Podcast & Show', 'podcast/'], [`Episode ${e.n}`, path]], depth);
  const talk = talks.find((t) => t.slug === e.talk);
  const [resTitle, resPath] = RESOURCES[e.resource] || RESOURCES.workbook;
  const prev = episodes.find((x) => x.n === e.n - 1), next = episodes.find((x) => x.n === e.n + 1);
  // A sample preview (computer-read summary over original music) plays until the real episode audio exists
  const preview = !e.audio && PREVIEWS[e.slug] && fs.existsSync(nodePath.join(__dirname, '..', 'assets', PREVIEWS[e.slug].audio.replace(/^assets\//, ''))) ? PREVIEWS[e.slug] : null;
  const audioFile = e.audio || (preview && preview.audio);
  const audioSrc = audioFile ? (/^https?:/.test(audioFile) ? audioFile : r + audioFile) : '';
  const url = abs(path);

  const body = `
${pageHero({ mark: String(e.n).padStart(2, '0'), eyebrow: `Episode ${e.n} · ${esc(e.topic)} · ${e.minutes} min`, title: esc(e.title), lead: esc(e.summary), crumbsHtml: bc.html, tone: 'oxblood',
    extra: `<p class="reveal">${sampleTag(e) ? '<span class="status-pill">Preview · in production</span>' : ''}</p>` })}

<section class="sec" aria-label="Episode">
  <div class="wrap talk-detail">
    <div class="prose">
      <div class="player reveal">
        <div class="player-box" data-episode="${esc(e.slug)}">${audioSrc ? `<audio controls preload="metadata" src="${esc(audioSrc)}">Your browser does not support audio playback.</audio>${preview ? '<p class="player-note">Sample preview: a short summary read by a computer voice, with original music. The full episode with Yo is coming soon.</p>' : ''}` : `<div class="player-soon">${icon('mic')}<span><b>Audio coming at launch</b><small>Join the list to hear it first.</small></span><a class="btn btn-dark btn-sm" href="${r}podcast/#launch">Notify me</a></div>`}</div>
      </div>
      <h2 class="h3 reveal">Key takeaways</h2>
      <ol class="outcomes reveal">${e.takeaways.map((k) => `<li>${esc(k)}</li>`).join('')}</ol>
      <h2 class="h3 reveal">About the guest</h2>
      <p class="reveal">${esc(e.guestBio)}</p>
      <h2 class="h3 reveal">Transcript</h2>
      ${e.transcript && e.transcript.length ? `<details class="transcript reveal"><summary>Read the full transcript</summary>${e.transcript.map((p) => `<p>${esc(p)}</p>`).join('')}</details>` : `${preview ? `<details class="transcript reveal"><summary>Read the preview transcript</summary><p>${esc(preview.text)}</p></details>` : ''}<p class="reveal">The full transcript is published with the episode.</p>`}
    </div>
    <aside class="talk-facts reveal" aria-label="Episode details">
      <dl>
        <div><dt>Guest</dt><dd>${esc(e.guest)}</dd></div>
        <div><dt>Topic</dt><dd>${esc(e.topic)}</dd></div>
        <div><dt>Length</dt><dd>About ${e.minutes} minutes</dd></div>
      </dl>
      <p class="eyebrow eyebrow-gold" style="margin:.6rem 0 .4rem">Share</p>
      <div class="share">
        <button type="button" class="chip-dark js-share-copy" data-url="${esc(url)}">${icon('link')} Copy link</button>
        <a class="chip-dark" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">LinkedIn</a>
        <a class="chip-dark" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
        <a class="chip-dark" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(e.title)}">X</a>
        <a class="chip-dark" href="mailto:?subject=${encodeURIComponent(e.title)}&body=${encodeURIComponent(url)}">Email</a>
      </div>
      <span class="form-msg share-msg" aria-live="polite"></span>
    </aside>
  </div>
</section>

<section class="sec blush" aria-labelledby="relTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Keep going</p><h2 class="h2 reveal" id="relTitle">Related <em>talk &amp; resource.</em></h2></div>
    <div class="related">
      ${talk ? `<a class="shortcut reveal" href="${r}speaking/${talk.slug}/"><span class="asset-ic">${icon('mic')}</span><b>${esc(talk.title)}</b><small>The keynote on this topic</small><span class="sc-go">${icon('arrow')}</span></a>` : ''}
      <a class="shortcut reveal" style="--d:80ms" href="${r}${resPath}"><span class="asset-ic">${icon('down')}</span><b>${esc(resTitle)}</b><small>Free with your email</small><span class="sc-go">${icon('arrow')}</span></a>
      <a class="shortcut reveal" style="--d:160ms" href="${r}podcast/be-a-guest/"><span class="asset-ic">${icon('users')}</span><b>Be a guest</b><small>Have a story for this show?</small><span class="sc-go">${icon('arrow')}</span></a>
    </div>
    <nav class="ep-pager reveal" aria-label="More episodes">
      ${prev ? `<a href="${r}podcast/${prev.slug}/">← Episode ${prev.n}: ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a href="${r}podcast/${next.slug}/">Episode ${next.n}: ${esc(next.title)} →</a>` : '<span></span>'}
    </nav>
  </div>
</section>

${ctaBand(r, { title: 'Bring this conversation <em>to your stage.</em>', primary: ['Book Yo', talk ? `book/?talk=${talk.slug}` : 'book/'] })}
`;

  // Schema only describes what is visible: audio/transcript only when they exist
  const ep = { '@type': 'PodcastEpisode', '@id': abs(path + '#episode'), name: e.title, description: e.summary, episodeNumber: e.n, url, partOfSeries: { '@id': abs('podcast/#series') }, author: { '@id': ids.person } };
  if (e.published) ep.datePublished = e.published;
  if (audioSrc) ep.associatedMedia = { '@type': 'MediaObject', contentUrl: /^https?:/.test(e.audio) ? e.audio : abs(e.audio) };
  if (e.transcript && e.transcript.length) ep.transcript = e.transcript.join('\n\n');

  return page({
    path, depth, active: 'podcast/',
    title: `Ep. ${e.n}: ${e.title}`.slice(0, 60),
    description: e.summary.slice(0, 155),
    body, scripts: ['assets/js/podcast.js', 'assets/js/media.js'],
    schema: [{ '@type': 'PodcastSeries', '@id': abs('podcast/#series'), name: show.name, url: abs('podcast/') }, ep, bc.schema],
  });
};
