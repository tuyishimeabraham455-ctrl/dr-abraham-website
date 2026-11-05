// ============================================================
//  Agent Yo — local brain (no AI service, no API key, no cost)
//  Learns from Yo's own content and the answers the admin teaches
//  in the portal (Admin · Train Agent Yo):
//    1. Taught answers (agent_training)      — highest priority
//    2. FAQs published on the site (FAQPage data in docs/)
//    3. Built-in skills: fees, booking, talks, programs, podcast …
//    4. Search over every page of the site (search-index.json)
//  Unknown questions are logged as content gaps for the admin.
//  Replies: { reply, chips: [{ label, href } | { label, mode } | { label, say }], source }
// ============================================================
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const site = require('../site/content/site');
const { framework, talks, workshops } = require('../site/content/talks');
const { programs, resources } = require('../site/content/learn');
const { episodes } = require('../site/content/podcast');
const { posts } = require('../site/content/posts');
const postIntro = (slug) => { const p = posts.find((x) => x.slug === slug); const first = p && p.body.find((b) => b[0] === 'p'); return first ? first[1] : ''; };

const DOCS = path.join(__dirname, '..', 'docs');

// ---------- Text tools ----------
const STOP = new Set('a an the and or but if of to in on at for from by with about as is are was were be been being am i me my we our you your yo yos her she he his they them their it its this that these those do does did can could would should will shall may might must have has had what which who whom how when where why there here please hi hey hello just so very really also any some more most much many lot lots get got want wanna need like know tell give let into out up down over than then too not no yes ok okay'.split(' '));
const SYN = { price: 'fee', prices: 'fee', pricing: 'fee', cost: 'fee', costs: 'fee', charge: 'fee', rate: 'fee', rates: 'fee', budget: 'fee', honorarium: 'fee', hire: 'book', booking: 'book', booked: 'book', schedule: 'book', invite: 'book', speaker: 'speak', speaking: 'speak', keynote: 'talk', keynotes: 'talk', talks: 'talk', presentation: 'talk', session: 'talk', conference: 'event', summit: 'event', gathering: 'event', church: 'ministry', faith: 'ministry', nonprofits: 'nonprofit', company: 'corporate', employees: 'corporate', staff: 'corporate', loan: 'fund', loans: 'fund', funding: 'fund', capital: 'fund', lender: 'fund', credit: 'credit', money: 'finance', financial: 'finance', finances: 'finance', course: 'program', courses: 'program', class: 'program', classes: 'program', training: 'program', coaching: 'program', podcast: 'podcast', episode: 'podcast', episodes: 'podcast', show: 'podcast', video: 'watch', videos: 'watch', book: 'book', books: 'reading', reading: 'reading', read: 'reading', email: 'contact', phone: 'contact', reach: 'contact', virtual: 'virtual', online: 'virtual', zoom: 'virtual', remote: 'virtual', wellness: 'wellness', stress: 'wellness', burnout: 'wellness' };
const stem = (w) => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, (m) => (w.length > 4 ? '' : m));
const tokens = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((w) => w && !STOP.has(w)).map((w) => SYN[w] || stem(w)).filter((w) => w.length > 1);
const sentences = (text) => String(text || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"“])/).map((s) => s.trim()).filter((s) => s.length > 25 && s.length < 400);
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// ---------- BM25 index ----------
function makeIndex(docs) {
  const toks = docs.map((d) => tokens(d.text));
  const df = new Map(); toks.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
  const avg = toks.reduce((a, t) => a + t.length, 0) / Math.max(1, toks.length);
  const N = docs.length;
  const idf = (w) => Math.log(1 + (N - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));
  return {
    search(query, k = 5) {
      const q = [...new Set(tokens(query))]; if (!q.length) return [];
      return toks.map((t, i) => {
        let s = 0; const len = t.length || 1;
        for (const w of q) { const f = t.filter((x) => x === w).length; if (f) s += idf(w) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * len / avg)); }
        // reward covering more of the question
        const covered = q.filter((w) => t.includes(w)).length / q.length;
        return { doc: docs[i], score: s * (0.5 + covered), covered };
      }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
    },
  };
}

