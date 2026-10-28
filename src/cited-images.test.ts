/**
 * Every reference photograph a model source cites is recorded as viewed: a model source may cite a photograph only once `docs/research/` records it as
 * viewed and says what it shows (docs/learning/gate-proofs.md, "A cited reference photograph must be recorded as viewed"). Bounds of what a green result proves:
 *
 *   1. Citations. Every text file under `src/model/` is read. A citation is an image index's name, `interior-images.md` or `exterior-images.md`, with or
 *      without `docs/research/` before it, then a space and the entries' IDs, each written `#<ID>` and joined by `, ` or ` and `:
 *      `interior-images.md #33`, `interior-images.md #33 and #35`, `docs/research/exterior-images.md #E39, #E40 and #E41`.
 *      An ID is one to three digits, or a capital letter and one to three digits (`#P6`, `#E43`).
 *      - Every mention of either name must be a citation: a mention without an ID after it fails, so a citation cannot fall back into prose.
 *      - A line break is read through when the next line goes on with a `*` or `//` comment marker, so a comment may break between the name and its IDs.
 *      - No ID may follow the list without its `#` (` and 42`, `, 7 and 8`, ` to 17`, `–40`, `..40`, each followed by `,`, `;`, `:`, `)`, a full stop,
 *        `and`, `to` or the end), and the rest of the citation's clause, up to a `)`, a `;`, the end of a line or the next mention, may hold no other
 *        `#<ID>`: write every ID as `#<ID>`, together after the name. A full stop does not end the clause, so initials (`J.-C.`) and `fig. 110` hide nothing.
 *        The IDs and the clause are read within 400 characters of the mention.
 *      - Blind spots: a photograph cited without its index's name (by author and year, by file name, or as a bare `P8` or `#33`) is not read, nor is any
 *        file outside `src/model/`.
 *
 *   2. Entries. An entry is a line of its index that starts with its ID: `P1.` or `33.` in interior-images.md, `### 9.`, `10.` or `- [E39]` in
 *      exterior-images.md. A `###` entry's text runs to the next heading or entry; any other entry is its own line, as the indexes keep one line per
 *      paragraph.
 *      - Each ID is unique in its index.
 *
 *   3. Viewed. A cited entry must be marked viewed: a sentence of its text is the mark, `Viewed`, then optionally `at full size` or `at 1:1` and a date,
 *      then `.` or `:` (`Viewed.`, `Viewed at full size (2026-10-28).`, `Viewed 2026-10-28:`), or an exterior primary's heading line says
 *      `(primary, viewed)`. `Not viewed`, or neither mark, is unviewed; a sentence such as "Viewed from the north, ..." is no mark, and neither is
 *      `(primary, viewed)` anywhere but a `###` entry's heading line.
 *      - An entry with both marks fails, cited or not.
 *      - The gate checks the mark, not what the photograph shows: that is the entry's own text, and the visual audit compares the model with the
 *        photographs it cites (docs/policies/local-rules.md).
 *
 *   4. Anti-vacuity. `src/model/` must hold text files, each index must parse to entries, and each index must be cited, so a renamed index, a broken
 *      walk or a broken parser fails instead of reporting "passed" for "did not run". The detectors also run on synthetic input below, each seen to fail.
 *
 * This file reads the repository's own sources and docs from disk and imports nothing from the app. It needs no browser.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_ROOT = 'src/model';
const INDEXES = ['interior-images.md', 'exterior-images.md'] as const;
type IndexName = (typeof INDEXES)[number];
const BINARY_PROBE_BYTES = 8000;

/** A mention of either index, its optional path included. */
const MENTION = /(?:docs\/research\/)?((?:interior|exterior)-images\.md)/g;
/** The IDs straight after a mention: ` #33`, ` #33 and #35`, ` #E39, #E40 and #E41`. */
const ID_LIST = /^ #([A-Z]?\d{1,3})\b(?:(?:, | and |, and )#[A-Z]?\d{1,3}\b)*/;
const ID = /#([A-Z]?\d{1,3})\b/g;
/** An ID written without its `#` straight after the list, or a range: ` and 42`, `, 7 and 8`, ` to 17`, `–40`, `..40`. */
const BARE_ID = /^(?:,? and |, | to |\s?[–—-]\s?|\.\.)[A-Z]?\d{1,3}(?=\s*(?:[,;:)]|\.(?:\s|$)|and\b|to\b|$))/;
/** Where a citation's clause ends: a `)`, a `;`, a line's end or the next mention. A full stop does not, as initials and abbreviations hold one. */
const CLAUSE_END = /[);\r\n]|(?:interior|exterior)-images\.md/;
/** A line break inside a comment, with the next line's marker: read through as one space. */
const COMMENT_BREAK = /\r?\n[ \t]*(?:\*(?!\/)|\/\/)[ \t]*/g;
/** How far past a mention its IDs and clause are read. */
const LOOKAHEAD = 400;

