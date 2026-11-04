// ============================================================
//  Keynotes, workshops and the Business of You framework.
//  Used by Home, the Speaking hub, each talk page, the
//  "Find your talk" quiz and Agent Yo.
// ============================================================

// The named framework (blueprint section 4.4 and 7: "own a named framework")
exports.framework = [
  { n: '01', title: 'Identify your problem', text: 'Great businesses start with a real problem. We name it, size it, and make sure people will pay to solve it.', talk: 'business-of-you' },
  { n: '02', title: 'Build around your strengths', text: 'Your story, skills and relationships are assets. We design the business around who you already are.', talk: 'business-of-you' },
  { n: '03', title: 'Fund and protect it', text: 'Credit, capital, trust accounts and the guardrails that keep what you build safe.', talk: 'credit-capital-confidence' },
  { n: '04', title: 'Sustain yourself', text: 'Mental and financial wellness so the founder lasts as long as the business does.', talk: 'credit-capital-confidence' },
  { n: '05', title: 'Scale your voice', text: 'Social capital, partnerships and visibility. Each one, reach one.', talk: 'each-one-reach-one' },
];

// Signature keynotes (blueprint: feature 2 to 3 at launch; each gets its own page)
exports.talks = [
  {
    slug: 'business-of-you',
    kind: 'Keynote',
    title: 'The Business of You',
    subtitle: 'Build a business around your strengths, story and season of life',
    audiences: ['Conference', 'Corporate', "Women's groups", 'Nonprofit'],
    formats: ['Keynote', 'Workshop', 'Virtual'],
    length: '45 to 60 minutes',
    abstract: 'Most people are told to find a hot idea and chase it. Yo teaches the opposite: start with the person. Drawing on 30+ years as an entrepreneur, from running a preschool for 13 years to coaching founders at Operation HOPE, she shows audiences how to turn what they already have into a business that fits their life.',
    takeaways: [
      'A simple test to know whether your idea solves a real problem',
      'How to map your strengths, story and relationships into an offer',
      'The five steps of the Business of You framework',
      'One next step every attendee can take within a week',
    ],
    who: 'Aspiring and early-stage entrepreneurs, employee resource groups, women\'s and faith-based conferences.',
  },
  {
    slug: 'credit-capital-confidence',
    kind: 'Keynote',
    title: 'Credit, Capital & Confidence',
    subtitle: 'Financial wellness for founders who are ready to grow',
    audiences: ['Nonprofit', 'Corporate', 'Conference'],
    formats: ['Keynote', 'Workshop', 'Panel', 'Virtual'],
    length: '45 to 90 minutes',
    abstract: 'Money stress keeps good businesses small. Yo demystifies credit, funding and protection in plain language, then connects it to the mental side of money. Audiences leave knowing how lenders think and how to prepare before they ask.',
    takeaways: [
      'How business credit differs from personal credit, and why it matters',
      'What lenders look for before they say yes',
      'Trust accounts and planning basics that protect what you build',
      'Habits that lower money stress for the owner and the team',
    ],
    who: 'Small business centers, credit unions and banks, chambers of commerce, nonprofits serving entrepreneurs.',
  },
  {
    slug: 'each-one-reach-one',
    kind: 'Keynote',
    title: 'Each One, Reach One',
    subtitle: 'The power of social capital in business and community',
    audiences: ['Nonprofit', "Women's groups", 'Conference', 'Corporate'],
    formats: ['Keynote', 'Fireside chat', 'Panel', 'Virtual'],
    length: '30 to 60 minutes',
    abstract: 'Who you know shapes what you can build. Yo shows how relationships open doors that money alone cannot, and how communities grow when every person lifts one more. A warm, story-rich talk that turns a room of strangers into a network.',
    takeaways: [
      'Why social capital is a real business asset',
      'A simple plan to build relationships that lead to opportunity',
      'How to ask for help, and how to offer it',
      'Ways organizations can build community wealth together',
    ],
    who: 'Community organizations, ministries, women\'s networks, ERGs and leadership programs.',
  },
];

exports.workshops = [
  { title: 'Is Your Idea a Real Problem?', text: 'A hands-on session to test, size and sharpen a business idea.', format: 'Workshop · 2 hours' },
  { title: 'Business Credit Basics', text: 'Separate personal and business credit and build a profile lenders trust.', format: 'Workshop · 90 minutes' },
  { title: 'Funding-Ready in 30 Days', text: 'The documents, numbers and story to prepare before you apply.', format: 'Workshop series · 4 weeks' },
];

// Event types served (shown in the Proof section)
exports.eventTypes = ['Conferences', 'Chambers of commerce', 'Nonprofits', 'Ministries', 'Small business centers', 'Corporate ERGs', "Women's groups", 'Credit unions'];
