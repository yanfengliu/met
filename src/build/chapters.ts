/**
 * The chapter list, in build order (docs/design/spec.md, Build-step API). `src/build/sequence.ts` composes each chapter's steps in this order.
 * Owner: the coordinator. Chapters are historical eras (docs/research/history.md); a chapter may have no steps yet, and the page shows it disabled.
 * `site` is special: `solo=<chapter>` builds that chapter plus `site` (docs/design/spec.md, Query contract).
 */
import type { Chapter } from './types.js';

export const CHAPTERS = [
  { id: 'site', title: 'The site', years: 'before 1872', summary: "The ground the museum stands on: the park's terrain, Fifth Avenue and its sidewalks." },
  { id: 'vaux-mould-1880', title: 'The first building', years: '1874–1880', summary: "Vaux and Mould's brick Gothic building in the park, the core everything else wraps." },
  { id: 'weston-tuckerman-1894', title: 'The first wings', years: '1884–1894', summary: "Weston's south wing and Tuckerman's north wing extend the brick building." },
  { id: 'hunt-1902', title: "Hunt's Fifth Avenue front", years: '1895–1902', summary: 'The Beaux-Arts pavilion, Great Hall and Grand Staircase that turned the museum to face Fifth Avenue.' },
  { id: 'mckim-mead-white-1926', title: 'The Fifth Avenue wings', years: '1904–1939', summary: 'McKim, Mead & White complete the thousand-foot front; the American Wing and the Medieval Sculpture Hall follow.' },
  { id: 'roche-steps-lehman-1975', title: 'The master plan begins', years: '1967–1975', summary: 'Roche Dinkeloo rebuild the front steps and add the Lehman Wing on the axis.' },
  { id: 'roche-north-1980', title: 'North on the park', years: '1975–1981', summary: "The Sackler Wing for the Temple of Dendur, the American Wing's glass court and the Astor Court." },
  { id: 'roche-south-1990', title: 'South on the park', years: '1979–1991', summary: 'The Rockefeller, Wallace and Kravis wings close the south side, with the roof garden on top.' },
  { id: 'koch-plaza-2014', title: 'The plaza and renewals', years: '2007–2023', summary: "The Greek and Roman court's upper storey, the new plaza and the renewed skylights finish the present-day building." },
] as const satisfies readonly Chapter[];

export type ChapterId = (typeof CHAPTERS)[number]['id'];

/** The chapter `solo` always keeps. */
export const SITE_CHAPTER: ChapterId = 'site';
