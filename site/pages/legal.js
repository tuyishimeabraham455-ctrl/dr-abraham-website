// ============================================================
//  LEGAL & TRUST — privacy, terms, AI use disclosure,
//  accessibility statement, financial & wellness disclaimer
//  Written to match what this site actually does. Have a lawyer
//  review before launch.
// ============================================================
const site = require('../content/site');
const { page, esc, abs, icon, rel, crumbs, pageHero } = require('../lib/layout');

const UPDATED = '2026-11-04';
const updatedText = new Date(UPDATED + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function legalPage({ slug, title, h1, lead, description, sections }) {
  const depth = 1, r = rel(depth), path = `${slug}/`;
  const bc = crumbs([[title, path]], depth);
  const toc = sections.map(([h], i) => `<li><a href="#s${i + 1}">${esc(h)}</a></li>`).join('');
  const body = `
${pageHero({ mark: '§', eyebrow: 'Trust', title: h1, lead, crumbsHtml: bc.html })}
<section class="sec" aria-label="${esc(title)}">
  <div class="wrap legal-in">
    <nav class="legal-toc" aria-label="On this page"><p class="eyebrow">On this page</p><ol>${toc}</ol><p class="fine">Last updated ${updatedText}</p></nav>
    <div class="prose legal">
      ${sections.map(([h, paras], i) => `<section id="s${i + 1}"><h2 class="h3">${esc(h)}</h2>${paras.map((p) => Array.isArray(p) ? `<ul class="ticks">${p.map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : `<p>${esc(p)}</p>`).join('')}</section>`).join('')}
      <p class="fine">Questions? Email <a href="mailto:${esc(site.email.hello)}">${esc(site.email.hello)}</a> or use the <a href="${r}contact/">contact page</a>.</p>
    </div>
  </div>
</section>`;
  return page({ path, depth, title, description, body, schema: [{ '@type': 'WebPage', url: abs(path), name: title, dateModified: UPDATED }, bc.schema] });
}

exports.privacy = () => legalPage({
  slug: 'privacy', title: 'Privacy Policy | The Business of You', h1: 'Privacy <em>policy.</em>',
  lead: 'What we collect, why, and the choices you have. We collect only what we need and never sell your information.',
  description: 'How The Business of You collects, uses and protects your information, including forms, the newsletter, Agent Yo conversations and analytics.',
  sections: [
    ['Who we are', [`This website is operated by ${site.brand} (${site.person.name}), based in ${site.person.location}. "We" means ${site.brand}.`]],
    ['What we collect', [[
      'Information you give us in forms: your name, email, and details about your event, business or request.',
      'Your email address when you join the newsletter, a waitlist or download a free resource.',
      'Agent Yo conversations: the messages you send and its replies, plus the page where the chat started.',
      'Portal accounts: name, email, role, messages and community posts you create.',
      'With your consent, privacy-friendly analytics: which pages are visited. We store a shortened, one-way-scrambled version of your IP address, never the IP itself.',
    ]]],
    ['How we use it', [[
      'To reply to your requests, prepare proposals and schedule discovery calls.',
      'To send the newsletter or resources you asked for. You can unsubscribe at any time.',
      'To improve the site and Agent Yo, for example by learning which questions it could not answer.',
      'To keep the site secure and prevent spam.',
    ], 'We do not sell, rent or trade your information, and we do not use it for advertising.']],
    ['Services that help us', [[
      'Anthropic (Claude API) powers Agent Yo. Your chat messages are sent to Anthropic to generate replies.',
      'An email delivery service (such as Resend) sends confirmations and newsletters when enabled.',
      'A CRM or automation tool may receive lead details when the team connects one.',
      'Our hosting provider stores the website and its database.',
    ], 'These providers process information only to provide their service to us.']],
    ['Cookies and local storage', ['We store a few small preferences in your browser: your cookie choice, whether you dismissed the Agent Yo greeting, unlocked resources and, if you sign in, your portal session. Analytics run only if you accept them. You can change your choice any time with "Cookie preferences" in the footer.']],
    ['How long we keep it', ['We keep inquiries and conversations for as long as needed to serve you and run the business, and delete them on request. Newsletter details are kept until you unsubscribe.']],
    ['Your choices and rights', [[
      'Ask for a copy of your information, or ask us to correct or delete it.',
      'Delete an Agent Yo conversation yourself with "Forget this chat" under the chat window.',
      'Unsubscribe from emails at any time by replying to any email or writing to us.',
      'California residents may have additional rights under the CCPA/CPRA, including the right to know and to delete. We do not sell or share personal information for cross-context advertising.',
    ]]],
    ['Children', ['This site is meant for adults. We do not knowingly collect information from children under 13.']],
    ['Changes', ['If we change this policy we will update the date at the top of this page.']],
  ],
});

exports.terms = () => legalPage({
  slug: 'terms', title: 'Terms of Use | The Business of You', h1: 'Terms <em>of use.</em>',
  lead: 'The ground rules for using this website, its free resources, Agent Yo and the portal.',
  description: 'Terms of use for The Business of You website, free resources, Agent Yo assistant and member portal.',
  sections: [
    ['Using this site', ['By using this website you agree to these terms. If you do not agree, please do not use the site.']],
    ['Education, not advice', ['Everything on this site, including articles, workbooks, podcasts and Agent Yo, is general education. It is not financial, legal, tax or mental health advice. See the disclaimer for details.']],
    ['Your content', ['When you post in the community or send messages in the portal, you keep ownership of what you write and give us permission to display it there. Please be respectful. We may remove content that is abusive, unlawful or spam, and suspend accounts that break these terms.']],
    ['Accounts', ['Keep your password private. You are responsible for activity under your account. Tell us right away if you think someone else has accessed it.']],
    ['Our content', ['Text, designs, logos, workbooks and recordings on this site belong to The Business of You. You may use free resources for your own business. Please do not resell or republish them without permission. Press assets may be used to promote events featuring Yolanda Butler.']],
    ['Bookings and programs', ['Speaking engagements, coaching and programs are governed by a separate written agreement or the terms shown at enrollment, which take priority over these terms.']],
    ['No guarantees', ['We work hard to keep information accurate, but we cannot guarantee results. Business outcomes depend on many factors outside our control.']],
    ['Limitation of liability', ['To the extent the law allows, we are not liable for indirect or consequential losses arising from your use of this site.']],
    ['Governing law', ['These terms are governed by the laws of the State of California.']],
  ],
});

exports.aiDisclosure = () => legalPage({
  slug: 'ai-disclosure', title: 'AI Use Disclosure | Agent Yo', h1: 'How Agent Yo <em>works.</em>',
  lead: 'Agent Yo is an AI assistant. Here is what it does, what it does not do, and how your conversation is handled.',
  description: 'Agent Yo is an AI assistant for The Business of You. How it works, its limits, safety guardrails, and how conversations are stored and deleted.',
  sections: [
    ['It is an AI, not Yolanda', ['Agent Yo is an AI assistant built on Anthropic\'s Claude models. It speaks in Yolanda\'s voice to help you, but it is not Yolanda and it will say so if asked.']],
    ['What it knows', ['Agent Yo answers from Yolanda\'s own material: her bio, talks, workshops, programs and frequently asked questions. It does not browse the web. If it does not know something, it says so and offers to connect you with a person.']],
    ['What it will not do', [[
      'Quote fees. Fees are shared by Yo\'s team after a short conversation.',
      'Invent credentials, clients, testimonials or availability.',
      'Give financial, legal, tax or mental health advice. It shares general education and suggests a licensed professional.',
    ]]],
    ['Your safety', ['If you share that you are in distress, Agent Yo stops all booking and sales conversation and shares crisis resources, including the 988 Suicide & Crisis Lifeline (call or text 988 in the US). If you are in immediate danger, call 911.']],
    ['Your details', ['Agent Yo only sends your name, email and request to Yo\'s team after you say yes in the conversation. It can also book a discovery call if you ask it to.']],
    ['Your conversation', ['Conversations are stored so the team can follow up and improve answers. You can delete yours any time with "Forget this chat" under the chat window. Messages are processed by Anthropic to generate replies. We never sell conversations or use them for advertising.']],
  ],
});

exports.accessibility = () => legalPage({
  slug: 'accessibility', title: 'Accessibility Statement | The Business of You', h1: 'Accessibility <em>statement.</em>',
  lead: 'Everyone should be able to use this site. Here is what we do, and how to tell us if something gets in your way.',
  description: 'Accessibility statement for The Business of You: our WCAG 2.2 AA goal, the features we provide, known limitations and how to request help.',
  sections: [
    ['Our goal', ['We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.']],
    ['What we do', [[
      'Text and buttons meet AA color contrast. Gold is used for decoration, never for small text on light backgrounds.',
      'Every page works with a keyboard, with visible focus outlines and a "Skip to content" link.',
      'Images have text descriptions, and forms have labels and clear error messages.',
      'Animations turn off automatically when your device is set to reduce motion.',
      'Pages use real headings and landmarks for screen readers.',
    ]]],
    ['Known limitations', ['Podcast episodes and videos will include transcripts and captions at launch. Some older PDFs or third-party embeds may not yet meet every guideline.']],
    ['Tell us', [`If anything on this site is hard to use, email ${site.email.hello} and tell us the page and what happened. We will respond within two business days and provide the information in another format if you need it.`]],
  ],
});

exports.disclaimer = () => legalPage({
  slug: 'disclaimer', title: 'Financial & Wellness Disclaimer | Yo', h1: 'Education, <em>not advice.</em>',
  lead: 'What our content is, and what it is not.',
  description: 'The Business of You shares education about business, money and wellness. It is not financial, legal, tax or mental health advice.',
  sections: [
    ['General education', ['Content from The Business of You, including talks, articles, podcasts, workbooks, programs and Agent Yo, is for general education only.']],
    ['Not financial, legal or tax advice', ['Nothing here is financial, investment, lending, legal or tax advice. Every situation is different. Before making financial or legal decisions, talk with a licensed professional such as a CPA, attorney or financial advisor.']],
    ['Not mental health care', ['We talk about mental wellness for founders, but we do not provide therapy or medical care. If you are struggling, please reach out to a licensed professional. In a crisis, call or text 988 (US) or call 911.']],
    ['No guaranteed results', ['Stories and examples are shared to inspire and teach. They are not promises. Your results depend on your situation, effort and many other factors.']],
  ],
});
