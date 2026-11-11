/**
 * The American Wing's 1980 steps, chapter `roche-north-1980`, in constructional order (docs/research/history.md section 7; interior.md, the Engelhard Court):
 * foundations, the limestone walls round the 1924 core, the gallery floors, then the court (floor, colonnades and balconies, loggia, sculpture),
 * and last the glass: the roofs, the court's ribbed glass roof and the west curtain wall, so the interior shows before it is enclosed.
 */
import type { StepDef } from '../../build/types.js';
import { engelhardCollectionStep } from '../collection/spaces-a.js';
import { americanFloors, americanFoundations, americanRoofs, americanWalls } from './american.js';
import { engelhardColonnades, engelhardCurtain, engelhardFloor, engelhardGlassRoof, engelhardLoggia, engelhardSculpture } from './engelhard.js';

const CHAPTER = 'roche-north-1980';

export const americanSteps: readonly StepDef[] = [
  {
    id: 'american-foundations',
    chapter: CHAPTER,
    year: '1977',
    title: 'Foundations of the new American Wing',
    detail: 'Roche Dinkeloo wrap the 1924 wing on its park side: footings, retaining walls and a main-floor slab round the old core.',
    build: americanFoundations,
  },
  {
    id: 'american-walls',
    chapter: CHAPTER,
    year: '1978',
    title: 'Limestone walls round the 1924 core',
    detail: "Limestone faces the park on the west and north, with a band of clerestory windows high on the north wall; the court's end walls rise.",
    build: americanWalls,
  },
  {
    id: 'american-floors',
    chapter: CHAPTER,
    year: '1979',
    title: 'Gallery floors of the American Wing',
    detail: 'Columns and the mezzanine and second-floor plates of the galleries that surround the court and the 1924 period rooms.',
    build: americanFloors,
  },
  {
    id: 'engelhard-floor',
    chapter: CHAPTER,
    year: '1980',
    title: 'Engelhard Court floor, terrace and beds',
    detail: 'Stone paving, a terrace before the bank facade with a flight between two raised planting beds, and a small pool in the southern half.',
    build: engelhardFloor,
  },
  {
    id: 'engelhard-colonnades-balconies',
    chapter: CHAPTER,
    year: '1980',
    title: 'Colonnades and glass-fronted balconies',
    detail: 'White tubular columns line the court; balconies over the park-side cafe and the east walk overlook it behind glass fronts (added 2009).',
    build: engelhardColonnades,
  },
  {
    id: 'engelhard-loggia',
    chapter: CHAPTER,
    year: '1980',
    title: "Tiffany's loggia from Laurelton Hall",
    detail: "Louis Comfort Tiffany's loggia (about 1905) from his Long Island house: limestone columns with capitals of Favrile glass, at the court's south end.",
    build: engelhardLoggia,
  },
  {
    id: 'engelhard-sculpture',
    chapter: CHAPTER,
    year: '1980',
    title: 'Diana and the lamp standards',
    detail: "Saint-Gaudens' gilded Diana high on her pedestal, and cast-iron lamp standards before the bank facade and along the colonnades.",
    build: engelhardSculpture,
  },
  engelhardCollectionStep,
  {
    id: 'american-roofs',
    chapter: CHAPTER,
    year: '1980',
    title: 'Roofs and the ribbed glass gallery roof',
    detail: 'Flat roofs over the galleries and ribbed glazing over the north-west galleries, falling in a glass lean-to to the park wall.',
    build: americanRoofs,
  },
  {
    id: 'engelhard-glass-roof',
    chapter: CHAPTER,
    year: '1980',
    title: 'The glass roof of the Engelhard Court',
    detail: 'Seven glazed ridges on white tubular trusses, 70 ft over the court floor, with glass lean-tos down to the park wall and over the east walk.',
    build: engelhardGlassRoof,
  },
  {
    id: 'engelhard-curtain-wall',
    chapter: CHAPTER,
    year: '1980',
    title: 'The west curtain wall facing the park',
    detail: 'A wall of reflecting glass closes the court toward Central Park; the wing opened on 11 June 1980. A glazed slot joins it to the Sackler Wing.',
    build: engelhardCurtain,
  },
];
