// ============================================================
//  AI Coach — local answers (no AI service needed)
//  Drafts follow-up emails, call prep, content ideas, opening
//  stories and weekly focus from the live business snapshot and
//  Yo's own material. Used when ANTHROPIC_API_KEY isn't set.
// ============================================================
const site = require('../site/content/site');
const { talks } = require('../site/content/talks');

const PT = (iso) => new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const first = (name) => String(name || '').replace(/^(Pastor|Dr\.?|Rev\.?)\s+/i, '').split(' ')[0] || 'there';
const talkFor = (lead = {}) => {
  const t = `${lead.event_type || ''} ${lead.message || ''} ${lead.organization || ''}`.toLowerCase();
  if (/credit|capital|fund|financ|bank|credit union|money|loan/.test(t)) return talks.find((x) => x.slug === 'credit-capital-confidence');
  if (/church|ministry|faith|community|nonprofit|women|network|chamber/.test(t)) return talks.find((x) => x.slug === 'each-one-reach-one');
  return talks.find((x) => x.slug === 'business-of-you') || talks[0];
};
// Find a lead or call the question mentions by name, organisation or #number
const mentioned = (q, list) => {
  const low = q.toLowerCase();
  const num = (low.match(/#\s?(\d+)/) || [])[1];
  return list.find((x) => (num && String(x.id) === num || String(x.inquiry_id) === num))
    || list.find((x) => x.name && low.includes(x.name.toLowerCase()))
    || list.find((x) => x.name && low.includes(first(x.name).toLowerCase()) && first(x.name).length > 2)
    || list.find((x) => x.organization && low.includes(x.organization.toLowerCase()));
};

function followUp(q, s) {
  const lead = mentioned(q, s.leads) || s.leads[0];
  if (!lead) return 'There are no open leads right now. When a booking request comes in, ask me again and I\'ll draft the follow-up.';
  const talk = talkFor(lead);
  return `**Follow-up email for ${lead.name}${lead.organization ? ` (${lead.organization})` : ''}**

Subject: ${lead.event_type ? `Your ${lead.event_type.toLowerCase()}` : 'Your request'}${lead.event_date ? ` on ${lead.event_date}` : ''}: next steps with Yo

Hi ${first(lead.name)},

Thank you for reaching out about ${lead.event_type ? `your ${lead.event_type.toLowerCase()}` : 'your event'}${lead.organization ? ` at ${lead.organization}` : ''}. ${lead.message ? 'I read your note, and ' : ''}it sounds like a wonderful fit.

Based on what you shared, I'd recommend **${talk.title}**: ${talk.subtitle.charAt(0).toLowerCase() + talk.subtitle.slice(1)}. ${talk.takeaways[0]}.

The best next step is a short discovery call so I can learn about your audience and goals and send you a clear proposal. You can pick a time here: /book/

Looking forward to it,
Yolanda "Yo" Butler
${site.brand}

---
Why this works: it thanks them, shows you read their request, recommends one talk with a reason, and gives one clear next step. Fees stay out of the first email; share them on the call.`;
}

function callPrep(q, s) {
  const call = mentioned(q, s.calls) || s.calls[0];
  const lead = call ? (s.leads.find((l) => l.id === call.inquiry_id) || call) : (mentioned(q, s.leads) || s.leads[0]);
  if (!lead) return 'No discovery calls are booked in the next week. When one is, ask me and I\'ll prepare you for it.';
  const talk = talkFor(lead);
  return `**Call prep: ${lead.name}${lead.organization ? `, ${lead.organization}` : ''}**${call ? `\n${PT(call.starts_at)} (Pacific)` : ''}

**What you know**
• ${lead.event_type || 'Event type not shared yet'}${lead.event_date ? ` · ${lead.event_date}` : ''}${lead.budget ? ` · budget ${lead.budget}` : ''}
${lead.message ? `• Their note: "${String(lead.message).slice(0, 220)}"` : '• No message yet, so start with their goals'}

**Questions to ask**
1. What do you want people to think, feel and do when they leave the room?
2. Who exactly is in the audience, and what are they struggling with right now?
3. What has worked, or not worked, with speakers before?
4. What does the day look like: time slot, length, format, other speakers?
5. Who else is part of the decision, and what is your timeline to confirm?

**Talk to recommend:** ${talk.title}. It is made for ${talk.who.charAt(0).toLowerCase() + talk.who.slice(1).replace(/\.$/, "")}. Offer a keynote + workshop if they want the learning to stick.

**Close the call:** agree on the date hold, then send the proposal within 24 hours with the one-sheet (/press/one-sheet/).`;
}

function contentIdeas(s) {
  const asks = [...s.gaps.map((g) => g.question), ...s.questions.map((x) => x.question)].filter(Boolean).slice(0, 6);
  const fallback = ['How do I price my first workshop?', 'What do lenders look for before a business loan?', 'How do I find my first paying customers?'];
  const list = asks.length ? asks : fallback;
  return `**Content plan from what visitors ask**${asks.length ? '' : ' (no visitor questions logged yet, so here are starter topics)'}

${list.map((qq, i) => `${i + 1}. "${qq}"\n   • Podcast: answer it in a 20-minute solo episode with one story from your journey\n   • Article: "${qq.replace(/\?$/, '')}: the short answer" (5 steps, 800 words)\n   • FAQ: add a two-sentence answer, and teach it to Agent Yo`).join('\n')}

Tip: answer the most-asked question first. Then teach the answer to Agent Yo under Train Agent Yo so visitors get it right away.`;
}

function openingStory() {
  const f = site.facts;
  return `**A 90-second opening, built from your real journey**

1. **Start in the moment (15 s).** Open on a specific scene from your ${f.yearsPreschool} years running Christian Family Preschool in Oakland: a morning, a parent, a problem only you saw.
2. **The turn (20 s).** Name the moment you realised the business was built around you: your strengths, your story, your season of life.
3. **The bigger lesson (25 s).** Connect it to what you saw in ${f.yearsHope} years at Operation HOPE: good people with good ideas, held back by money stress and missing relationships.
4. **The promise (20 s).** "Today I'll show you how to build a business around you, in five steps."
5. **The bridge (10 s).** Ask the room one question with a show of hands.

**Two angles**
• Women's business conference: lead with the season-of-life choices you made, and end on "your story is an asset".
• Church or ministry: lead with community and service, and end on "each one, reach one".

Practice it out loud three times and record it on your phone. Keep the first line under ten words.`;
}

function weeklyFocus(sugg) {
  const top = sugg.slice(0, 5);
  if (!top.length) return 'Your pipeline is quiet. Spend this week on visibility: share your one-sheet with three planners and post one clip from a talk.';
  return `**Your focus this week**\n\n${top.map((x, i) => `${i + 1}. **${x.title}** (${x.priority}). ${x.action}`).join('\n')}\n\nDo the high-priority items first. Replying to hot leads within a day matters most.`;
}

function assignmentReport(s) {
  const a = s.assignments || [];
  if (!a.length) return 'No open assignments right now. Create one under Assignments and I\'ll track who submits.';
  const submitted = a.filter((x) => x.status === 'submitted');
  const late = a.filter((x) => x.due_date && x.due_date < s.today && ['todo', 'in_progress', 'needs_changes'].includes(x.status));
  const inProgress = a.filter((x) => x.status === 'in_progress');
  const notStarted = a.filter((x) => x.status === 'todo' && !late.includes(x));
  const changes = a.filter((x) => x.status === 'needs_changes');
  const line = (x) => `• ${x.assignee}: "${x.title}"${x.due_date ? ` (due ${x.due_date})` : ''}`;
  return [
    `**Submitted, waiting for your review (${submitted.length})**`, submitted.length ? submitted.map(line).join('\n') : '• Nobody right now.',
    `\n**Late (${late.length})**`, late.length ? late.map(line).join('\n') : '• Nobody is late.',
    `\n**Working on it (${inProgress.length})**`, inProgress.length ? inProgress.map(line).join('\n') : '• None.',
    changes.length ? `\n**Asked to make changes (${changes.length})**\n${changes.map(line).join('\n')}` : '',
    `\n**Not started yet (${notStarted.length})**`, notStarted.length ? notStarted.map(line).join('\n') : '• None.',
    `\nTip: open Assignments and press ✨ AI review on a submission for a feedback draft.`,
  ].filter(Boolean).join('\n');
}

function answer(question, s, sugg) {
  const q = String(question || '');
  if (/\b(submit|submitted|submission|assignment|assignments|homework|late|overdue|who (has|hasn'?t|did))\b/i.test(q)) return assignmentReport(s);
  if (/\b(email|follow[- ]?up|reply|write to|message (to|for))\b/i.test(q)) return followUp(q, s);
  if (/\b(prep|prepare|call|discovery|meeting)\b/i.test(q)) return callPrep(q, s);
  if (/\b(content|episode|podcast|article|blog|post ideas|ideas|faq)\b/i.test(q)) return contentIdeas(s);
  if (/\b(opening|story|open (my|the) (talk|keynote)|hook)\b/i.test(q)) return openingStory();
  if (/\b(focus|week|priorit|what should i|today|plan)\b/i.test(q)) return weeklyFocus(sugg);
  return `I can help with:\n• **Assignments**: "Who submitted assignments, and who is late?"\n• **Follow-up emails**: "Draft a follow-up to Monique"\n• **Call prep**: "Prepare me for my next call"\n• **Content ideas**: "Podcast ideas from what visitors ask"\n• **Opening stories**: "Write an opening story for my keynote"\n• **Weekly focus**: "What should I focus on this week?"\n\nAsk one of these and I'll use your live leads, calls and visitor questions.`;
}

module.exports = { answer };
