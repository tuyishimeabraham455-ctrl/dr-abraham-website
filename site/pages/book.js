// ============================================================
//  BOOK YO — smart multi-step inquiry + discovery-call scheduler
// ============================================================
const site = require('../content/site');
const { talks, workshops } = require('../content/talks');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock } = require('../lib/layout');

const opt = (v, label = v) => `<option value="${esc(v)}">${esc(label)}</option>`;
const radios = (name, values, required = true) => `<div class="chips">${values.map((v) => `<label><input type="radio" name="${name}" value="${esc(v)}"${required ? ' required' : ''}/><span>${esc(v)}</span></label>`).join('')}</div>`;

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'book/';
  const bc = crumbs([['Book Yo', path]], depth);
  const faq = faqBlock([
    ['How quickly will we hear back?', 'Within one business day. You can also book a discovery call right after sending your request.'],
    ['Do you share fees before a call?', 'Fees depend on the event type, length, location and audience, so Yo\'s team shares a clear quote after learning about your event.'],
    ['Is my information private?', 'Yes. We only use it to reply to your request. We never sell or share it. See the privacy policy for details.'],
  ]);

  const body = `
${pageHero({ mark: 'Book', eyebrow: 'Book Yo', title: 'Let\'s plan something <em>unforgettable.</em>', lead: 'Four short steps. Tell us about your event and Yo\'s team will reply within one business day, or book a discovery call right away.', crumbsHtml: bc.html })}

<section class="sec book-sec" aria-label="Booking form">
  <div class="wrap book-in">
    <aside class="book-side reveal" aria-label="What happens next">
      <p class="eyebrow">What happens next</p>
      <ol class="next-steps">
        <li><b>You send the details</b><span>About four minutes.</span></li>
        <li><b>Pick a discovery call</b><span>Optional, 30 minutes, video.</span></li>
        <li><b>Receive a tailored proposal</b><span>Talk, format and fee.</span></li>
      </ol>
      <div class="book-contact"><p>Prefer email?</p><a href="mailto:${esc(site.email.booking)}">${esc(site.email.booking)}</a></div>
      <button type="button" class="btn btn-ghost-dark btn-block js-agent-open">${icon('spark')} Plan it with Agent Yo</button>
    </aside>

    <div class="book-main">
      <form class="stepper" id="bookForm" novalidate>
        <div class="step-head" aria-hidden="true">
          <ol class="step-dots"><li class="on">Event</li><li>Audience</li><li>About you</li><li>Review</li></ol>
          <div class="step-bar"><i></i></div>
        </div>

        <fieldset class="step" data-step="0">
          <legend>Tell us about the event</legend>
          <div class="field"><label for="bEvent">Event name</label><input id="bEvent" name="event_name" placeholder="e.g. Spring Leadership Summit" required/></div>
          <div class="row2">
            <div class="field"><label for="bType">Event type</label><select id="bType" name="event_type" required>${opt('', 'Choose one')}${['Conference', 'Corporate event', 'Nonprofit or ministry', "Women's group", 'Workshop or training', 'Podcast or media', 'Other'].map((x) => opt(x)).join('')}</select></div>
            <div class="field"><label for="bDate">Event date</label><input id="bDate" name="event_date" type="date" required/></div>
          </div>
          <div class="field"><span class="flabel">Format</span>${radios('format', ['In person', 'Virtual', 'Hybrid'])}</div>
          <div class="field"><label for="bLoc">City or venue <small>(in-person events)</small></label><input id="bLoc" name="location" placeholder="e.g. Oakland, CA"/></div>
        </fieldset>

        <fieldset class="step" data-step="1" hidden>
          <legend>Who will be in the room?</legend>
          <div class="field"><span class="flabel">Audience size</span>${radios('audience', ['Under 50', '50 to 200', '200 to 500', '500+'])}</div>
          <div class="field"><label for="bTopic">Topic of interest</label><select id="bTopic" name="topic">${opt('', 'Not sure yet, please recommend')}${talks.map((t) => opt(t.slug, `Keynote · ${t.title}`)).join('')}${workshops.map((w) => opt('workshop-' + w.slug, `Workshop · ${w.title}`)).join('')}</select></div>
          <div class="field"><label for="bGoals">What should your audience walk away with?</label><textarea id="bGoals" name="goals" rows="3" placeholder="Goals, themes, anything we should know"></textarea></div>
        </fieldset>

        <fieldset class="step" data-step="2" hidden>
          <legend>A little about you</legend>
          <div class="row2">
            <div class="field"><label for="bName">Your name</label><input id="bName" name="name" required autocomplete="name"/></div>
            <div class="field"><label for="bEmail">Email</label><input id="bEmail" name="email" type="email" required autocomplete="email"/></div>
          </div>
          <div class="row2">
            <div class="field"><label for="bOrg">Organization</label><input id="bOrg" name="organization" autocomplete="organization"/></div>
            <div class="field"><label for="bPhone">Phone <small>(optional)</small></label><input id="bPhone" name="phone" type="tel" autocomplete="tel"/></div>
          </div>
          <div class="row2">
            <div class="field"><label for="bBudget">Budget range</label><select id="bBudget" name="budget">${['Not sure yet', 'Under $2,500', '$2,500 to $5,000', '$5,000 to $10,000', '$10,000+'].map((x) => opt(x)).join('')}</select></div>
            <div class="field"><label for="bDM">Are you the decision maker?</label><select id="bDM" name="decision_maker">${['Yes, I decide', 'I\'m part of a committee', 'I\'m recommending to someone'].map((x) => opt(x)).join('')}</select></div>
          </div>
          <div class="field"><label for="bHeard">How did you hear about Yo?</label><select id="bHeard" name="heard_from">${opt('', 'Choose one')}${['Saw her speak', 'Referral', 'Search engine', 'Social media', 'Podcast', 'Agent Yo', 'Other'].map((x) => opt(x)).join('')}</select></div>
        </fieldset>

        <fieldset class="step" data-step="3" hidden>
          <legend>Review and send</legend>
          <dl class="review" id="bReview"></dl>
          <div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"/></label></div>
          <label class="consent"><input type="checkbox" name="consent" required/><span>I agree to be contacted about this request. We never sell your information. <a href="${r}privacy/">Privacy policy</a>.</span></label>
        </fieldset>

        <p class="form-msg" id="bMsg" aria-live="polite"></p>
        <div class="step-nav">
          <button type="button" class="btn btn-ghost-dark" id="bBack" hidden>Back</button>
          <button type="button" class="btn btn-dark magnetic" id="bNext">Continue ${icon('arrow')}</button>
          <button type="submit" class="btn btn-gold magnetic" id="bSend" hidden>Send request ${icon('arrow')}</button>
        </div>
      </form>

      <div class="booked" id="bDone" hidden tabindex="-1">
        <span class="booked-ic">${icon('check')}</span>
        <h2 class="h2">Thank you, <em id="bDoneName">friend</em>.</h2>
        <p>Your request is in. Yo's team will reply within one business day. Want to talk sooner? Pick a time for a 30-minute discovery call.</p>
        <div class="sched" id="sched">
          <div class="sched-days" id="schedDays" role="tablist" aria-label="Choose a day"></div>
          <div class="sched-times" id="schedTimes" aria-live="polite"></div>
          <p class="fine" id="schedTz"></p>
          <button type="button" class="btn btn-gold" id="schedBook" disabled>Book this time</button>
          <p class="form-msg" id="schedMsg" aria-live="polite"></p>
        </div>
        <p class="fine">While you wait: <a href="${r}press/one-sheet/">download Yo's one-sheet</a>.</p>
      </div>
    </div>
  </div>
</section>

${faq.html}
`;

  return page({
    path, depth, active: '',
    title: 'Book Yolanda Butler to Speak | Book Yo',
    description: 'Book keynote speaker Yolanda "Yo" Butler for your conference, company, nonprofit or ministry. Share event details and pick a discovery call time.',
    body,
    bodyClass: 'page-book',
    scripts: ['assets/js/book.js'],
    schema: [{ '@type': 'ContactPage', '@id': abs('book/#webpage'), url: abs('book/'), name: 'Book Yo', about: { '@id': ids.person } }, bc.schema, faq.schema],
  });
};
