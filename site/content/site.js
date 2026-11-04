// ============================================================
//  Site-wide content and settings for "Yo | The Business of You"
//  Edit this file to change names, links and facts across every page.
//  Rule from the blueprint: never invent fees, availability or credentials.
//  Anything marked `sample: true` is placeholder content to replace.
// ============================================================

module.exports = {
  // Public address of the site (used for canonical URLs, sitemap, schema, social cards).
  // Change this when the custom domain is connected.
  url: 'https://tuyishimeabraham455-ctrl.github.io/dr-abraham-website/',

  brand: 'The Business of You',
  shortName: 'Yo',
  person: {
    name: 'Yolanda Butler',
    nickname: 'Yo',
    jobTitle: 'Keynote Speaker, Podcaster, and Business Strategist',
    oneLine: 'Yolanda "Yo" Butler teaches entrepreneurs how to build a business around themselves, blending business strategy with mental and financial wellness.',
    location: 'Antioch, California',
    area: 'San Francisco Bay Area and virtual',
    image: 'images/yolanda.jpg',
    alumniOf: 'California State University, East Bay',
    knowsAbout: ['Entrepreneurship', 'Public speaking', 'Financial wellness', 'Mental wellness', 'Business credit', 'Small business funding', 'Social capital'],
  },

  // Real career facts (from Yolanda's own bio). Used on Home and About.
  facts: {
    yearsEntrepreneur: '30+',
    yearsPreschool: '13',
    yearsHope: '13+',
    recommendations: '33',
    timeline: [
      { label: 'Founder', title: 'Christian Family Preschool, Oakland', text: 'Ran her own preschool for 13 years and grew a consignment business on the side.' },
      { label: 'Trainer', title: "Women's Initiative for Self Employment", text: 'Trained women entrepreneurs to plan, launch and grow their businesses.' },
      { label: 'Advisor', title: 'Contra Costa SBDC', text: 'Advised small business owners on planning, funding and growth.' },
      { label: '13+ years', title: 'Operation HOPE', text: 'Grew from Small Business Coordinator to VP Community Relations to Financial Well-Being Coach.' },
      { label: 'Education', title: 'Cal State East Bay', text: 'Studied Business Administration and served as president of the Black Business Association.' },
    ],
    // Organizations from her career, shown in the credibility strip.
    organizations: ['Operation HOPE', 'Contra Costa SBDC', "Women's Initiative for Self Employment", 'Cal State East Bay', 'Christian Family Preschool'],
  },

  email: { hello: 'hello@yourdomain.com', booking: 'booking@yourdomain.com', press: 'press@yourdomain.com' }, // sample: replace with real inboxes

  // Social profiles (sample handles — replace with real URLs; they also feed schema "sameAs").
  social: [
    { name: 'Instagram', icon: 'ig', url: 'https://www.instagram.com/' },
    { name: 'LinkedIn', icon: 'li', url: 'https://www.linkedin.com/' },
    { name: 'YouTube', icon: 'yt', url: 'https://www.youtube.com/' },
    { name: 'Facebook', icon: 'fb', url: 'https://www.facebook.com/' },
  ],

  // Primary navigation (blueprint section 3)
  nav: [
    { label: 'About', href: 'about/' },
    { label: 'Speaking', href: 'speaking/' },
    { label: 'Podcast & Show', href: 'podcast/' },
    { label: 'Watch', href: 'watch/' },
    { label: 'Learn', href: 'learn/' },
    { label: 'Press', href: 'press/' },
  ],
};