const ENTRY = /^(?:(### )?([A-Z]?\d{1,3})\. |- \[([A-Z]\d{1,3})\] )/;
const VIEWED = /(?:^|\.\s)Viewed(?: at (?:full size|1:1))?(?: \(\d{4}-\d{2}-\d{2}\)| \d{4}-\d{2}-\d{2})?[.:]/;
/** An exterior primary's mark, read on its `###` heading line only. */
const PRIMARY_VIEWED = /\(primary, viewed\)/;
const NOT_VIEWED = /\bNot viewed\b/;

interface SourceFile {
  /** Repository-relative, always with `/` separators. */
  readonly path: string;
  readonly text: string;
}

interface Citation {
  readonly path: string;
  readonly line: number;
  readonly index: IndexName;
  readonly ids: readonly string[];
}

interface Entry {
  readonly id: string;
  readonly line: number;
  readonly viewed: boolean;
  readonly unviewed: boolean;
}

interface Scan {
  readonly citations: readonly Citation[];
  readonly problems: readonly string[];
}

function compareNames(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function walk(directory: string, files: SourceFile[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort(compareNames)) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile()) {
      const bytes = readFileSync(absolute);
      if (bytes.subarray(0, BINARY_PROBE_BYTES).includes(0)) continue;
      files.push({ path: relative(REPO_ROOT, absolute).split(sep).join('/'), text: bytes.toString('utf8') });
    }
  }
}

/** Every text file under `src/model/`. A missing or empty directory throws, so the gate cannot pass without reading it. */
function loadModelSources(): SourceFile[] {
  const absolute = join(REPO_ROOT, MODEL_ROOT);
  if (!existsSync(absolute)) throw new Error(`${MODEL_ROOT}/ does not exist, so this gate would read no citation: restore it, or point MODEL_ROOT in src/cited-images.test.ts at the model's sources.`);
  const files: SourceFile[] = [];
  walk(absolute, files);
  if (files.length === 0) throw new Error(`${MODEL_ROOT}/ holds no text files, so this gate would read no citation: restore the model's sources, or mend walk() in src/cited-images.test.ts if they are there.`);
  return files;
}

function loadIndex(index: IndexName): string {
  const path = join(REPO_ROOT, 'docs', 'research', index);
  if (!existsSync(path)) throw new Error(`docs/research/${index} does not exist, so no citation of it can be checked: restore it, or rename it in INDEXES and in every citation of it in the same commit.`);
  return readFileSync(path, 'utf8');
}

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function snippet(text: string): string {
  const flat = text.replace(COMMENT_BREAK, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
}

/** Every mention of either index in the sources, as a citation or a problem naming its place. */
function scanCitations(files: readonly SourceFile[]): Scan {
  const citations: Citation[] = [];
  const problems: string[] = [];
  for (const { path, text } of files) {
    for (const mention of text.matchAll(MENTION)) {
      const index = mention[1] as IndexName;
      const end = mention.index + mention[0].length;
      const line = lineOf(text, mention.index);
      const rest = text.slice(end, end + LOOKAHEAD).replace(COMMENT_BREAK, ' ');
      const list = ID_LIST.exec(rest);
      if (list === null) {
        problems.push(`${path}:${String(line)} names ${index} without an entry ID after it ("${snippet(text.slice(mention.index, end + 60))}"): cite the photograph as \`${index} #<ID>\`, its entry's number or label; if the text cites no photograph, reword it without the index's name.`);
        continue;
      }
      const ids = [...list[0].matchAll(ID)].map((m) => m[1] ?? '');
      const cited = ids.map((id) => `#${id}`).join(', ');
      const after = rest.slice(list[0].length);
      const bare = BARE_ID.exec(after);
      if (bare !== null) {
        problems.push(`${path}:${String(line)} cites ${index} ${cited}, then writes "${bare[0].trim()}" without its #: write each ID as #<ID>, and a range as every ID in it, as in \`${index} #37, #38, #39 and #40\`.`);
      }
      const stop = CLAUSE_END.exec(after);
      const clause = stop === null ? after : after.slice(0, stop.index);
      const stray = [...clause.matchAll(ID)].map((m) => `#${m[1] ?? ''}`);
      if (stray.length > 0) {
        problems.push(`${path}:${String(line)} cites ${index} ${cited}, and the same clause holds ${stray.join(', ')} apart from them ("${snippet(rest.slice(0, list[0].length + clause.length))}"): write every ID together after the index's name, as in \`${index} #33 and #35\`.`);
      }
      citations.push({ path, line, index, ids });
    }
  }
  return { citations, problems };
}

/** The index's entries by ID, and its problems: a repeated ID or an entry marked both viewed and not viewed. */
function parseEntries(index: IndexName, text: string): { entries: Map<string, Entry>; problems: string[] } {
  const lines = text.split(/\r?\n/);
  const entries = new Map<string, Entry>();
  const problems: string[] = [];
  lines.forEach((line, i) => {
    const match = ENTRY.exec(line);
    if (match === null) return;
    const id = match[2] ?? match[3] ?? '';
    const heading = match[1] !== undefined;
    let body = line.slice(match[0].length);
    if (heading) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j] ?? '';
        if (next.startsWith('#') || ENTRY.test(next)) break;
        body += `\n${next}`;
      }
    }
    const entry = { id, line: i + 1, viewed: VIEWED.test(body) || (heading && PRIMARY_VIEWED.test(line)), unviewed: NOT_VIEWED.test(body) };
    const twin = entries.get(id);
    if (twin !== undefined) problems.push(`${index} has two entries with the ID ${id}, lines ${String(twin.line)} and ${String(entry.line)}: give each entry its own number or label.`);
    else entries.set(id, entry);
    if (entry.viewed && entry.unviewed) problems.push(`${index}:${String(entry.line)}, entry ${id}, is marked both viewed and "Not viewed": keep the mark that holds.`);
  });
  return { entries, problems };
}

