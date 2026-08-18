// ============================================================================
// scripts/catalogue.mjs — KEEP THE CATALOGUE HONEST
// ============================================================================
//
// The catalogue records a word count for every chapter, which drives the
// reading-time estimates. Those counts are the one thing in this project that
// has to be kept in step by hand, and hand-maintained numbers drift the moment
// anybody edits a paragraph.
//
// So they are not maintained by hand:
//
//     npm run catalogue         report anything out of step
//     npm run catalogue -- --fix   rewrite the counts to match the files
//
// It also catches the two structural mistakes that get easier to make as the
// library grows: a chapter listed in the catalogue with no file behind it, and
// a file sitting in lessons/ that nothing links to.
//
// This is the alternative to a database. A database would keep these in step
// automatically — and would also require a server, a schema, a migration for
// every change, and a way to edit content that is not your text editor. Forty
// lines of script buys the same guarantee for a library that one person
// writes.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

const LESSONS_DIR = 'client/public/lessons';
const CATALOGUE = 'client/src/content/catalogue.js';

const fix = process.argv.includes('--fix');

/** Strip tags and count words the same way a reader would meet them. */
function countWords(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

const source = fs.readFileSync(CATALOGUE, 'utf8');

// Pull { slug, words } straight out of the source rather than importing it.
// Importing would mean this script could only run after a build, and it needs
// to work on the source of truth.
const entries = [...source.matchAll(/slug: '([^']+)'[^}]*?words: (\d+)/g)].map((m) => ({
  slug: m[1],
  words: Number(m[2]),
}));

const files = fs
  .readdirSync(LESSONS_DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => path.basename(f, '.html'));

let problems = 0;
let updated = source;

// ---- counts that no longer match the file --------------------------------
for (const entry of entries) {
  const file = path.join(LESSONS_DIR, `${entry.slug}.html`);

  if (!fs.existsSync(file)) {
    console.log(`  MISSING FILE   ${entry.slug} is in the catalogue with no lessons/${entry.slug}.html`);
    problems++;
    continue;
  }

  const actual = countWords(fs.readFileSync(file, 'utf8'));

  if (actual !== entry.words) {
    console.log(`  STALE COUNT    ${entry.slug}: catalogue says ${entry.words}, file has ${actual}`);
    problems++;

    if (fix) {
      // Anchor the replacement to this slug, so two chapters with the same
      // word count cannot have their numbers swapped.
      updated = updated.replace(
        new RegExp(`(slug: '${entry.slug}'[^}]*?words: )\\d+`),
        `$1${actual}`
      );
    }
  }
}

// ---- files nothing points at ---------------------------------------------
const listed = new Set(entries.map((e) => e.slug));
for (const file of files) {
  if (!listed.has(file)) {
    console.log(`  ORPHAN FILE    lessons/${file}.html exists but is in no book`);
    problems++;
  }
}

if (fix && updated !== source) {
  fs.writeFileSync(CATALOGUE, updated);
  console.log(`\n  Rewrote ${CATALOGUE}.`);
}

if (problems === 0) {
  console.log(`  ${entries.length} chapters, ${files.length} files — all in step.`);
} else if (!fix) {
  console.log(`\n  ${problems} problem(s). Run with --fix to correct the counts.`);
  // A non-zero exit means CI can fail on this rather than only printing.
  process.exitCode = 1;
}
