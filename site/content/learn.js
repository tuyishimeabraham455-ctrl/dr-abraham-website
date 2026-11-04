// ============================================================
//  Learn — training programs and free resources
//  Programs are open for waitlist: prices and start dates are
//  announced when enrollment opens (never invented here).
// ============================================================

exports.programs = [
  {
    slug: 'business-of-you-lab', title: 'The Business of You Lab', kind: 'Cohort program',
    tagline: 'Six weeks from idea to a business that fits your life.',
    who: 'Aspiring and early-stage entrepreneurs who want structure, accountability and a plan built around their strengths.',
    format: 'Live online · 6 weekly sessions · small cohort', length: '6 weeks',
    outcomes: ['A tested business idea and a named customer', 'An offer built around your strengths', 'A simple money plan and credit checklist', 'A 90-day launch plan you can follow'],
    syllabus: [
      ['Week 1', 'Identify your problem', 'Name the customer, size the problem, run three quick tests.'],
      ['Week 2', 'Build around your strengths', 'Map your story, skills and relationships into an offer.'],
      ['Week 3', 'Price with confidence', 'Know your numbers and charge what the work is worth.'],
      ['Week 4', 'Fund and protect it', 'Business credit basics, separation of finances and protection.'],
      ['Week 5', 'Sustain yourself', 'Boundaries, energy and the habits that keep founders steady.'],
      ['Week 6', 'Scale your voice', 'Social capital, partnerships and your first 90 days.'],
    ],
  },
  {
    slug: 'speaker-academy', title: 'Speaker Academy', kind: 'Training program',
    tagline: 'From your story to paid stages.',
    who: 'Coaches, consultants and leaders who want to speak professionally and turn talks into business.',
    format: 'Live online · 8 modules · practice sessions with feedback', length: '8 weeks',
    outcomes: ['A signature talk built on your story', 'A workshop version you can sell to organizations', 'A one-sheet, bio and pitch for event planners', 'A plan to set fees and book your first stages'],
    syllabus: [
      ['Module 1', 'Your signature story', 'Find the story only you can tell, and why it matters to an audience.'],
      ['Module 2', 'Build the keynote', 'Structure, openings, transitions and a closing call to action.'],
      ['Module 3', 'Design the workshop', 'Turn the keynote into a hands-on session organizations buy.'],
      ['Module 4', 'Stage presence', 'Voice, movement and handling Q&A with ease.'],
      ['Module 5', 'Your speaker kit', 'One-sheet, bios, headshots and a simple reel plan.'],
      ['Module 6', 'Pitching planners', 'Find events, write pitches and follow up well.'],
      ['Module 7', 'Fees and contracts', 'How to set fees, package offers and protect yourself.'],
      ['Module 8', 'From talk to business', 'Podcasts, programs and community that grow from your talks.'],
    ],
  },
  {
    slug: 'funding-ready-intensive', title: 'Funding-Ready Intensive', kind: 'Intensive',
    tagline: 'Prepare the documents, numbers and story lenders want to see.',
    who: 'Business owners planning a loan, grant or investment conversation in the next six months.',
    format: 'Live online · 4 weekly sessions · document review', length: '4 weeks',
    outcomes: ['A complete funding-ready document folder', 'Clean, readable financial statements', 'A clear funding story and request', 'The right type of capital for your stage'],
    syllabus: [
      ['Week 1', 'Your credit foundation', 'Business and personal credit, and what to fix first.'],
      ['Week 2', 'Your numbers', 'Profit and loss, cash flow and the basics lenders read.'],
      ['Week 3', 'Your story', 'Explain your business, your request and how you will repay it.'],
      ['Week 4', 'Your options', 'Loans, grants, CDFIs and alternatives, and how to choose.'],
    ],
  },
];

// Free resources (email-gated on the site)
exports.resources = [
  { slug: 'workbook', title: 'Is your idea a real problem?', kind: 'Workbook', text: 'Test your idea, map your strengths and choose your first step.', audience: 'Entrepreneurs' },
  { slug: 'funding-checklist', title: 'Funding-ready in 30 days', kind: 'Checklist', text: 'The documents, numbers and story to prepare before you apply.', audience: 'Business owners' },
  { slug: 'event-planner-checklist', title: 'The speaker booking checklist', kind: 'Checklist', text: 'Everything to settle with a speaker, from brief to green room.', audience: 'Event planners' },
];
