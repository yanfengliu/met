/**
 * The parts library: parametric architectural parts for building the Met (docs/design/spec.md, Parts library).
 *
 * Every part is a pure function of its parameters, in metres, in local coordinates with +Y up and its front toward +Z; its header states its origin.
 * Equal parameters return the identical cached object (geometry, or a frozen record of geometries keyed by material role), so `kit.add` batches every piece of one shape into one instanced mesh.
 * Never mutate or dispose a returned geometry: place it with the piece's matrix.
 */
export { along, type AlongOptions } from './along.js';
export { baluster, balustrade, type Balustrade, type BalusterParams, type BalustradeParams } from './balustrade.js';
export { archivolt, keystone, spandrel, voussoirs, type ArchivoltParams, type KeystoneParams, type SpandrelParams, type VoussoirParams } from './arch.js';
export { MeshBuilder, type V2, type V3 } from './builder.js';
export { cacheSize } from './cache.js';
export {
  atticBase,
  capital,
  column,
  columnParts,
  ORDER_PROPORTIONS,
  ORDERS,
  pedestal,
  shaft,
  type AtticBaseParams,
  type CapitalParams,
  type ColumnParams,
  type ColumnParts,
  type Order,
  type PedestalParams,
  type ShaftParams,
} from './column.js';
export { corniceRun, dentil, entablature, modillion, moulding, type CorniceRun, type CorniceRunParams, type DentilParams, type EntablatureParams, type ModillionParams, type MouldingParams, type ProfileName } from './cornice.js';
export { barrelVault, dome, drum, pendentives, type BarrelVaultParams, type DomeParams, type DrumParams, type PendentiveParams } from './dome.js';
export { cavettoCorniceProfile, papyriformColumn, pylon, type CavettoCorniceParams, type PapyriformColumnParams, type PapyrusCapital, type PylonDoor, type PylonParams } from './egyptian.js';
export {
  curtainWall,
  hippedSkylight,
  laylight,
  oculusLight,
  pyramidSkylight,
  ridgeSkylight,
  type CurtainWallParams,
  type Glazing,
  type HippedSkylightParams,
  type LaylightParams,
  type OculusLightParams,
  type PyramidSkylightParams,
  type RidgeSkylightParams,
} from './glazing.js';
export { bench, lampPost, urn, type Bench, type BenchParams, type LampPost, type LampPostParams, type Urn, type UrnParams } from './fittings.js';
export { fountain, hedge, tree, type Fountain, type FountainJets, type FountainParams, type HedgeParams, type Tree, type TreeParams } from './landscape.js';
export { type Detail } from './params.js';
export { pilaster, pilasterParts, type PilasterParams, type PilasterParts } from './pilaster.js';
export { ProfilePen, type Profile } from './profile.js';
export {
  architraveProfile,
  baseMouldingProfile,
  corniceProfile,
  friezeProfile,
  parapetCapProfile,
  plinthProfile,
  stackProfiles,
  stringCourseProfile,
  type CorniceProfileParams,
  type ParapetCapParams,
  type ProfileSize,
} from './profiles.js';
export { stairFlight, stairLanding, type StairFlight, type StairFlightParams, type StairLandingParams } from './stair.js';
export { surround, type HeadKind, type SurroundParams } from './surround.js';
export { lathe, sweep, type LatheOptions, type SweepOptions } from './sweep.js';
export { openingOutline, wall, type Opening, type OpeningShape, type Rustication, type WallParams } from './wall.js';
export { doorUnit, windowUnit, type DoorParams, type DoorParts, type WindowParams, type WindowParts } from './window.js';
