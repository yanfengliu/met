/**
 * Chapter `vaux-mould-1880`: Calvert Vaux and Jacob Wrey Mould's building, ground broken 1874, opened 30 March 1880 (history.md section 2),
 * block core-1880-a (X ±14.5, Z −138.3..−66.79). Steps follow history.md's proposal in constructional order: foundations, walls, the west front,
 * the iron frame and floors, openings and trim, the central hall, the skylit upper galleries, and the roofs last.
 */
import type { StepDef } from '../../build/types.js';
import { westFrontHeads, westFrontTrim, westFrontWall, westFrontWindows } from './vaux-front.js';
import { vauxGalleries, vauxRoof } from './vaux-roof.js';
import { vauxFoundations, vauxHall, vauxIronFrame, vauxSideTrim, vauxWalls } from './vaux-shell.js';

const CHAPTER = 'vaux-mould-1880';

export const vauxSteps: readonly StepDef[] = [
  {
    id: 'vaux-foundations',
    chapter: CHAPTER,
    year: '1874–1877',
    title: 'Dig the foundations and basement',
    detail: 'Strip footings under every wall of the first building, pads for the iron columns and the basement floor, laid from the park side east.',
    build: vauxFoundations,
  },
  {
    id: 'vaux-walls',
    chapter: CHAPTER,
    title: 'Raise the red-brick walls',
    detail: 'The long side walls rise bay by bay on the rhythm of the central hall, with their pointed arches, and the east wall closes the block.',
    build: vauxWalls,
  },
  {
    id: 'vaux-west-front',
    chapter: CHAPTER,
    title: 'Build the west front and its entrance',
    detail: 'The park front: five tall arched openings over a rusticated ground storey, the entrance on the axis, with granite bands and a cornice. It survives inside the Lehman Wing.',
    build(kit) {
      westFrontWall(kit);
      westFrontTrim(kit);
    },
  },
  {
    id: 'vaux-iron-frame',
    chapter: CHAPTER,
    title: "Set Radford's iron frame and the floors",
    detail: 'Cast-iron columns carry the main and second floors; the iron staircases at the west end climb to the upper galleries.',
    build: vauxIronFrame,
  },
  {
    id: 'vaux-openings',
    chapter: CHAPTER,
    title: 'Glaze the windows and set the granite trim',
    detail: 'Windows fill the west front’s outer arches and the ground storey; granite heads and bands finish the fronts and side walls; brick fills the east arches round their corridors.',
    build(kit) {
      westFrontWindows(kit);
      westFrontHeads(kit);
      vauxSideTrim(kit);
    },
  },
  {
    id: 'vaux-hall',
    chapter: CHAPTER,
    title: 'Frame the central hall',
    detail: 'The hall between the two pavilions gets its end walls with arches and round windows, and an iron frame of posts and trusses for its raised roof.',
    build: vauxHall,
  },
  {
    id: 'vaux-galleries',
    chapter: CHAPTER,
    title: 'Partition the skylit upper galleries',
    detail: 'Picture galleries on the second floor, today European Paintings, each under a laylight frame.',
    build: vauxGalleries,
  },
  {
    id: 'vaux-roof',
    chapter: CHAPTER,
    title: 'Close the roofs round the gallery skylights',
    detail: 'Flat roofs with a ridge skylight over each gallery, and the raised lead roof over the central hall. The building opens on 30 March 1880.',
    build: vauxRoof,
  },
];
