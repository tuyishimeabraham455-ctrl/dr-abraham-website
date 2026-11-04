// ============================================================
//  The Business of You — podcast & show content
//  The podcast is in development: episodes below are previews
//  (sample: true). When an episode is recorded, add:
//    audio: 'assets/audio/ep-01.mp3' (or a full https URL)
//    published: '2027-01-12'
//    transcript: [ 'paragraph', ... ]
//  and set sample: false. The page, archive, schema and sitemap update automatically.
// ============================================================

exports.show = {
  name: 'The Business of You',
  tagline: 'Conversations about building a business, and a life, around you.',
  description: 'Founders, lenders, ministry leaders and community builders on money, mindset and growth, hosted by Yolanda "Yo" Butler.',
  status: 'In production',
  // Subscribe links: fill in when the show is listed (empty links are hidden)
  platforms: [
    { name: 'Apple Podcasts', url: '' },
    { name: 'Spotify', url: '' },
    { name: 'YouTube', url: '' },
    { name: 'RSS', url: '' },
  ],
};

exports.episodes = [
  {
    n: 1, slug: 'is-your-idea-a-real-problem', title: 'Is Your Business Idea a Real Problem?', topic: 'Business', guest: 'Solo with Yo', minutes: 32,
    summary: 'Yo walks through the first step of the Business of You framework: how to tell whether an idea solves a problem people will pay to fix, before you spend a dollar.',
    takeaways: ['Name the exact person who has the problem', 'Three quick tests before you build anything', 'Why "everyone" is not a customer'],
    guestBio: 'A solo episode with host Yolanda "Yo" Butler.', talk: 'business-of-you', resource: 'workbook', sample: true,
  },
  {
    n: 2, slug: 'business-credit-without-the-fear', title: 'Business Credit Without the Fear', topic: 'Financial wellness', guest: 'With a community lender', minutes: 41,
    summary: 'What lenders look for, how business credit differs from personal credit, and the habits that make the funding conversation easier.',
    takeaways: ['Separate personal and business finances early', 'The documents lenders ask for first', 'How to prepare months before you apply'],
    guestBio: 'A community lender who works with first-time borrowers. Guest to be announced.', talk: 'credit-capital-confidence', resource: 'funding-checklist', sample: true,
  },
  {
    n: 3, slug: 'from-preschool-owner-to-business-coach', title: 'From Preschool Owner to Business Coach', topic: 'Story', guest: "Yo's story", minutes: 38,
    summary: 'Yo shares the road from running Christian Family Preschool in Oakland for 13 years to coaching founders at Operation HOPE, and what each season taught her.',
    takeaways: ['What 13 years of payroll teaches you', 'Turning experience into a new business', 'Why community changes everything'],
    guestBio: 'Host Yolanda "Yo" Butler tells her own story.', talk: 'business-of-you', resource: 'workbook', sample: true,
  },
  {
    n: 4, slug: 'social-capital-is-real-capital', title: 'Social Capital Is Real Capital', topic: 'Community', guest: 'With a chamber of commerce leader', minutes: 36,
    summary: 'Why relationships open doors money cannot, and a simple plan for building a network that leads to opportunity.',
    takeaways: ['Map the five relationships your business needs', 'How to ask for help without feeling awkward', 'Each one, reach one in practice'],
    guestBio: 'A local chamber of commerce leader. Guest to be announced.', talk: 'each-one-reach-one', resource: 'workbook', sample: true,
  },
  {
    n: 5, slug: 'money-and-mindset-for-founders', title: 'Money, Mindset and the Founder Who Lasts', topic: 'Mental wellness', guest: 'With a wellness practitioner', minutes: 34,
    summary: 'The mental side of money: how stress shapes decisions, and the boundaries that help founders last as long as their businesses do.',
    takeaways: ['Spot money stress before it makes decisions for you', 'Boundaries that protect your energy', 'When to bring in a licensed professional'],
    guestBio: 'A licensed wellness practitioner. Guest to be announced.', talk: 'credit-capital-confidence', resource: 'workbook', sample: true,
  },
  {
    n: 6, slug: 'budgets-ministries-trust', title: 'Budgets That Ministries and Nonprofits Trust', topic: 'Nonprofit', guest: 'With a ministry leader', minutes: 30,
    summary: 'How mission-driven organizations build budgets their boards and members believe in, and plan for sustainable growth.',
    takeaways: ['A budget your board can read in five minutes', 'Planning for lean and strong seasons', 'Telling the story behind the numbers'],
    guestBio: 'A ministry leader and nonprofit board member. Guest to be announced.', talk: 'each-one-reach-one', resource: 'funding-checklist', sample: true,
  },
];

// Sponsorship packages (no prices published; shared in the media kit on request)
exports.sponsorship = [
  { name: 'Founding sponsor', text: 'Presenting partner for the first season, with a host-read message in every episode.', items: ['Season-long host-read spot', 'Logo on the show page and art', 'Launch event recognition'] },
  { name: 'Episode sponsor', text: 'Align with a single topic your audience cares about, from credit to community.', items: ['Host-read spot in one episode', 'Mention in show notes', 'Social clip feature'], featured: true },
  { name: 'Live taping partner', text: 'Bring a live taping to your community, conference or campus.', items: ['On-site recording', 'Audience Q&A', 'Co-branded promotion'] },
];
