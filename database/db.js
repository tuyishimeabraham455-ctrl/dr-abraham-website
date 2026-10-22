// ============================================================
//  DR. ABRAHAM — Database Setup (SQLite)
//  File: database/db.js
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
// DB_PATH can point at a persistent disk in production (e.g. /var/data/site.db)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'maya_sterling.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
//  CREATE TABLES
// ============================================================
db.exec(`

  -- ── Subscribers (Email List) ──────────────────────────────
  CREATE TABLE IF NOT EXISTS subscribers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    first_name  TEXT,
    source      TEXT    DEFAULT 'website',  -- homepage, book, blog, footer
    tags        TEXT    DEFAULT '',          -- comma-separated: "s3-academy, vip"
    status      TEXT    DEFAULT 'active',   -- active | unsubscribed | bounced
    created_at  DATETIME DEFAULT (datetime('now')),
    updated_at  DATETIME DEFAULT (datetime('now'))
  );

  -- ── Contact / Booking Inquiries ───────────────────────────
  CREATE TABLE IF NOT EXISTS inquiries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    email        TEXT    NOT NULL,
    phone        TEXT,
    organization TEXT,
    inquiry_type TEXT,   -- speaking | s3-academy | vip-mastermind | media | other
    event_type   TEXT,
    event_date   TEXT,
    budget       TEXT,
    message      TEXT    NOT NULL,
    status       TEXT    DEFAULT 'new',     -- new | read | replied | closed
    created_at   DATETIME DEFAULT (datetime('now'))
  );

  -- ── Blog Posts ────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    excerpt     TEXT,
    content     TEXT,
    category    TEXT    DEFAULT 'mindset',  -- mindset | business | leadership | money | lifestyle
    image_url   TEXT,
    author      TEXT    DEFAULT 'Dr. Abraham',
    status      TEXT    DEFAULT 'published',  -- draft | published
    views       INTEGER DEFAULT 0,
    read_time   INTEGER DEFAULT 5,          -- minutes
    created_at  DATETIME DEFAULT (datetime('now')),
    updated_at  DATETIME DEFAULT (datetime('now'))
  );

  -- ── Programs / Enrollment Leads ──────────────────────────
  CREATE TABLE IF NOT EXISTS program_leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    phone       TEXT,
    program     TEXT    NOT NULL,   -- s3-foundation | s3-academy | vip-mastermind
    revenue     TEXT,               -- current revenue range
    goal        TEXT,               -- what they want to achieve
    status      TEXT    DEFAULT 'pending',  -- pending | qualified | enrolled | declined
    created_at  DATETIME DEFAULT (datetime('now'))
  );

  -- ── Testimonials ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS testimonials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    role        TEXT,
    location    TEXT,
    program     TEXT,
    result      TEXT,
    content     TEXT    NOT NULL,
    rating      INTEGER DEFAULT 5,
    initials    TEXT,
    featured    INTEGER DEFAULT 0,  -- 0 = no, 1 = yes (show on homepage)
    approved    INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT (datetime('now'))
  );

  -- ── Page Views / Analytics ───────────────────────────────
  CREATE TABLE IF NOT EXISTS page_views (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    page       TEXT    NOT NULL,
    referrer   TEXT,
    user_agent TEXT,
    ip_hash    TEXT,               -- hashed IP for privacy
    created_at DATETIME DEFAULT (datetime('now'))
  );

  -- ── Admin Users ───────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS admin_users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,    -- hashed
    role       TEXT    DEFAULT 'admin',
    created_at DATETIME DEFAULT (datetime('now'))
  );

`);