/** Each cited ID that names no entry, or an entry not marked viewed. */
function unviewedCitations(citations: readonly Citation[], entries: ReadonlyMap<IndexName, ReadonlyMap<string, Entry>>): string[] {
  const problems: string[] = [];
  for (const { path, line, index, ids } of citations) {
    for (const id of ids) {
      const entry = entries.get(index)?.get(id);
      if (entry === undefined) {
        problems.push(`${path}:${String(line)} cites ${index} #${id}, but ${index} has no entry ${id}: add the photograph to the index, viewed and with what it shows, or cite the entry that holds it.`);
      } else if (!entry.viewed) {
        problems.push(`${path}:${String(line)} cites ${index} #${id}, which ${index}:${String(entry.line)} does not mark viewed${entry.unviewed ? ' ("Not viewed")' : ''}: view the photograph at full size, record in its entry what it shows and mark it "Viewed"; if the model does not rest on it, drop the citation.`);
      }
    }
  }
  return problems;
}

interface RepositoryCheck {
  readonly problems: readonly string[];
  readonly citations: readonly Citation[];
  readonly entries: ReadonlyMap<IndexName, ReadonlyMap<string, Entry>>;
}

/** The whole gate over the repository: every problem, and what it read. */
function checkRepository(): RepositoryCheck {
  const scan = scanCitations(loadModelSources());
  const entries = new Map<IndexName, Map<string, Entry>>();
  const problems = [...scan.problems];
  for (const index of INDEXES) {
    const parsed = parseEntries(index, loadIndex(index));
    entries.set(index, parsed.entries);
    problems.push(...parsed.problems);
  }
  problems.push(...unviewedCitations(scan.citations, entries));
  return { problems, citations: scan.citations, entries };
}

