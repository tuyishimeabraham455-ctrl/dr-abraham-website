// strip-emojis.js — removes emoji characters from all HTML files
const fs = require('fs');
const path = require('path');

const files = ['index.html','about.html','programs.html','book.html','blog.html','contact.html'];
const dir = __dirname;

// Comprehensive emoji unicode ranges regex
const emojiRegex = /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u2702-\u27B0]|[\u24C2\uFE0F]|[\uD83C-\uDBFF\uDC00-\uDFFF]+|\u2728|\u2605|\u2606|\u2764|\u2665|\u2660|\u2663|\u2666|\u261D|\u270A|\u270B|\u270C|\u270D|\u270F|\u2714|\u2716|\u2733|\u2734|\u2744|\u2747|\u274C|\u274E|\u2753|\u2757|\u2763|\u2795|\u2796|\u2797|\u27A1|\u27B0|\u27BF|\uFE0F/gu;

// Also catch common text-emoji sequences that browsers render as icons
const textEmojiMap = {
  '&#x2728;': '',  '&#x2605;': '',  '&#x2606;': '',
  '&star;': '',    '★': '',          '☆': '',
  '✓': '&#10003;', // keep checkmark as HTML entity
};

let totalReplaced = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) { console.log(`  SKIP  ${file} (not found)`); return; }

  let content = fs.readFileSync(filePath, 'utf8');
  const before = content.length;

  // Remove emojis
  content = content.replace(emojiRegex, '');

  // Clean up double spaces left by emoji removal
  content = content.replace(/  +/g, ' ');
  content = content.replace(/ +>/g, '>');
  content = content.replace(/> +</g, '>\n<');

  // Remove empty aria-label attributes caused by emoji removal
  content = content.replace(/aria-label="\s*"/g, '');

  // Tidy star ratings — replace with text stars
  content = content.replace(/★★★★★/g, '5 / 5 Stars');
  content = content.replace(/★★★★/g,  '4 / 5 Stars');
  content = content.replace(/★★★/g,   '3 / 5 Stars');

  const removed = before - content.length;
  totalReplaced += removed;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  OK    ${file}  (${removed} chars removed)`);
});

console.log(`\n  Total characters removed: ${totalReplaced}`);
console.log('  All HTML files cleaned.\n');
