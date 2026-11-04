// ============================================================
//  Create a portal account from the command line.
//  Usage:
//    node scripts/create-user.js --name "Yolanda Butler" --email yo@example.com --role admin
//  Prints a temporary password once. Change it after signing in (Account tab).
// ============================================================
const db = require('../database/db');
const m = require('../lib/members');

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : ''; };
const name = (arg('name') || '').trim();
const email = (arg('email') || '').trim().toLowerCase();
const role = m.ROLES.includes(arg('role')) ? arg('role') : 'member';

if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: node scripts/create-user.js --name "Full Name" --email you@example.com --role admin|team|member');
  process.exit(1);
}
const password = m.tempPassword();
try {
  db.prepare(`INSERT INTO members (name, email, password, role) VALUES (?, ?, ?, ?)`).run(name, email, m.hashPassword(password), role);
} catch (err) {
  console.error(/UNIQUE/.test(err.message) ? `An account for ${email} already exists.` : err.message);
  process.exit(1);
}
console.log(`\nCreated ${role} account for ${name} <${email}>`);
console.log(`Temporary password: ${password}`);
console.log('Sign in at /portal/ and change it in the Account tab.\n');
