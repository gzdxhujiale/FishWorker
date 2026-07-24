// Build the bundled ECDICT dictionary database.
//
// This produces `src-tauri/resources/ecdict.db`, an offline SQLite database
// containing the ECDICT "mini" word list plus a lemmatization table derived
// from `lemma.en.txt`. The Tauri backend opens this file read-only at runtime
// (see src-tauri/src/dictionary.rs) to serve the Ctrl+L dictionary popup.
//
// Data sources (skywind3000/ECDICT, free English-Chinese dictionary database):
//   - ecdict.csv   : the full ~770k word database (phonetic / definition /
//                    translation / frequency / exam tags). By default we filter
//                    it down to a "精简版" of common + exam words so the bundled
//                    SQLite stays small; pass --full to keep every word.
//   - lemma.en.txt : base word -> inflected forms mapping (词形还原)
//
// Usage:
//   node scripts/build-ecdict.mjs              build the filtered 精简版 database
//   node scripts/build-ecdict.mjs --full       keep the entire word list
//   node scripts/build-ecdict.mjs --placeholder create an empty schema-only db
//   (or `pnpm build:dict` / `pnpm build:dict:placeholder`)
//
// The script first looks for local copies under `scripts/dict-src/` (ecdict.csv
// and lemma.en.txt). If missing it downloads them, trying several mirrors so it
// still works where raw.githubusercontent.com is blocked. The full ecdict.csv is
// ~60MB, so drop it into scripts/dict-src/ manually for a fully offline build.
//
// `--placeholder` skips all data loading and just writes an empty database with
// the correct schema so the project builds before the real word list is ready.
//
// Requires Node >= 22 (uses the built-in `node:sqlite` module).

import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SRC_DIR = join(__dirname, 'dict-src');
const OUT_DIR = join(REPO_ROOT, 'src-tauri', 'resources');
const OUT_DB = join(OUT_DIR, 'ecdict.db');

// Number of most-frequent words (by ECDICT `frq`/`bnc` rank) kept in the 精简版,
// on top of any word carrying an exam tag / Collins star / Oxford-core flag.
const FREQ_LIMIT = 30000;

// Candidate URLs per file, tried in order. GitHub raw first, then mirrors that
// usually stay reachable where raw.githubusercontent.com is blocked. The full
// ecdict.csv (~60MB) exceeds jsDelivr's file-size limit, so it uses raw mirrors.
const SOURCES = {
  'ecdict.csv': [
    'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://raw.gitmirror.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://ghproxy.net/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://mirror.ghproxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
  ],
  'lemma.en.txt': [
    'https://raw.githubusercontent.com/skywind3000/ECDICT/master/lemma.en.txt',
    'https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/lemma.en.txt',
    'https://fastly.jsdelivr.net/gh/skywind3000/ECDICT@master/lemma.en.txt',
    'https://raw.gitmirror.com/skywind3000/ECDICT/master/lemma.en.txt',
  ],
};

/** Reject obvious samples / HTML error pages so we don't build a broken DB. */
function isComplete(name, text) {
  if (!text) return false;
  const body = text.replace(/^\uFEFF/, ''); // tolerate a UTF-8 BOM
  if (name === 'ecdict.csv') {
    return body.includes('word,phonetic') && body.split('\n').length > 1000;
  }
  if (name === 'lemma.en.txt') {
    return body.includes('->') && body.split('\n').length > 1000;
  }
  return body.length > 0;
}

/**
 * Obtain a source file: prefer a complete local copy, otherwise try each mirror
 * in turn (caching the result locally). An incomplete local file is only used
 * as a last resort when every download fails.
 */
