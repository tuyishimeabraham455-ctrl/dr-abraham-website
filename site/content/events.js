// ============================================================
//  Events calendar — upcoming and past appearances
//  Add each real appearance here. `sample: true` entries are
//  placeholders: they show a "Sample" label and are left out of
//  Event schema (schema must only describe real, visible events).
//  Dates use ISO format with a time zone offset.
// ============================================================

exports.events = [
  {
    slug: 'business-of-you-summit-2026', title: 'The Business of You Summit', type: 'In person',
    start: '2026-12-06T09:00:00-08:00', end: '2026-12-06T16:00:00-08:00',
    location: 'Oakland, CA', organizer: 'The Business of You',
    text: 'A full day of strategy, funding and connection with Yo and guest experts.', link: '', sample: true,
  },
  {
    slug: 'credit-capital-workshop-2027', title: 'Credit & Capital Workshop', type: 'Virtual',
    start: '2027-01-21T17:00:00-08:00', end: '2027-01-21T18:30:00-08:00',
    location: 'Online', organizer: 'The Business of You',
    text: 'A live, practical session on business credit and becoming funding-ready.', link: '', sample: true,
  },
];