let checked: RepositoryCheck | undefined;
/** The repository read once, for both tests that read it. */
function repository(): RepositoryCheck {
  checked ??= checkRepository();
  return checked;
}

/** Reading `src/model/` takes about 0.2 s warm; a fresh worktree under load reads the repository's files far slower (src/repo-conventions.test.ts). */
const READ_TIMEOUT_MS = 30_000;

describe('cited reference images', () => {
  it('marks viewed every image a file under src/model/ cites from interior-images.md or exterior-images.md', () => {
    expect(repository().problems).toEqual([]);
  }, READ_TIMEOUT_MS);

  it('reads entries from both indexes and citations of both from the model', () => {
    const { citations, entries } = repository();
    for (const index of INDEXES) {
      expect(entries.get(index)?.size ?? 0, `${index} parses to no entries: an entry starts its line with its ID (P1., 33., ### 9., - [E39]); restore that form, or mend ENTRY in src/cited-images.test.ts`).toBeGreaterThan(0);
      expect(citations.filter((c) => c.index === index).length, `no file under src/model/ cites ${index}: if none should, drop it from INDEXES in src/cited-images.test.ts; if some do, the scan is broken`).toBeGreaterThan(0);
    }
  }, READ_TIMEOUT_MS);
});

describe('cited reference image detectors', () => {
  const source = (path: string, text: string): SourceFile => ({ path, text });

  it('reads a citation in each form the header names, through a comment line break', () => {
    const { citations, problems } = scanCitations([
      source('src/model/a.ts', '/** Its roof (interior-images.md #33 and #35: Benoist 2012 and Haklai 2012) and #dcd8d0. */\n'),
      source('src/model/b.ts', '// docs/research/exterior-images.md #E39, #E40 and #E41.\n// trim (exterior-images.md #9).\n'),
      source('src/model/c.ts', '/**\r\n * After the court photograph (interior-images.md\r\n * #33, J.-C. Benoist 2012) and the 1900 view (exterior-images.md #53):\r\n */\r\n'),
      source('src/model/d.ts', '/** E: the water (DP244278, interior-images.md #16, the east end; 0.2 m in Marfaing 2017, interior-images.md #37). */\n'),
      source('src/model/e.ts', '// walls #5a524c (interior-images.md #P6, #12, and #44: pedestals #8e7d70)\n'),
      source('src/model/f.ts', '  // the court, interior-images.md #35\n  const tag = \'#12\';\n'),
      source('src/model/g.ts', '/** The gate (interior-images.md #16, 3.35 m deep) and its post (interior-images.md #13, 5 m from it). */\n'),
    ]);
    expect(problems).toEqual([]);
    expect(citations.map(({ path, line, index, ids }) => [path, line, index, ids.join(' ')])).toEqual([
      ['src/model/a.ts', 1, 'interior-images.md', '33 35'],
      ['src/model/b.ts', 1, 'exterior-images.md', 'E39 E40 E41'],
      ['src/model/b.ts', 2, 'exterior-images.md', '9'],
      ['src/model/c.ts', 2, 'interior-images.md', '33'],
      ['src/model/c.ts', 3, 'exterior-images.md', '53'],
      ['src/model/d.ts', 1, 'interior-images.md', '16'],
      ['src/model/d.ts', 1, 'interior-images.md', '37'],
      ['src/model/e.ts', 1, 'interior-images.md', 'P6 12 44'],
      ['src/model/f.ts', 1, 'interior-images.md', '35'],
      ['src/model/g.ts', 1, 'interior-images.md', '16'],
      ['src/model/g.ts', 1, 'interior-images.md', '13'],
    ]);
  });

  it('fails a mention without IDs and an ID left apart from its citation', () => {
    const { citations, problems } = scanCitations([
      source('src/model/a.ts', '  // P6 (interior-images.md): the court\'s marbles\n'),
      source('src/model/b.ts', '/** Sources: the 2018 orthophoto (exterior-images.md, primary 9) and item 30 (interior-images.md, item 30). */\n'),
      source('src/model/c.ts', '/**\n * both Petrie Court photographs (interior-images.md #33, Benoist 2012, and #35, Haklai 2012) show it\n */\n'),
      source('src/model/d.ts', '  // see interior-images.md\n  const id = 33;\n'),
      source('src/model/e.ts', '/** The door (interior-images.md #33, J.-C. Benoist 2012, and #14) and the court (interior-images.md #43, Heckscher fig. 110, and #14). */\n'),
    ]);
    expect(citations.map(({ path, ids }) => [path, ids.join(' ')])).toEqual([
      ['src/model/c.ts', '33'],
      ['src/model/e.ts', '33'],
      ['src/model/e.ts', '43'],
    ]);
    const hint = (index: string): string => `cite the photograph as \`${index} #<ID>\`, its entry's number or label; if the text cites no photograph, reword it without the index's name.`;
    expect(problems).toEqual([
      `src/model/a.ts:1 names interior-images.md without an entry ID after it ("interior-images.md): the court's marbles"): ${hint('interior-images.md')}`,
      `src/model/b.ts:1 names exterior-images.md without an entry ID after it ("exterior-images.md, primary 9) and item 30 (interior-images.md, item 30). */"): ${hint('exterior-images.md')}`,
      `src/model/b.ts:1 names interior-images.md without an entry ID after it ("interior-images.md, item 30). */"): ${hint('interior-images.md')}`,
      'src/model/c.ts:2 cites interior-images.md #33, and the same clause holds #35 apart from them ("#33, Benoist 2012, and #35, Haklai 2012"): write every ID together after the index\'s name, as in `interior-images.md #33 and #35`.',
      `src/model/d.ts:1 names interior-images.md without an entry ID after it ("interior-images.md const id = 33;"): ${hint('interior-images.md')}`,
      'src/model/e.ts:1 cites interior-images.md #33, and the same clause holds #14 apart from them ("#33, J.-C. Benoist 2012, and #14"): write every ID together after the index\'s name, as in `interior-images.md #33 and #35`.',
      'src/model/e.ts:1 cites interior-images.md #43, and the same clause holds #14 apart from them ("#43, Heckscher fig. 110, and #14"): write every ID together after the index\'s name, as in `interior-images.md #33 and #35`.',
    ]);
  });

  it('fails an ID written without its # after the list, and a range', () => {
    const { citations, problems } = scanCitations([
      source('src/model/a.ts', '/** (interior-images.md #36 and 42; work unit 2) */\n'),
      source('src/model/b.ts', '/** (exterior-images.md #6, 7 and 8): no tree */\n'),
      source('src/model/c.ts', '/** (interior-images.md #37–40): the pool. (interior-images.md #37..40) (interior-images.md #12 to 17: the hall) */\n'),
    ]);
    expect(citations.map(({ path, ids }) => [path, ids.join(' ')])).toEqual([
      ['src/model/a.ts', '36'],
      ['src/model/b.ts', '6'],
      ['src/model/c.ts', '37'],
      ['src/model/c.ts', '37'],
      ['src/model/c.ts', '12'],
    ]);
    const bare = (path: string, index: string, cited: string, written: string): string =>
      `${path}:1 cites ${index} ${cited}, then writes "${written}" without its #: write each ID as #<ID>, and a range as every ID in it, as in \`${index} #37, #38, #39 and #40\`.`;
    expect(problems).toEqual([
      bare('src/model/a.ts', 'interior-images.md', '#36', 'and 42'),
      bare('src/model/b.ts', 'exterior-images.md', '#6', ', 7'),
      bare('src/model/c.ts', 'interior-images.md', '#37', '–40'),
      bare('src/model/c.ts', 'interior-images.md', '#37', '..40'),
      bare('src/model/c.ts', 'interior-images.md', '#12', 'to 17'),
    ]);
  });

  it('reads each form of entry and its mark', () => {
    const index = [
      '# Images',
      '',
      '"Viewed" means looked at; not viewed in a browser otherwise.',
      '',
      '### 9. NYC orthophoto 2018 — plan view (primary, viewed)',
      '',
      '- Tiles from the map service.',
      '- Shows the roofs.',
      '',
      '### 8. Park view (primary)',
      '',
      '- Shows the park. Viewed from the north it is wooded.',
      '',
      '### 6. Peel 2024 (primary)',
      '',
      '- Compare with #5 (primary, viewed).',
      '',
      '### 61. A heading entry (primary)',
      '62. https://example.org/f.jpg — someone, 2020. Viewed.',
      '',
      '## Other candidates',
      '',
      'P1. The hall. https://example.org/p1.jpg (CC0). Viewed. The camera stands on the balcony.',
      '10. https://example.org/a.jpg — someone, 2019. Viewed at full size 2026-10-28: the deck.',
      '11. https://example.org/b.jpg — someone, 2012. Not viewed. Informs: the facade.',
      '12. https://example.org/c.jpg — someone, 2012. Informs: the plaza.',
      '- [E39] https://example.org/e39.jpg — Epicgenius, 5184×3456. Viewed at 1:1 (2026-10-13). The corner.',
      '13. https://example.org/d.jpg. Not viewed. Viewed 2026-10-28: the porch.',
      '13. https://example.org/e.jpg. Viewed.',
      '14. https://example.org/g.jpg (primary, viewed).',
      '| 1 | `ref-front-axis` | Schneider 2019 frontal |',
    ].join('\r\n');
    const { entries, problems } = parseEntries('exterior-images.md', index);
    expect([...entries.values()].map(({ id, line, viewed, unviewed }) => [id, line, viewed, unviewed])).toEqual([
      ['9', 5, true, false],
      ['8', 10, false, false],
      ['6', 14, false, false],
      ['61', 18, false, false],
      ['62', 19, true, false],
      ['P1', 23, true, false],
      ['10', 24, true, false],
      ['11', 25, false, true],
      ['12', 26, false, false],
      ['E39', 27, true, false],
      ['13', 28, true, true],
      ['14', 30, false, false],
    ]);
    expect(problems).toEqual([
      'exterior-images.md:28, entry 13, is marked both viewed and "Not viewed": keep the mark that holds.',
      'exterior-images.md has two entries with the ID 13, lines 28 and 29: give each entry its own number or label.',
    ]);
  });

  it('fails a citation of an entry that is missing or not marked viewed, and passes a viewed one', () => {
    const entry = (id: string, line: number, viewed: boolean, unviewed: boolean): [string, Entry] => [id, { id, line, viewed, unviewed }];
    const entries = new Map<IndexName, Map<string, Entry>>([
      ['interior-images.md', new Map([entry('29', 95, false, true), entry('33', 105, true, false)])],
      ['exterior-images.md', new Map([entry('49', 170, false, false)])],
    ]);
    const cite = (path: string, line: number, index: IndexName, ids: string[]): Citation => ({ path, line, index, ids });
    const fix = 'view the photograph at full size, record in its entry what it shows and mark it "Viewed"; if the model does not rest on it, drop the citation.';
    expect(
      unviewedCitations(
        [
          cite('src/model/core/choir-screen.ts', 4, 'interior-images.md', ['29']),
          cite('src/model/core/weston-facade.ts', 3, 'interior-images.md', ['33']),
          cite('src/model/core/vaux-front.ts', 6, 'exterior-images.md', ['49', '61']),
        ],
        entries,
      ),
    ).toEqual([
      `src/model/core/choir-screen.ts:4 cites interior-images.md #29, which interior-images.md:95 does not mark viewed ("Not viewed"): ${fix}`,
      `src/model/core/vaux-front.ts:6 cites exterior-images.md #49, which exterior-images.md:170 does not mark viewed: ${fix}`,
      'src/model/core/vaux-front.ts:6 cites exterior-images.md #61, but exterior-images.md has no entry 61: add the photograph to the index, viewed and with what it shows, or cite the entry that holds it.',
    ]);
  });
});