async function loadSource(name) {
  const localPath = join(SRC_DIR, name);
  let fallback = null;
  if (existsSync(localPath)) {
    const text = await readFile(localPath, 'utf8');
    if (isComplete(name, text)) {
      console.log(`• using local ${name}`);
      return text;
    }
    console.warn(`• local ${name} looks incomplete, trying to download a full copy…`);
    fallback = text;
  }

  for (const url of SOURCES[name]) {
    try {
      console.log(`• downloading ${name} from ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  ✗ HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!isComplete(name, text)) {
        const snippet = text.slice(0, 80).replace(/\s+/g, ' ');
        console.warn(
          `  ✗ response did not look like the expected file (${text.length} bytes): ${snippet}`,
        );
        continue;
      }
      await mkdir(SRC_DIR, { recursive: true });
      await writeFile(localPath, text, 'utf8');
      return text;
    } catch (err) {
      console.warn(`  ✗ ${err.message}`);
    }
  }

  if (fallback !== null) {
    console.warn(`• all downloads failed, falling back to the incomplete local ${name}`);
    return fallback;
  }
  throw new Error(
    `could not obtain ${name}. Download it manually into ${SRC_DIR} and re-run.`,
  );
}

/**
 * Like loadSource but non-fatal: returns '' (and warns) when the file is
 * neither present locally nor downloadable. Used for optional inputs.
 */
async function loadOptionalSource(name) {
  try {
    return await loadSource(name);
  } catch (err) {
    console.warn(
      `⚠ skipping ${name}: ${err.message}\n` +
        `  (词形还原表将为空，运行时改用后端的词尾启发式回退)`,
    );
    return '';
  }
}

/**
 * Minimal RFC-4180 CSV parser that tolerates quoted fields containing commas,
 * newlines and escaped double quotes. Returns an array of string[] rows.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignore, handled by the following \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toInt(value) {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = OFF;
    PRAGMA synchronous = OFF;
    CREATE TABLE stardict (
      word        TEXT PRIMARY KEY COLLATE NOCASE,
      phonetic    TEXT,
      definition  TEXT,
      translation TEXT,
      pos         TEXT,
      collins     INTEGER,
      oxford      INTEGER,
      tag         TEXT,
      exchange    TEXT
    );
    CREATE TABLE lemma (
      variant TEXT PRIMARY KEY COLLATE NOCASE,
      base    TEXT NOT NULL
    );
  `);
}

async function freshDb() {
  await mkdir(OUT_DIR, { recursive: true });
  if (existsSync(OUT_DB)) {
    await (await import('node:fs/promises')).rm(OUT_DB, { force: true });
  }
  const db = new DatabaseSync(OUT_DB);
  createSchema(db);
  return db;
}

async function main() {
  if (process.argv.includes('--placeholder')) {
    const db = await freshDb();
    db.close();
    console.log(`\u2714 wrote empty placeholder ${OUT_DB} (run without --placeholder to fill it)`);
    return;
  }

  const [csvText, lemmaText] = await Promise.all([
    loadSource('ecdict.csv'),
    loadOptionalSource('lemma.en.txt'),
  ]);

  const keepAll = process.argv.includes('--full');

  const db = await freshDb();

  // ---- stardict table ----
  const rows = parseCsv(csvText);
  const header = rows.shift() ?? [];
  const col = {};
  header.forEach((name, idx) => (col[name.trim().toLowerCase()] = idx));
  const get = (r, name) => (col[name] != null ? r[col[name]] ?? '' : '');

  const insertWord = db.prepare(
    `INSERT OR IGNORE INTO stardict
       (word, phonetic, definition, translation, pos, collins, oxford, tag, exchange)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.exec('BEGIN');
  let wordCount = 0;
  let skipped = 0;
  for (const r of rows) {
    const word = get(r, 'word').trim();
    if (!word) continue;
    const collins = toInt(get(r, 'collins'));
    const oxford = toInt(get(r, 'oxford'));
    const tag = get(r, 'tag').trim();
    const frq = toInt(get(r, 'frq'));
    const bnc = toInt(get(r, 'bnc'));
    // 精简版: keep exam-tagged / Collins / Oxford-core words plus the most
    // frequent FREQ_LIMIT ranks. --full keeps everything.
    const common =
      tag !== '' ||
      collins > 0 ||
      oxford > 0 ||
      (frq > 0 && frq <= FREQ_LIMIT) ||
      (bnc > 0 && bnc <= FREQ_LIMIT);
    if (!keepAll && !common) {
      skipped++;
      continue;
    }
    insertWord.run(
      word,
      get(r, 'phonetic'),
      get(r, 'definition'),
      get(r, 'translation'),
      get(r, 'pos'),
      collins,
      oxford,
      tag,
      get(r, 'exchange'),
    );
    wordCount++;
  }
  db.exec('COMMIT');

  // ---- lemma table (variant -> base) ----
  // Each line: "base -> form1/form2/..."; we invert it so every inflected form
  // maps back to its base word for lookup fallback. Optional — skipped when the
  // lemma source is unavailable.
  const insertLemma = db.prepare(
    'INSERT OR IGNORE INTO lemma (variant, base) VALUES (?, ?)',
  );
  db.exec('BEGIN');
  let lemmaCount = 0;
  for (const rawLine of lemmaText.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const arrow = line.indexOf('->');
    if (arrow < 0) continue;
    const base = line.slice(0, arrow).trim();
    const body = line.slice(arrow + 2).trim();
    if (!base || !body) continue;
    for (const chunk of body.split('/')) {
      // Forms may carry a morphology tag like "went:pt" — keep the word only.
      const variant = chunk.split(':')[0].trim();
      if (!variant || variant.toLowerCase() === base.toLowerCase()) continue;
      insertLemma.run(variant, base);
      lemmaCount++;
    }
  }
  db.exec('COMMIT');

  db.close();

  console.log(
    `✔ built ${OUT_DB}\n  ${wordCount} words${skipped ? ` (精简版: skipped ${skipped} rare words)` : ''}, ${lemmaCount} lemma mappings`,
  );

  if (wordCount < 1000) {
    console.warn(
      `\n⚠ only ${wordCount} words were imported — the source ecdict.csv looks ` +
        `incomplete.\n  请下载完整的 ecdict.csv (~60MB) 放到 ` +
        `${SRC_DIR} 后重新运行。`,
    );
  }
}

main().catch((err) => {
  console.error('\n✗ build-ecdict failed:', err.message);
  process.exitCode = 1;
});