// ---------- Knowledge ----------
let K = null;
function faqsFromSite() {
  const out = [];
  const walk = (dir) => { if (!fs.existsSync(dir)) return; for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (f.name === 'index.html') read(p); } };
  const read = (file) => {
    const html = fs.readFileSync(file, 'utf8');
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/); if (!m) return;
    let graph; try { graph = JSON.parse(m[1])['@graph'] || []; } catch { return; }
    const url = '/' + path.relative(DOCS, path.dirname(file)).split(path.sep).join('/') + '/';
    graph.filter((g) => g['@type'] === 'FAQPage').forEach((g) => (g.mainEntity || []).forEach((q) => out.push({ q: q.name, a: q.acceptedAnswer?.text || '', url: url === '//' ? '/' : url })));
  };
  walk(DOCS);
  const seen = new Set();
  return out.filter((f) => f.q && f.a && !seen.has(f.q) && seen.add(f.q));
}
function passagesFromSite() {
  const out = [];
  const idxFile = path.join(DOCS, 'search-index.json');
  if (fs.existsSync(idxFile)) {
    for (const p of JSON.parse(fs.readFileSync(idxFile, 'utf8'))) {
      if (/^(privacy|terms|ai-disclosure|accessibility|disclaimer|search|offline)\//.test(p.url)) continue;
      const url = '/' + p.url;
      out.push({ text: `${p.title}. ${p.description}`, title: p.title, url, kind: 'page' });
      sentences(decode(p.text)).filter((x) => /^[A-Z"“]/.test(x) && !/^(Related |Home )/.test(x)).forEach((x) => out.push({ text: x, title: p.title, url, kind: 'sentence' }));
    }
  }
  talks.forEach((t) => out.push({ text: `${t.title}: ${t.subtitle}. ${t.abstract} Best for ${t.who}. Takeaways: ${t.takeaways.join('; ')}.`, title: t.title, url: `/speaking/${t.slug}/`, kind: 'talk' }));
  posts.forEach((p) => p.body.filter((b) => b[0] === 'p').forEach((b) => out.push({ text: b[1], title: p.title, url: `/blog/${p.slug}/`, kind: 'article' })));
  programs.forEach((p) => out.push({ text: `${p.title}: ${p.tagline}. For ${p.who}. ${p.format}, ${p.length}. Outcomes: ${p.outcomes.join('; ')}.`, title: p.title, url: `/learn/${p.slug}/`, kind: 'program' }));
  return out;
}
function load() {
  const faqs = faqsFromSite();
  K = {
    faqs, faqIndex: makeIndex(faqs.map((f) => ({ ...f, text: f.q }))),
    passages: makeIndex(passagesFromSite()),
    trained: [], trainedDocs: [],
  };
  refreshTraining();
  return K;
}
function refreshTraining() {
  if (!K) return load();
  const rows = db.prepare(`SELECT * FROM agent_training ORDER BY id`).all();
  const docs = rows.flatMap((r) => r.questions.split('\n').map((q) => q.trim()).filter(Boolean).map((q) => ({ id: r.id, q, text: q, row: r })));
  K.trained = rows; K.trainedDocs = docs.map((d) => ({ ...d, set: new Set(tokens(d.q)) }));
}

// ---------- Built-in skills ----------
const ADVICE_RX = /\b(tax|taxes|lawsuit|sue|legal advice|invest|investment|stock|crypto|bankrupt|depress|anxiety|therapy|diagnos|medication)\b/i;
const B = { book: { label: 'Book Yo to speak', href: '/book/' }, plan: { label: 'Help me plan my event', mode: 'planner' }, test: { label: 'Test my business idea', mode: 'builder' }, contact: { label: 'Talk to a person', href: '/contact/' }, talks: { label: 'See all talks', href: '/speaking/' } };
const fmtList = (items) => items.map((x) => `• ${x}`).join('\n');
const SKILLS = [
  { name: 'press', test: /\b(press|media kit|journalist|one[- ]sheet|headshots?|bio for|speaker bio|emcee|introduction for)\b/i,
    run: () => ({ reply: 'Everything for press and event hosts is in the press kit: short and long bios, headshots, the one-sheet and an emcee introduction.', chips: [{ label: 'Open the press kit', href: '/press/' }, { label: 'Speaker one-sheet', href: '/press/one-sheet/' }] }) },
  { name: 'length', test: /\b(how long|length|minutes|duration|how many minutes)\b/i,
    run: () => ({ reply: `Talk lengths:\n${fmtList(talks.map((t) => `${t.title}: ${t.length}`))}\n\nEach one can be shaped to fit your agenda, including a keynote plus workshop.`, chips: [B.plan, B.talks] }) },
  { name: 'ministry', test: /\b(church|churches|ministry|ministries|faith|congregation|nonprofit|non-profit|nonprofits|community organi[sz]ation)\b/i,
    run: () => ({ reply: "Yes. Yo speaks for churches, ministries and nonprofits as well as companies and conferences. Each One, Reach One is a favourite for faith and community audiences, and Yo's team can shape any talk to your mission.", chips: [{ label: 'Each One, Reach One', href: '/speaking/each-one-reach-one/' }, { label: 'Corporate & nonprofit', href: '/speaking/corporate-nonprofit/' }, B.plan] }) },
  { name: 'social', test: /\b(social capital|each one,? reach one|networking|network|relationships|mentor|connections)\b/i,
    run: () => ({ reply: postIntro('social-capital-is-a-business-asset'), chips: [{ label: 'Read: social capital', href: '/blog/social-capital-is-a-business-asset/' }, { label: 'Each One, Reach One talk', href: '/speaking/each-one-reach-one/' }] }) },
  { name: 'credit', test: /\b(business credit|credit score|credit file|build credit|loan|loans|lender|lenders|funding|fund my|(working|raise|raising|access to|business|growth) capital|ein|business bank account)\b/i,
    run: () => ({ reply: postIntro('business-credit-basics-before-you-apply') + '\n\n' + NOTE, chips: [{ label: 'Read: 7 steps before you apply', href: '/blog/business-credit-basics-before-you-apply/' }, { label: 'Free funding checklist', href: '/learn/funding-checklist/' }, { label: 'Funding-Ready Intensive', href: '/learn/funding-ready-intensive/' }] }) },
  { name: 'idea', test: /\b(business idea|my idea|idea (is )?(good|real|any good|work)|real problem|validate|test (my|an) idea|will people pay)\b/i,
    run: () => ({ reply: postIntro('is-your-business-idea-a-real-problem') + '\n\nWant to test yours now? Three quick questions.', chips: [B.test, { label: 'Free workbook', href: '/learn/workbook/' }, { label: 'Read the article', href: '/blog/is-your-business-idea-a-real-problem/' }] }) },
  { name: 'advice', test: ADVICE_RX,
    run: () => ({ reply: "That's one for a licensed professional, so I won't give personal tax, legal, investment or health advice. Yo shares general education, and her free resources can help you prepare good questions for your CPA, attorney or counselor.", chips: [{ label: 'Free resources', href: '/learn/' }, { label: 'Why we say this', href: '/disclaimer/' }] }) },
  { name: 'fees', test: /\b(fee|fees|price|pricing|cost|costs|how much|rate|rates|charge|budget|honorarium|afford)\b/i,
    run: (t) => {
      const pg = programs.find((p) => t.toLowerCase().includes(p.title.toLowerCase()));
      if (pg || /\b(program|programs|course|courses|class|classes|academy|lab|intensive|coaching|cohort)\b/i.test(t)) {
        return { reply: `Pricing for ${pg ? pg.title : "Yo's programs"} is shared when enrollment opens. Join the waitlist on the program page and you'll hear first, with no obligation.`, chips: (pg ? [pg] : programs).map((p) => ({ label: p.title, href: `/learn/${p.slug}/` })) };
      }
      return { reply: "Fees depend on the event type, length, location and audience, so I won't guess a number. Yo's team shares a clear quote after a short conversation, usually within one business day.", chips: [B.book, B.plan, { label: 'Corporate & nonprofit packages', href: '/speaking/corporate-nonprofit/' }] };
    } },
  { name: 'greeting', test: /^\s*(hi|hey|hello|good (morning|afternoon|evening)|hiya|greetings|yo)\b[\s!.,]*$/i,
    run: () => ({ reply: `Hi! I'm Agent Yo, ${site.person.name}'s AI assistant. I can help you find the right talk for your event, test a business idea, or point you to the podcast, programs and free resources. What brings you here?`, chips: [B.plan, B.test, { label: 'Guest, sponsor or press', mode: 'partner' }] }) },
  { name: 'thanks', test: /^\s*(thanks|thank you|thx|great|perfect|awesome|ok thanks)\b/i,
    run: () => ({ reply: 'You\'re welcome! Anything else I can help you with?', chips: [B.book, { label: 'Free resources', href: '/learn/' }] }) },
  { name: 'human', test: /\b(talk to (a )?(human|person|someone)|speak (to|with) (a )?(human|person|someone)|call me|phone number|email address|contact (yo|the team|you)|how (do|can) i (contact|reach))\b/i,
    run: () => ({ reply: `Of course. You can reach Yo's team at ${site.email.hello}, or send a message through the contact page and they'll reply within one business day.`, chips: [B.contact, B.book] }) },
  { name: 'ai', test: /\b(are you (a )?(bot|ai|robot|real|human|yolanda)|who are you|what are you|is this (a )?(bot|ai|real|human|robot|real person)|am i (talking|chatting) (to|with))\b/i,
    run: () => ({ reply: `I'm Agent Yo, an AI assistant for ${site.person.name}. I'm not Yolanda herself. I answer from her own material and can connect you with her team whenever you like.`, chips: [{ label: 'How I work', href: '/ai-disclosure/' }, B.contact] }) },
  { name: 'about', test: /\b(who is (yo|yolanda|she)|who'?s (yo|yolanda)|about (yo|yolanda|her)|(yo|yolanda)'?s? (story|background)|tell me about (yo|yolanda|her)|her (story|background|experience))\b/i,
    run: () => ({ reply: `${site.person.oneLine}\n\nShe has ${site.facts.yearsEntrepreneur} years as an entrepreneur, ran Christian Family Preschool in Oakland for ${site.facts.yearsPreschool} years, and spent ${site.facts.yearsHope} years at Operation HOPE. She's based in ${site.person.location}.`, chips: [{ label: 'Read her story', href: '/about/' }, B.talks] }) },
  { name: 'location', test: /\b(where (is|are) (she|yo|you) based|location|travel|in person|come to|bay area|antioch|virtual|online|zoom|remote)\b/i,
    run: () => ({ reply: `Yo is based in ${site.person.location} and speaks in person across the ${site.person.area.replace(/ and virtual$/, '')} and beyond, or virtually anywhere.`, chips: [B.book, B.plan] }) },
  { name: 'talks', test: /\b(which talk|what talks|talk topics|topics|signature (talk|keynote)|keynote options|what (does|can) (she|yo) speak|recommend a talk)\b/i,
    run: () => ({ reply: `Yo's signature talks:\n${fmtList(talks.map((t) => `${t.title}: ${t.subtitle} (${t.length})`))}\n\nTell me about your event and I'll recommend the best fit.`, chips: [B.plan, ...talks.map((t) => ({ label: t.title, href: `/speaking/${t.slug}/` }))] }) },
  { name: 'workshops', test: /\b(workshop|workshops|training for (my|our) team|half[- ]day|hands[- ]on)\b/i,
    run: () => ({ reply: `Yo leads interactive workshops:\n${fmtList(workshops.map((w) => `${w.title} (${w.format})`))}`, chips: [{ label: 'See workshops', href: '/speaking/workshops/' }, B.book] }) },
  { name: 'framework', test: /\b(framework|business of you (method|steps|framework)|five steps|5 steps)\b/i,
    run: () => ({ reply: `The Business of You framework has five steps:\n${fmtList(framework.map((f) => `${f.title}: ${f.text}`))}`, chips: [{ label: 'Start with step 1: the free workbook', href: '/learn/workbook/' }, B.test] }) },
  { name: 'programs', test: /\b(program|programs|course|courses|class|coaching|academy|lab|intensive|learn from (her|yo)|training)\b/i,
    run: () => ({ reply: `Ways to learn with Yo:\n${fmtList(programs.map((p) => `${p.title}: ${p.tagline}`))}\n\nThere are free resources too.`, chips: [...programs.map((p) => ({ label: p.title, href: `/learn/${p.slug}/` })), { label: 'Free resources', href: '/learn/' }] }) },
  { name: 'free', test: /\b(free|workbook|checklist|download|resource|resources|template)\b/i,
    run: () => ({ reply: `Free tools from Yo:\n${fmtList(resources.map((r) => `${r.title} (${r.kind})`))}`, chips: resources.map((r) => ({ label: r.title, href: `/learn/${r.slug}/` })) }) },
  { name: 'podcast', test: /\b(podcast|episode|episodes|listen|be a guest|guest on)\b/i,
    run: (t) => /\bguest\b/i.test(t)
      ? { reply: 'Yo loves featuring founders, lenders, speakers and community builders. Apply on the guest page and the team will be in touch.', chips: [{ label: 'Apply to be a guest', href: '/podcast/be-a-guest/' }, { label: 'About the show', href: '/podcast/the-show/' }] }
      : { reply: `The Business of You podcast covers business, money and wellness for founders. Recent episodes:\n${fmtList(episodes.slice(0, 4).map((e) => `Ep. ${e.n}: ${e.title}`))}`, chips: [{ label: 'All episodes', href: '/podcast/' }, { label: 'Watch the show', href: '/watch/' }] } },
  { name: 'reading', test: /\b(book(s)? (she|yo) (recommend|read)|reading list|recommended reading|bookshelf|what (should|to) (i )?read|books)\b/i,
    run: () => ({ reply: 'Yo keeps a bookshelf of the books she recommends on business, money, leadership and wellbeing.', chips: [{ label: 'Open Yo\'s bookshelf', href: '/learn/books/' }] }) },
  { name: 'press', test: /\b(press|media|journalist|interview|one[- ]sheet|headshot|bio for|emcee|introduction)\b/i,
    run: () => ({ reply: 'Everything for press and event hosts is in the press kit: bios, headshots, the one-sheet and an emcee introduction.', chips: [{ label: 'Open the press kit', href: '/press/' }, { label: 'Speaker one-sheet', href: '/press/one-sheet/' }] }) },
  { name: 'sponsor', test: /\b(sponsor|sponsorship|partner|partnership|advertis)\b/i,
    run: () => ({ reply: 'Thank you for thinking of partnering with Yo. The sponsor page explains the options, and you can send your details there.', chips: [{ label: 'Sponsor the podcast', href: '/podcast/sponsor/' }, B.contact] }) },
  { name: 'events', test: /\b(upcoming|next event|events|where can i see (her|yo)|live|calendar)\b/i,
    run: () => ({ reply: 'Upcoming appearances and events are listed on the events page, with dates and how to attend.', chips: [{ label: 'See events', href: '/events/' }] }) },
  { name: 'portal', test: /\b(sign in|log ?in|account|portal|password|member area|sign up|register)\b/i,
    run: () => ({ reply: 'Members and Yo\'s team use the portal for messages, assignments, community and resources. You can create an account in a minute.', chips: [{ label: 'Sign in', href: '/portal/' }, { label: 'Create an account', href: '/portal/#signup' }] }) },
  { name: 'planner', test: /\b(book (yo|her)|hire (yo|her)|plan(ning)? (an|my|our) event|keynote for|speaker for|speak at|our conference|my conference|retreat|offsite|gala|luncheon|women'?s (event|conference)|availability|available on)\b/i,
    run: () => ({ reply: 'Wonderful! I can recommend the right talk and pre-fill the booking form. It takes five quick questions.', chips: [B.plan, B.book, B.talks] }) },
  { name: 'builder', test: /\b(my (business )?idea|start(ing)? a business|startup|side hustle|first customers|grow my business|become a speaker|speaking career|business plan)\b/i,
    run: () => ({ reply: 'Let\'s look at your idea together. Three quick questions will show whether it solves a real problem people will pay for, and what to do next.', chips: [B.test, { label: 'Free workbook', href: '/learn/workbook/' }] }) },
];
const ADVICE = ADVICE_RX;
const NOTE = 'Quick note: I share education, not financial, legal or mental health advice. For your own situation, please talk with a licensed professional.';

// ---------- Answer ----------
function answer(message) {
  if (!K) load();
  const text = String(message || '').trim();
  const out = (r, source, extra = {}) => ({ ...r, chips: r.chips || [], source, ...extra });
  const advice = ADVICE.test(text) ? `\n\n${NOTE}` : '';

  // 1. Guardrail skills that must win (fees, greetings, identity)
  for (const s of SKILLS.filter((x) => ['fees', 'greeting', 'thanks', 'ai'].includes(x.name))) if (s.test.test(text)) return out(s.run(text), 'skill:' + s.name);

  // Named talk, program or workshop: answer about that one specifically
  const low = text.toLowerCase().replace(/&/g, 'and');
  const named = (title) => low.includes(title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9 ]/g, '').trim()) || low.includes(title.toLowerCase().replace(/&/g, 'and'));
  const tk = talks.find((t) => named(t.title) && !/^the business of you$/i.test(t.title) || (named(t.title) && /\b(talk|keynote)\b/i.test(text)));
  if (tk && !SKILLS.find((x) => x.name === 'fees').test.test(text)) return out({ reply: `${tk.title}: ${tk.subtitle}.\n\n${tk.abstract}\n\nLength: ${tk.length}. Formats: ${tk.formats.join(', ')}. Best for ${tk.who}.`, chips: [{ label: 'See this talk', href: `/speaking/${tk.slug}/` }, { label: 'Book this talk', href: `/book/?talk=${tk.slug}` }] }, 'talk:' + tk.slug);
  const pg = programs.find((p) => named(p.title));
  if (pg) return out({ reply: `${pg.title}: ${pg.tagline}\n\nFor ${pg.who}. ${pg.format}, ${pg.length}.\n\nYou'll walk away with:\n${fmtList(pg.outcomes)}`, chips: [{ label: 'See the program', href: `/learn/${pg.slug}/` }, { label: 'All programs', href: '/learn/' }] }, 'program:' + pg.slug);
  const ws = workshops.find((w) => named(w.title));
  if (ws) return out({ reply: `${ws.title} (${ws.format}): ${ws.text}\n\nBest for ${ws.who}.`, chips: [{ label: 'See workshops', href: '/speaking/workshops/' }, B.book] }, 'workshop:' + ws.slug);

  // 2. Answers the admin taught
  // Compare word sets directly: works with one taught answer or a thousand
  const qset = new Set(tokens(text));
  let taught = null;
  for (const d of K.trainedDocs) {
    if (!qset.size || !d.set.size) continue;
    const both = [...qset].filter((w) => d.set.has(w)).length;
    const score = both / Math.max(qset.size, d.set.size) + (both / qset.size) * 0.5;
    if (both >= Math.min(2, d.set.size) && both / qset.size >= 0.6 && both / d.set.size >= 0.6 && (!taught || score > taught.score)) taught = { score, doc: d };
  }
  if (taught) {
    const r = taught.doc.row;
    db.prepare(`UPDATE agent_training SET hits = hits + 1 WHERE id = ?`).run(r.id);
    return out({ reply: r.answer + advice, chips: r.link ? [{ label: r.link_label || 'Learn more', href: r.link }] : [] }, 'taught', { trained_id: r.id });
  }

  // 3. FAQs published on the site
  const faq = K.faqIndex.search(text, 1)[0];
  const faqStrong = faq && faq.score > 5 && faq.covered >= 0.6;

  // 4. Built-in skills
  const skill = SKILLS.find((s) => !['fees', 'greeting', 'thanks', 'ai'].includes(s.name) && s.test.test(text));
  const qlen = tokens(text).length;
  if (faqStrong && qlen >= 2 && (!skill || (faq.covered >= 0.85 && qlen >= 3))) return out({ reply: faq.doc.a + advice, chips: [{ label: 'Read more', href: faq.doc.url }] }, 'faq');
  if (skill) { const r = skill.run(text); return out({ ...r, reply: r.reply + (skill.name === 'advice' || skill.name === 'credit' ? '' : advice) }, 'skill:' + skill.name); }
  if (faq && faq.score > 3.5 && faq.covered >= 0.7 && qlen >= 2) return out({ reply: faq.doc.a + advice, chips: [{ label: 'Read more', href: faq.doc.url }] }, 'faq');

  // 5. Search every page of the site
  const qn = tokens(text).length;
  const hits = K.passages.search(text, 6).filter((h) => h.covered >= 0.6 && Math.round(h.covered * qn) >= Math.min(2, qn));
  if (hits.length && hits[0].score > 4) {
    const best = hits[0].doc;
    const second = hits.find((h) => h.doc.url === best.url && h.doc.text !== best.text && h.doc.kind === 'sentence');
    const body = best.kind === 'page' && second ? second.doc.text : best.text;
    const pages = [...new Map(hits.map((h) => [h.doc.url, h.doc])).values()].slice(0, 2);
    return out({ reply: `${body}${advice}`, chips: pages.map((p) => ({ label: p.title.length > 40 ? p.title.slice(0, 38) + '…' : p.title, href: p.url })) }, 'search');
  }

  // 6. Don't know yet: be honest and offer the next step
  return out({ reply: 'I\'m still learning that one, so I don\'t want to guess. I\'ve noted your question for Yo\'s team. Meanwhile, I can help you plan an event, test a business idea, or connect you with a person.' + advice, chips: [B.plan, B.test, B.contact] }, 'unknown', { unknown: true });
}

module.exports = { answer, load, refreshTraining, tokens };