// ============================================================
//  SEED DATA — Sample posts, testimonials
// ============================================================
const seedPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
if (seedPosts.count === 0) {
  const insertPost = db.prepare(`
    INSERT INTO posts (title, slug, excerpt, content, category, read_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const posts = [
    [
      '5 Military Habits That Will 10X Your Business Results',
      '5-military-habits-10x-business',
      'The same discipline that kept me alive in combat is what built my empire. These 5 habits are non-negotiable in my daily routine.',
      'Full article content goes here. Replace with your actual blog content...',
      'mindset', 6
    ],
    [
      'The S3 Pricing Formula: Charge What You\'re Worth (Finally)',
      's3-pricing-formula-charge-worth',
      'Undercharging is a form of self-betrayal. I\'m going to show you exactly how to price your services with confidence and zero apology.',
      'Full article content goes here. Replace with your actual blog content...',
      'money', 8
    ],
    [
      'How to Lead a Team When You\'ve Never Done It Before',
      'how-to-lead-team-first-time',
      'Leadership isn\'t a title — it\'s a decision. Here\'s how I went from leading soldiers to leading a global coaching company.',
      'Full article content goes here. Replace with your actual blog content...',
      'leadership', 5
    ],
    [
      'The 90-Day Business Launch Blueprint (Steal It)',
      '90-day-business-launch-blueprint',
      'You don\'t need 12 months to launch. You need 90 days and a plan. Here is the exact blueprint I use with every new S3 Academy client.',
      'Full article content goes here. Replace with your actual blog content...',
      'business', 10
    ],
    [
      'Why "Imposter Syndrome" is Actually Your Superpower in Disguise',
      'imposter-syndrome-superpower',
      'Every high-achiever I\'ve ever coached has felt like a fraud at some point. Here\'s why that feeling is a signal you\'re exactly where you\'re supposed to be.',
      'Full article content goes here. Replace with your actual blog content...',
      'mindset', 7
    ],
    [
      'The Myth of Work-Life Balance (And What Actually Works)',
      'myth-of-work-life-balance',
      'Balance is a lie. Integration is the truth. As a single parent and entrepreneur, here\'s how I\'ve built a seven-figure business without sacrificing my family.',
      'Full article content goes here. Replace with your actual blog content...',
      'lifestyle', 9
    ],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertPost.run(...row);
  });
  insertMany(posts);
  console.log('[DB] ✅ Seeded 6 blog posts');
}

const seedTestimonials = db.prepare('SELECT COUNT(*) as count FROM testimonials').get();
if (seedTestimonials.count === 0) {
  const insertT = db.prepare(`
    INSERT INTO testimonials (name, role, location, program, result, content, rating, initials, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const testimonials = [
    ['Jessica Thompson', 'Business Strategist', 'Atlanta, GA', 's3-academy', '$80K → $600K in 12 months',
     'I joined S3 Academy with a small consulting practice making $80K a year. Twelve months later, I crossed $600K in revenue.',
     5, 'JT', 1],
    ['Amara Patel', 'Tech Founder', 'New York, NY', 's3-academy', 'Launched & funded in 18 months',
     'Dr. Abraham\'s S3 Method gave me a clear, step-by-step path. I launched my tech company, secured funding, and hired a team of 8.',
     5, 'AP', 1],
    ['Rachel Daniels', 'Veteran Entrepreneur', 'Houston, TX', 's3-academy', 'Built 7-figure coaching business',
     'As a veteran myself, I deeply connected with Dr. Abraham\'s approach. She understands the military mindset and shows you how to turn that discipline into entrepreneurial power.',
     5, 'RD', 1],
    ['Lisa Chen', 'International Speaker', 'San Francisco, CA', 'vip-mastermind', 'Now charging $25K per keynote',
     'The VIP Mastermind changed everything for my brand. I went from local speaker to international keynote.',
     5, 'LC', 1],
    ['Tanya Williams', 'Health Coach', 'Dallas, TX', 's3-academy', '$300K launch in month 6',
     'S3 Academy gave me the missing link. I had the passion but not the business strategy. Six months later, I had a $300K launch.',
     5, 'TW', 0],
    ['Natasha King', 'Agency Owner', 'Chicago, IL', 's3-academy', 'ROI in 3 weeks, $1.2M year',
     'I almost didn\'t join because of the price. Best decision of my life. I made back my investment in 3 weeks.',
     5, 'NK', 0],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertT.run(...row);
  });
  insertMany(testimonials);
  console.log('[DB] ✅ Seeded 6 testimonials');
}

console.log(`[DB] ✅ Database ready at: ${DB_PATH}`);

module.exports = db;
