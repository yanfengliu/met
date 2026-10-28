# Interior research

The Met's main public interior spaces, written for the modeller: where each space sits in the world frame, how big it is, what it is built of, what colour it is, how it is lit, and what landmark objects define it. Reference photographs are indexed in `interior-images.md` (P1 to P9 are the primary ones). The exterior, footprint and building history are covered separately by the exterior research.

Three kinds of number appear, and each is labelled. Measured: stated by a source, which is cited (with a short quotation where the wording matters). Derived: computed from measured values or from the floor map, with the working shown. Estimate: judged from a photograph or a schematic drawing, with the photo named and a confidence. Almost all plan positions are derived from the Met's own floor map, so they carry that map's accuracy, discussed next.

Sources cited by short name:

- Map: the Met's floor map, https://maps.metmuseum.org/ (Living Map platform), read from its vector tiles.
- LPC77: Landmarks Preservation Commission, interior designation report for the Great Hall and Grand Stairway, LP-0972, 15 November 1977, http://s-media.nyc.gov/agencies/lpc/lp/0972.pdf.
- Heckscher: Morrison H. Heckscher, "The Metropolitan Museum of Art: An Architectural History", Metropolitan Museum of Art Bulletin, Summer 1995, https://resources.metmuseum.org/resources/metpublications/pdf/The_Metropolitan_Museum_of_Art_An_Architectural_History_The_Metropolitan_Museum_of_Art_Bulletin_v_53_no_1_Summer_1995.pdf (printed page numbers). On 2026-10-28 that link served only a bot check; the publication's page, https://www.metmuseum.org/met-publications/mma-an-architectural-history-the-metropolitan-museum-of-art-bulletin-v-53-no-1-summer-1995, links its PDF (39.8 MB), which work unit 3 read.
- Aldred: Cyril Aldred, "The Temple of Dendur", Metropolitan Museum of Art Bulletin, Summer 1978, https://resources.metmuseum.org/resources/metpublications/pdf/The_Temple_of_Dendur_The_Metropolitan_Museum_of_Art_Bulletin_v_36_no_1_Summer_1978.pdf.
- Met API: the Met's collection API, https://collectionapi.metmuseum.org/public/collection/v1/objects/{id}.
- Tang LPC: the Tang Wing presentation to the Landmarks Preservation Commission, 22 April 2025, https://www.nyc.gov/assets/lpc/downloads/pdf/presentation-materials/20250422/1000-Fifth-Avenue-and-Central-Park.pdf.
- Wayfinding LPC: the wayfinding-signage presentation, 18 November 2025, https://www.nyc.gov/assets/lpc/downloads/pdf/presentation-materials/20251118/1000-Fifth-Avenue.pdf.

## Plan source and world frame

**Correction (coordinator, 2026-10-11): every Z in this file and in `interior-images.md` is in the floor map's own frame, which sits 3.1 m +Z of the world frame of `src/model/frame.ts`; subtract 3.1 m.** Found by the `mmw` modeller and checked against the data: in this file's frame the map's main-floor plate lies 1.21 to 1.23 m inside the OpenStreetMap outline at both X ends but 4.24 m inside at the park side and 1.92 m outside at the front; a Z shift of −3.08 m makes all four margins about 1.2 m, and puts the map's step foot at Z +20.08 against the elevation model's +20.0. X values and levels are unaffected. The `int-*` presets apply the shift in `src/viewer/presets.ts`.

The map's vector tiles (`https://prod.cdn.livingmap.com/tiles/the_met/{z}/{x}/{y}.pbf`) carry every floor's room, wall, column, stair, void ("open to below") and water outlines in latitude and longitude. I decoded the 18 tiles at zoom 18 that cover the building (quantisation 2.8 cm), merged features split across tiles, converted them to local metres and rotated them onto the Manhattan grid. A second, independent decode of the zoom-16 tiles by a helper agent gave the same room sizes to within 0.1 m. Tooling and decoded data stay outside the repo.

- Grid angle (derived): fitting the main-floor outline's edges gives grid north at a bearing of 29.00° east of true north; 84% of the outline's length lies within 0.1° of that grid, and most of the rest at exactly 45° (the Lehman Wing's chamfers). The OpenStreetMap outline of the building (way 278363061, NYC BIN 1083810) gives 29.0° independently.
- Great Hall axis, X = 0 (derived): the four coupled-column pairs of the Hunt facade, the outline of the front steps and the Great Hall itself are all symmetric about one line in the map, to within 0.03 m. The East 82nd Street centreline in OpenStreetMap falls on the same line to within 0.5 m.
- Facade plane, Z = 0 (derived): the main-floor plate's edge in the three arched bays, between the piers that stand behind the column pairs. The map shows those piers projecting 1.13 to 1.15 m forward of this line (Z 0 to +1.15), the coupled columns at Z +2.02 to +3.45 (drawn as 1.43 m squares, column centres at X ±6.98, ±10.30, ±24.87 and ±28.20, so 3.3 m apart within each pair), and the central door recess reaching Z +4.33. The map draws walls as lines with no thickness, so whether Z = 0 is the wall's outer face or its centre line cannot be read from it; I take it as the outer face of the main wall, ±1 m. The coordinator should reconcile it with the exterior research's facade plane.
- Map accuracy (estimate): rooms tile the floor without gaps, so a room edge may be a wall face or a wall centre line; allow ±1 m on room edges. Columns are drawn as uniform 0.72 m squares (the facade's as 1.43 m), so the map gives column positions, not sizes. Stair tread lines are evenly spaced at 0.70 to 0.75 m everywhere, which is schematic: do not count steps from the map. The map has no heights.
- Map floors: G (ground), 1 (main), 1M (mezzanine, only in the Greek and Roman, American and Modern wings), 2, 3, 4, 5.

Building extent (derived): the main-floor plate spans X -150.40 to +151.95 (302.35 m along Fifth Avenue) and Z -175.55 to +11.78 (187.33 m into the park); the OpenStreetMap outline gives 303.7 × 189.5 m; Heckscher (p. 5) gives the Fifth Avenue front as 1,000 ft (304.8 m) from 80th to 84th Street. Conflict: Wikipedia says the building is almost a quarter mile (400 m) long (https://en.wikipedia.org/wiki/The_Met_Fifth_Avenue), and the brief says roughly 400 × 200 m; the measured figure is about 303 m by 188 m, and the quarter mile is a rounding. The north and south end pavilions reach Z +11.78; the front steps reach Z +23.18.

## Floor levels

No source found states floor heights above the Fifth Avenue sidewalk directly. The provisional levels below are derived from two sources that do give vertical numbers. Check them against the exterior research's facade elevations before they go into `src/model/frame.ts`.

| Level | World Y (m) | Basis | Confidence |
|---|---|---|---|
| `LG`, ground floor | -2.34 | `L1` minus 21'-2" (6.45 m) | low-medium |
| `L1`, main floor (Great Hall floor) | +4.11 | total rise of the front steps, 13½ ft | medium-low |
| `L2`, second floor (Great Hall balcony) | +10.97 | `L1` plus 22'-6" (6.86 m) | medium-low |
| Roof ridge over the Great Hall | +33.38 | `L1` plus 96'-0" (29.26 m) | medium-low |

- Front steps, measured: Elle Decor gives the staircase as "13½ feet high" and "154 feet wide" ("The Complete History of the Met Steps", copy at https://www.aol.com/complete-history-met-steps-140000255.html). 13½ ft = 4.115 m and 154 ft = 46.94 m; the map's outline of the steps is 47.63 m wide (X ±23.82), within 0.7 m, which lends the figure some weight. `L1` = +4.11 assumes the plaza at the foot of the steps is at sidewalk grade and that the 13½ ft includes the three steps the map shows inside the central doorway (Z +2.2 to +3.6).
- Elevations, measured on drawings with an unstated datum: the Tang LPC sheets label GF +78'-0", L1 +99'-2" and L2 +121'-8" (PDF p. 70), and an elevation titled "Maintain Existing Museum Alignments" labels the Great Hall ridge at 195'-2" (PDF pp. 59–60). The labels came from text extracted from the drawing sheets and were paired by reading order, so a mis-pairing is possible. Derived: `L1` - `GF` = 21'-2" = 6.45 m; `L2` - `L1` = 22'-6" = 6.86 m; ridge - `L1` = 96'-0" = 29.26 m. This assumes the new wing's floors line up with the old building's, as the sheet title suggests.
- Storey check, measured: the main-floor ceiling height was 20'-6" in Wings A to D (Wing D is the 1902 Hunt wing) and 25 ft in all later wings (Heckscher p. 48; wing letters p. 78). A 20'-6" (6.25 m) ceiling plus about 2 ft of floor structure matches the 22'-6" floor-to-floor, so `L2` = `L1` + 6.86 m fits the Hunt core.
- The second floor is not level everywhere, measured: in 1908 the trustees had the second floor of the new north wing lowered to match the Hunt wing, and today steps and a ramp join second-floor galleries at different levels (Heckscher p. 48). Use one `L2` for the Hunt core and treat other wings' second floors as unknown offsets.

How the front steps reach the main floor: Kevin Roche John Dinkeloo and Associates rebuilt the steps with the plaza, finished in spring 1970 (Heckscher pp. 73, 75: "a three-way slope"; LPC77 p. 5 dates the new entrance and steps to 1969–70). The map shows a stepped platform descending on three sides, front and both ends, X ±23.82 at its foot, from the terrace before the doors (Z +4.33) out to Z +23.18, in three flights split by two landings about 1.7 m deep; three more steps sit inside the central doorway between the coupled columns. The riser count is not known (the map's treads are schematic): 13½ ft at a 6-inch riser would be 27 risers. Conflict: Elle Decor dates the steps to 1975; Heckscher and LPC77 give 1969–70.

## The Great Hall

Built 1897–1902 to Richard Morris Hunt's design and completed after his death by his son Richard Howland Hunt; foundations begun 1897, above-grade work 1898, structure finished by the end of 1901, opened on 22 December 1902 (LPC77 p. 3). Designated an interior landmark with the Grand Stairway in 1977.

Plan (derived from the map, world metres, main floor):

- Nave, the three-domed main volume: X -30.43 to +30.43 (60.86 m north-south) by Z -22.78 to -6.27 (16.51 m east-west). On the second floor the void over it is X -26.04 to +26.07 by Z -22.79 to -6.26 (52.11 × 16.53 m).
- Three bays along the nave, split by pier lines at X ±8.64: a central bay 17.28 m wide and two side bays 17.41 m wide (X ±8.64 to ±26.05), each about 17.3 × 16.5 m between wall lines, so near square: one saucer dome on pendentives per bay. Clear spans are smaller by the piers' projection into the hall, which the map does not show (estimate 1 to 2 m each side, from P1).
- End bays: X ±26.05 to ±30.43 (4.38 m deep), behind a screen of four columns on the line X = ±26.05, at Z -18.33, -15.80, -13.26 and -10.72 (2.53 m on centres), between short wall returns. The balcony crosses above each end bay, and above it is a large arch with a half-dome (P2). Three doors in each end wall lead on: north to the Egyptian galleries (gallery 100), south to the Greek and Roman galleries (gallery 150).
- Central openings on the long sides: a 12.0 m opening in each long wall (X -5.97 to +6.01), each with four columns at X -3.79, -1.26, +1.28 and +3.82 (on the lines Z -22.79 west and -6.27 east); two more columns stand in the entrance recess at Z 0.0 (X -1.26, +1.28). Each side bay has two 1.77 m doors in each long wall (centred near X ±12.2 and ±22.5).
- East zone, between the nave and the facade wall, Z -6.27 to 0: the entrance bay (X -8.64 to +8.64) with the door recess (X -4.72 to +4.69, out to Z +4.33); coat checks to the south (X -30.43 to -8.62); the Met Store to the north (X +8.64 to +26.06).
- West zone, Z -28.96 to -22.78: the staircase bay (X -8.63 to +8.65, Z -30.13 to -22.78); the ticketing hall to the south (X -26.04 to -8.63); a lift in the north-west corner (X +26.05 to +30.44, Z -33.33 to -28.94).
- Whole hall with both zones: X ±30.43 by Z -28.96 to 0 (60.86 × 28.96 m, about 200 × 95 ft). The second-floor balcony ring has the same footprint: balcony galleries 5.0 m deep on the west (Z -28.96 to -23.95) and east (Z -5.11 to 0) and 3.2 m at the ends, with a walkway about 1.2 m wide along the void (derived: walkway area 165 m² over a void perimeter of 137 m).
- Information desk: round, on the axis in the middle of the nave (P1; the map's marker is at X 0, Z -9.64). Diameter about 6 ± 1.5 m, estimated from P1 against people standing at it (low).

Sourced facts:

- Dimensions: no source found gives the hall's length, width or height, the domes' diameters or crown heights, or the skylights' sizes. The plan figures above are the best available.
- Form, measured: the hall rises two storeys "beneath three saucer domes with circular skylights" and is divided into three bays by piers carrying the arches that support the domes (LPC77 p. 4). Each dome rests on a plaster cornice on arches springing from massive masonry piers (Heckscher p. 35).
- Construction, measured: the Guastavino Company built the domes and vaulting in its thin-shell laminated-tile system (Heckscher p. 36).
- Domes, measured: panelled pendentives; each skylight ringed by wreath mouldings and Greek fret (LPC77 p. 4). McKim, Mead & White altered the skylights about 1907 to admit more light (Wayfinding LPC slide 7). Conflict: the brackets and swags at the dome bases were altered in the 1930s (LPC77 p. 4) or in 1906 by Charles McKim (Heckscher p. 35).
- Colonnades, measured: colonnades in the centre and end bays lead on to the rest of the building (Heckscher p. 35), each of four fluted columns with Ionic capitals (LPC77 p. 4). This confirms the map's four-column groups.
- Balcony, measured: a continuous balcony with a vaulted ceiling runs behind the balustrade (Heckscher p. 35); its vaults spring from the same piers that carry the domes (LPC77 p. 5).
- Windows, measured: large three-part window openings with rectilinear grilles fill the arches of the east (facade) wall (LPC77 p. 5).
- Niches and flowers, measured: four niches in the bases of the piers on the east and west walls, made for statues (LPC77 p. 4); the four centre piers' niches are pedimented and now hold flowers (Heckscher p. 35). Derived: one niche on the nave face of each pier on the lines X ±8.64. The flower endowment and the count of arrangements were not found in a readable source.
- Material, measured: warm-toned Indiana limestone throughout (LPC77 p. 4; Heckscher p. 36).
- Floor, measured: a "mosaic" of marble chips poured in sections framed by strips of yellow marble (Heckscher p. 36), with marble bands defining the patterns on both floors (LPC77 p. 5).
- Lighting, measured: large cast-bronze electric torchères stood in the corners and along the balustrade (Heckscher p. 36); those on the balcony parapet were later removed (Wayfinding LPC slide 7).
- Later changes, measured: Roche's 1968–70 renovation brought new lighting and made the present north and south coatrooms and their doorways (Heckscher p. 73; Wayfinding LPC slide 7). Ticket desks stood at the north, south and west entrances from the 1970s until 2020, when a ticketing hall was made under the balcony in the south-west quadrant (Wayfinding LPC slide 9), where the map shows it.
- Authorship, conflict: the National Register nomination says Hunt never drew the hall's interior or the stairs and that his son designed both (section 8 p. 2, https://npgallery.nps.gov/GetAsset/0fd04f26-474e-4342-bdac-193fc1793837); LPC77 and Heckscher treat the hall as Hunt's.

Heights (estimates, low confidence): the balcony floor is at `L2`, 6.86 m above the main floor. The main arches look semicircular in P1 and P2, so over a 16.5 m wall-line span they rise about 8.3 m; with their springing about 14 m above the main floor (judged from P2, a little above the balcony storey), their crowns are near 22 m, and a saucer dome rising 3 to 4 m above its pendentive ring puts the dome crowns at about 25 ± 3 m, each with a circular skylight at its crown. The roof ridge over the hall, 29.26 m above the main floor, bounds them from above.

Elements to model (P1, P2): four great piers on each long side, with pilasters and an entablature at balcony level, carrying round arches; the three saucer domes on panelled pendentives with a moulded base ring and a crown skylight; the balcony on all four sides with its stone balustrade (pierced roundels on the long sides, P1), carried at the ends by the four-column screens; the two end arches with painted half-domes; the round information desk with a tall arrangement in a central urn; the four pier niches with flowers; and a light buff floor with darker bands (pattern not mapped).

Materials and colours: photo samples are the median of a small patch of image pixels, read in the browser. P1 has a warm white balance and P2 a cool, dim one, so the suggested base colour is a judgement between them, lifted toward a plausible albedo.

| Surface | P2 sample | P1 sample | Suggested base | Confidence |
|---|---|---|---|---|
| Limestone walls and piers | #7e7262, #918c86 | #bca66b, #b79561 | #c8bca4 | medium |
| Pendentives and domes | #7b7158 | — | #c4b9a0 | medium |
| End half-domes (painted) | #774120 | #865112 | #b0663a | medium |
| Screen columns | #d8dbe0 | #dac38e | #d4cfc4 | medium |
| Balustrade | #aeaeae | #c3ad75 | #c4bdaa | medium |
| Floor field | — | #e5d093, #cbb179 | #d8ccb0 | low |

Lighting: daylight through the dome skylights and the three-part facade windows; pendant lanterns in the end bays below the balcony (P2); concealed and spot lighting on the domes and walls (P1, P2).

## The Grand Staircase

Part of the 1902 Hunt building; designated with the Great Hall in 1977.

Plan (derived from the map):

- The stair rises west from the Great Hall's west central bay. Its flight is X -3.69 to +3.69 (7.38 m between its side walls). On the main floor a landing at its foot runs Z -33.47 to -30.11; the second-floor map shows treads from Z -29.65 to -53.79 (24.1 m in plan) with one landing about 3.0 m deep between Z -46.78 and -43.77.
- Beside the stair on the second floor are two long galleries, 200 (X -9.75 to -3.68) and 201 (X +3.70 to +8.65), Z -56.67 to -28.93 (27.7 m); the stair hall is about 18.4 m wide overall.
- Top landing: a cross hall X -9.80 to +9.83 by Z -63.69 to -56.64 (19.6 × 7.1 m), giving onto the European Paintings galleries 600 and 601.
- Under the stair, on the main floor, the Byzantine galleries 300 to 303 fill X -8.68 to +8.62, Z -63.67 to -30.07, in a vaulted space (index 11).

Sourced facts:

- Form, measured: the stair rises in a broad sweep within a long narrow hall, between rusticated walls, "with a landing at mid point" (LPC77 p. 4): two flights and one landing. Conflict: the map puts the landing about two-thirds of the way up; trust LPC77 for the arrangement and the map for the overall extent.
- Upper level, measured: at the second floor an arcade of five arches on each side opens above the stair onto the side galleries (LPC77 p. 4). P3 shows the arches carried on tall fluted Corinthian columns, so six columns or responds a side.
- Ceiling, measured: an entablature with a modillioned cornice carries a barrel vault; above the landing a coved ceiling has a central panel that once held a skylight; Karl Bitter carved angels in the spandrels (LPC77 p. 4).
- Not found: the stair's width, step count, riser, going and tread material. Estimate: rising 6.86 m over about 21 m of going (24.1 m less the 3.0 m landing), the stair fits about 45 to 55 risers of 125 to 152 mm with goings of 0.39 to 0.48 m, the shallow, deep-treaded proportions of a monumental stair; this is not a count.
- The doorway into gallery 600 (work unit 2, M1, checked 2026-10-25): the map's door on the axis in the cross hall's back wall, X -1.75 to +1.76 (3.5 m), opens straight into gallery 600, "the gateway gallery … at the top of the Great Hall staircase" with three Tiepolo canvases (The Met, press release on the European Paintings galleries, 2023, https://www.metmuseum.org/press-releases/ep-galleries-reopening-2023-exhibitions). Measured form: a photograph on the Met's essay https://www.metmuseum.org/perspectives/hugh-raffles-tiepolo (interior-images.md, 42), captioned "Entry to the European Paintings galleries (Gallery 600)" with the Triumph of Marius at centre and described as "framed by a curved archway", shows a semicircular arch with a moulded archivolt and impost mouldings on plain piers, blind arches flanking it on the cross hall's back wall; Epicgenius 2026 (interior-images.md, 36) shows it on the stair's axis through the stair hall's larger end arch. Estimate (low-medium), from that photograph scaled by the 5.59 m canvas: the springing at 0.9 to 1.0 times the clear width and the crown at 1.4 to 1.5 times it, so with the map's 3.5 m, springing near 3.3 m and crown near 5.0 m. Through it: dark blue walls and Giovanni Battista Tiepolo's The Triumph of Marius (558.8 × 326.7 cm, Met 437788) centred on the far wall. The model's doorway: a round arch 3.5 m wide with its crown 5.0 m over the second floor; behind the cross hall's wall the passage is lined 0.3 m thick in the same stone through the cavity and in granite through the 1880 brick wall, over a granite threshold flush with both floors, so no brick shows in it (the photograph shows none; the gallery's blue walls are not modelled). The arch's mouldings and the flanking blind arches are not modelled.

Elements and colours (P3): plain stone balustrade walls to the flight; the column arcades on podiums at second-floor level; the white ribbed barrel vault and deep cornice; an arched opening at the top. Samples: vault #dfc6a8 to #d5bd9f, suggested base #e6dccb (warm white); columns and walls in shade #656462 to #6b635c, suggested base #a8a49c (grey stone); balustrade in cool light #8fabcb, suggested base #c8c8c4. Lighting: the vault is lit evenly from above; whether by a laylight or concealed fittings is not settled (the landing skylight is gone, per LPC77).

## The Temple of Dendur, Sackler Wing

The Sackler Wing, by Kevin Roche John Dinkeloo and Associates, was begun in 1974 (Aldred p. 71) and opened to the public on 27 September 1978 (https://en.wikipedia.org/wiki/Temple_of_Dendur; Heckscher p. 72 dates the wing 1978). It stands at the north end of the museum against McKim's north wing, with a deliberate gap between old and new (Heckscher p. 73). The temple sits on a platform over a service area and garage; the wing has four levels (Aldred pp. 71–72).

Plan (derived from the map, main floor):

- Gallery 131: X +118.07 to +148.83 (30.76 m north-south) by Z -92.11 to -38.10 (54.01 m east-west). Walkways at the lower floor level run along three sides: north, between the platform and the glass wall, X +146.89 to +151.95 (5.06 m); south, X +114.35 to +119.75; east, Z -38.10 to -32.62. The whole hall is about X +114.35 to +151.95 by Z -92.09 to -32.62 (37.6 × 59.5 m).
- Glass wall: the north side, its foot at X = +151.95 (the floor plate's north edge), facing north to the park and East 84th Street.
- Temple: footprint X +129.83 to +137.11 by Z -89.22 to -74.64 (7.28 × 14.58 m), axis east-west, front to the east. The map's footprint is larger than the temple's measured size (below), probably by a plinth or margin.
- Gate: footprint X +126.12 to +140.81 by Z -65.47 to -61.74 (14.69 × 3.73 m), on the temple's axis about 9 m east of its front. The measured gate is much narrower (below), so the map's 14.69 m probably includes walls flanking the gate (unverified).
- Forecourt between gate and temple: X +127.6 to +139.3, Z -79.0 to -65.4, with short steps at each end of the gate.
- Platform ("quay"): X +119.74 to +146.89 (27.15 m wide) from the temple's rear (Z about -89.2) to the end of the terrace (Z -47.39), about 42 m long. Flights of steps run up both long sides of its western part (X +118.06 to +119.74 and +146.89 to +148.60, Z -83.88 to -65.44, 18.4 m long); the map marks two accessible ramps at Z -84.1.
- Terrace in front of the gate: X +119.73 to +146.91 by Z -65.47 to -47.39 (27.2 × 18.1 m), edged by a coping about 0.9 m wide.
- Pool: the main basin fills the east end, X +118.07 to +148.83 by Z -47.40 to -38.10 (30.76 × 9.3 m); arms 1.7 to 1.9 m wide run back along the terrace's north and south sides to Z -61.76; 337.7 m² in all.

Sourced facts:

- Temple and gate, measured: "Temple proper: H. 6.40 m (21 ft.); W. 6.40 m (21 ft.); L. 12.50 m (41 ft.)"; gate height 8.08 m (26.5 ft), with 3.66 m (12 ft) and 3.35 m (11 ft) as its plan dimensions, the width entry being garbled in the record (Met API object 547802, accession 68.154, Aeolian sandstone, reign of Augustus). Conflicts: Wikipedia's infobox gives H 4.9, W 6.4, L 13 m and its text 42.7 × 21.5 × 16 ft; Hoving gave "60 feet long and 23 feet high", probably for the whole group (Aramco World 1980, https://archive.aramcoworld.com/issue/198003/a.temple.at.the.met.htm); Aldred (p. 50) gives the three chambers a total of 40 ft along the axis. Use the Met record.
- Date, conflict: the Met's label as transcribed on Commons reads "ca. 15 B.C.E." (description of https://commons.wikimedia.org/wiki/File:Egypt_-_Temple_of_Dendur_2.jpg); the Met API record has a begin date of 10 BC; Wikipedia gives 23 to 10 BC.
- Courses, derived: the masonry runs from course 0 to course 10, the roof (Aldred p. 77), so 11 courses; at 6.40 m that is about 0.58 m a course.
- Platform and pool, measured: the temple keeps its original east-west orientation on a platform that stands for the ancient quay, with a reflecting pool filling the recessed area around it to suggest the Nile (Aldred p. 78). Roche described a wharf and landing with the pool before it and a sloping wall of different stone behind it, suggesting the cliffs (Aramco World 1980). The platform is concrete, faced with granite, and the floor is granite (Aldred pp. 72, 80).
- Glass and ceiling, measured: the wing has a glass facade, a skylight roof and a hung glass ceiling beneath it (Aldred p. 78); the glass of the ceiling and the north wall is stippled to diffuse the light (Aramco World 1980), which describes a flat roof and a sloping glass side.
- Not found: the gallery's height and the glass wall's height, length, slope angle and mullion spacing; the platform's height; the pool's depth.
- The pool's edge (work unit 2, M1, checked 2026-10-25; photographs in interior-images.md, 12, 16, 37 and 38): on the walkway sides the paving ends in a square stone edge straight over the water, with no curb or coping (Marfaing 2017, Summermother 2024). Estimate (medium-low): the far walkway in Marfaing 2017 shows 0.15 to 0.25 m of dry stone over the water, scaled against a visitor at the edge; DP244278 cannot show it. Steel posts about 0.55 m tall carry a sagging rope at the edge between the 2.28 m Amenhotep colossi (DP244278; the statues' height from the Met's record, 22.5.2), and one of the 2024 photographs (38; 14, viewed at full size on 2026-10-28, shows no pool) shows the same along a walkway; their full run is not established. On the terrace side a sit-on coping and two stepped granite courses fall about 1 m to the water (Verbruggen 2015). The depth is still not found. The model keeps the water 0.15 m under the walkways and puts the pool's bottom 0.3 m under them (an estimate), so a visitor who stepped in steps out anywhere on the walkway sides; the rope is not modelled.
- The gate's front and the forecourt (same check; interior-images.md, 13, 14 and 39 to 41): the forecourt between the gate and the temple is raised above the terrace (about 0.5 m, scaled against a visitor; the model's 0.75 m dais comes from P4 beside the temple), and the gate stands at its level. Toward the terrace the gate's base is a plain granite riser, with a low steel rail, about 0.45 m, on the terrace before it; there are no steps on the axis. Short flights of about three risers with sloped granite cheeks sit at the gate's two ends (the map's steps), beside rough-topped plinths about 0.3 m high. Frameless glass about 1.1 m tall lines the passage's jambs; the passage floor runs level into the forecourt, where visitors stand behind it with no rope (Joy of Museums 2018). The Met's audio guide sends visitors from "the large platform in front of the gateway" to "stand between the gate and the temple" (https://www.metmuseum.org/art/collection/search/547802, stop 3590). So the gate is walked into from the forecourt and not crossed from the terrace. The temple's porch is one sill step, about 0.25 m, above the forecourt, with rope stanchions along its front and sides (Haklai 2012). The model: the passage between the gate's piers is filled with granite to the forecourt's level, its front a riser to the terrace, and a 0.45 m steel rail stands on the terrace before it.

Estimates: platform about 1 m above the walkways (P4, low); ceiling about 15 to 20 m above the walkway floor (P4, against the 6.40 m temple; low); the glass wall leans inward toward the top like a mastaba's battered side (Aramco's comparison, plus P4; angle not judged).

Elements (P4): brown sandstone blocks; the temple's east portico of two columns with composite floral capitals between screen walls; the gate in front; the grey granite platform; a back wall of large light ashlar; the north glass wall of rectangular panes on slender light mullions, continuing up into the stippled glass ceiling with track lights.

Colours (P4 samples; a dark photo, so base colours are lifted estimates): sandstone #563c29 in shade and #5d5563 in cool daylight, suggested base #a07a58 (low-medium); granite platform side #342621, suggested #5a524c; back wall #89857e, suggested #b2aca2; floor #5a4b46, suggested #8e7d70 (low); mullions near white, suggested #d8dcdc; ceiling glass #abafa6, suggested #c9ccc4. The Met's own CC0 photograph (index 16) is the better reference for the sandstone.

Lighting: diffused daylight through the stippled north wall and ceiling; track spotlights; artificial light at night, when the glass reads dark (index 17).

## The Charles Engelhard Court, American Wing

The court is part of the American Wing addition by Kevin Roche John Dinkeloo and Associates, opened on 11 June 1980 (Met Bulletin, Spring 1980, foreword: https://resources.metmuseum.org/resources/metpublications/pdf/American_Drawings_Watercolors_and_Prints_The_Metropolitan_Museum_of_Art_Bulletin_v_37_no_4_Spring_1980.pdf; Heckscher p. 78), built around the original 1924 American Wing (opened 10 November 1924, Heckscher p. 55), and reopened on 19 May 2009 after two years of work (Met press release, 2009, via the Wayback Machine). Its north wall is the marble facade of the Branch Bank of the United States, designed by Martin E. Thompson in 1822 and finished in 1824 on Wall Street, acquired in 1915 (Heckscher p. 54).

Plan (derived from the map, main floor):

- Court floor (gallery 700): X +59.17 to +94.33 (35.16 m north-south) by Z -124.43 to -100.44 (23.99 m east-west). A 5.2 m strip at its south end (gallery 701, X +53.94 to +59.18) is part of the same space and holds the Tiffany loggia. The second-floor void matches the court floor (35.16 × 23.98 m).
- Bank facade: its front wall on the line X = +92.95 (drawn 1.38 m thick, to +94.33) across the court's full width, Z -124.42 to -100.44 (23.98 m), with its central door at Z -113.57 to -111.31. A historic print's title gives the bank's front as 75 ft (22.86 m, index 23), within 1.1 m of the map.
- Before the facade: two raised planting beds at X +82.43 to +88.85 (6.41 × 8.13 m each, Z -124.43 to -116.31 and -108.57 to -100.44), steps between them (X +82.43 to +84.78, 7.76 m wide) and a second flight just before the facade (X +90.83 to +92.97, 10.1 m wide).
- West, park side: the American Wing Cafe, X +53.94 to +88.85 by Z -133.01 to -124.41 (8.6 m deep), with column rows at Z -132.12 and -124.42 (six columns each, X +59.18 to +88.25, 5.81 m on centres); balconies above it on the mezzanine (707) and second floor (706). The glass curtain wall stands at about Z -133 (derived, ±1 m).
- East: a 7.9 m deep colonnaded walk, Z -100.46 to -92.57, with column rows at Z -100.45 and -92.78 (same spacing).
- A small pool, X +63.03 to +65.96 by Z -115.36 to -109.53 (2.9 × 5.8 m), in the court's southern half.

Sourced facts:

- Height, measured: 70 ft (21.3 m) from floor to skylight, as built in 1980 (Christian Science Monitor, 19 June 1980, https://www.csmonitor.com/1980/0619/061900.html). A review summarised by a search tool says the 2009 rework raised the floor; unverified.
- Glazing, measured: on the west elevation, curtain walls of reflecting glass enclose two glass-roofed garden courts (this one and the Petrie Court), and slanting glass roofs dominate the whole west elevation (Heckscher p. 73). The cafe is on the park side of the court (2009 release). So the park-facing glass wall is the west wall, behind the cafe and the balconies.
- Bank facade, measured: two storeys and seven bays (Heckscher p. 54); originally at 15½ Wall Street (2009 release). Conflict on its date: 1822–24 (Heckscher p. 54; 2009 release), 1823 (Bulletin 1980), 1824 (Heckscher p. 75).
- Tiffany loggia, measured: architectural elements from Laurelton Hall, about 1905, limestone, ceramic and Favrile glass, 21 × 23 ft (640.1 × 701 cm), in gallery 701 (Met API object 133). A "four-column loggia" appears in a search snippet of a 2006 Met release; unverified.
- Balconies, measured: the 2009 work added a mezzanine balcony reached by a stair in the north-west corner and gave the balconies glass fronts; displays run from the colonial period on the east to the twentieth century on the west, overlooking the park (2009 release).
- Fountains and sculpture, measured: the pool was redesigned in 2009 to show two bronze fountains, by Frederick William MacMonnies and Janet Scudder (2009 release); Saint-Gaudens' Diana (1892–93, cast 1928, 101¾ in tall) stands in gallery 700 (Met API object 11998); Louis Sullivan's staircase from the Chicago Stock Exchange (144 in tall) is in gallery 701 (Met API object 7875).
- Not found: the court's length and width from a source, the roof's form and slope, and the bank facade's height and column order.
- The way in from Arms and Armor (work unit 2, M4, checked 2026-10-27 against the map, its Z in the map's frame as everywhere here): a corridor X +72.56 to +74.86 (2.3 m) by Z -92.58 to -90.29, with a door at each end, joins gallery 374 (X +68.40 to +81.31, Z -90.31 to -82.90), on the west side of the Arms and Armor Court, to the court's east colonnaded walk. The map gives two more ways in on the main floor: a corridor X +50.30 to +53.95 by Z -99.02 to -96.72 from Medieval gallery 307 into the walk's south end, and a corridor north of the bank facade, X +94.30 to +124.75 by Z -100.46 to -95.13, from the walk's north end (its door on X +94.31) to a short link, X +115.36 to +117.69 by Z -95.14 to -92.08, into the Temple of Dendur hall's south walkway; the map's walking route goes in by these two. Not found: any passage's height, or a photograph of one. The model opens the first through the McKim, Mead & White party wall on the American Wing's line (world Z -96.0; the corridor's length is the wall's 0.8 m there), 4.0 m high (estimate, as the Kravis Wing's main-floor doorways). Until then nothing on the main floor reached the court (the reachability gate, `src/model/reach.test.ts`); the other two ways are not modelled.

Elements (P5, index 18): the grey-white marble bank facade with a pedimented centre, pilasters on the upper storey, a rusticated ground storey, and a central arched door with fanlight up four steps; Diana gilded on a tall white pedestal; cast-iron lamp standards in verdigris; white marble sculpture on grey pedestals; planting beds with low curbs; balconies with glass fronts; the pitched glass roof on white tubular steel.

Colours (P5 samples): bank marble #c7c6c6 and #b5b7b2 lit, #7b7870 shaded, suggested base #c8c8c4; steel #eceaea, suggested #f0efec; floor #b7a892 to #b8b196, suggested #c4b8a0 (light buff stone); lamp standards by eye #3d5a4a; Diana's gilding by eye #c49a4a.

Lighting: daylight through the glass roof and the west curtain wall, which throws strong shadow patterns on the floor (P5); lamp standards.

## The Leon Levy and Shelby White Court, Greek and Roman art

Gallery 162, in the Lamont Wing at the south end of the Fifth Avenue range (map; Met 2006 release). McKim, Mead & White built the wing from 1914 (Wing J opened in December 1917) and finished the court in 1926 (Heckscher pp. 51–53). It was converted into a restaurant, planned from 1949 and finished about 1954, with Carl Milles's fountain and Dorothy Draper's decoration (Heckscher pp. 62–63). Kevin Roche's restoration reopened it on 20 April 2007 (Met 2006 release; New Criterion 2007).

Plan (derived from the map, main floor):

- Court: X -139.25 to -99.35 (39.90 m north-south) by Z -28.97 to +0.60 (29.57 m east-west), 1,178 m², including the porticoes.
- Peristyle of 16 columns: six on each long side and four on each short side, corners shared. Long rows at Z -21.83 and -7.17 (14.66 m apart), columns at X -131.52, -126.75, -121.80, -116.86, -111.91 and -107.15 (4.77 to 4.95 m on centres, 24.37 m end to end); short rows at X -131.52 and -107.15, with intermediate columns at Z -17.00 and -12.00. Porticoes are 7.1 to 7.8 m deep from the column centres to the outer walls.
- Two more columns stand in each end opening, at X -139.25 and -99.37, Z -17.00 and -12.00, leading to gallery 169 (south) and 160 and 161 (north).
- A round basin about 3.0 m across at the peristyle's centre (X -120.83 to -117.81, Z -16.01 to -13.00).
- Above: mezzanine galleries 170 (south, 11.2 × 31.1 m) and 171 (east, along Fifth Avenue, 51.1 × 11.2 m) overlook the court; on the second floor the Islamic art galleries wrap a rectangle left open over the peristyle, about X -132 to -106 by Z -23 to -7 (about 26 × 16 m, estimated from the map's empty area), the light well under the skylight.

Sourced facts:

- Two-storey peristyle, measured: the 2007 court is a two-storey peristyle with Ionic columns, where the 1926 court was one storey with Doric columns (History News Network summarising the New York Times, https://www.historynewsnetwork.org/article/37821). A search snippet of a 2004 Met release mentions limestone columns and pilasters in two tiers, Doric and Ionic; unverified.
- Skylight, measured: the original skylight roof was one storey up and was raised another storey in 2007, making a two-storey skylit hall (NBC/AP 2007, https://www.nbcnews.com/id/wbna18234492; also the map's gallery text). Its section (barrel or flat) was not found; a "skylit barrel vault" appears only in a search summary.
- Floor, measured: a grout-free tessera floor of alternating green and red marble modelled on the Pantheon's, inside the surviving black-and-white mosaic border (History News Network, as above).
- Mezzanine, measured: Etruscan art and study-collection galleries overlook the court from two sides (Met 2006 release, reprinted at https://neomagazine.com/2007_07_july/12.html).
- Not found: column height, court height, the upper tier's column count.

Elements (P6): tall smooth light-cream columns on Attic bases carrying a full entablature; an upper storey of smaller columns or pilasters framing grilled windows (the mezzanine openings); a flat portico ceiling with recessed lights; the dark polished floor with white inlay lines and a dark green marble field; dark grey pedestals. Colours by eye from P6 (not sampled): columns #d9d2c3; walls #e4ded2; floor #2e3236 with inlay #dcd8cf; central field #2f4a3f, with red marble reported by the source; pedestals #5b5f63. Confidence medium. Lighting: daylight from the raised skylight over the centre; recessed lights in the porticoes.

## The Arms and Armor Court

Gallery 371. The map now names it "The Ronald S. Lauder Arms and Armor Court"; the brief's name, the Emma and Georgia Bloomberg court, appears in a 2004 Met release snippet as Emma and Georgina Bloomberg. When it was renamed was not found. It is the central hall of Wing F, the Pierpont Morgan Wing by McKim, Mead & White, which opened in March 1910 as the Wing of Decorative Arts; arms and armour moved in in 1956, and the hall's architecture was restored in 1991 (Heckscher p. 48).

Plan (derived from the map, main floor): X +57.16 to +92.59 (35.43 m north-south) by Z -82.91 to -69.70 (13.21 m east-west), north-west of the Great Hall and west of the Egyptian galleries. It is open to the roof through the second floor over exactly its own footprint. A pair of columns stands in the opening at each end (X +57.17 and +92.59, Z -77.75 and -74.87, 2.88 m apart). Galleries about 7.5 m deep line both long sides (373 to 376 west, 377 to 379 east), and on the second floor the musical instruments galleries (680 to 684) ring the void.

Sourced facts:

- Height and light, measured: McKim's central hall is 67 ft (20.4 m) high, rising above two floors of smaller galleries and lit by ten large semicircular clerestory windows; Robinson in 1910 described a cream-white vaulted ceiling (Heckscher p. 48). Derived: five clerestory windows on each long side, about 7 m apart.
- Floor, measured: unpolished Tennessee marble in 1910 (Heckscher p. 48); whether it survives is not confirmed (P7 suggests a warm brown floor).
- Mounted figures: not verified. A search snippet of a 2004 Met release says four complete sixteenth-century armours for man and horse anchor the court; P7 shows a line of mounted figures on a low central platform.

Elements (P7): cream walls; the vault with tall arched clerestory windows; two large ring chandeliers; heraldic banners on poles from the walls; glazed cases; classical door surrounds into the side galleries; a balcony with an organ case at one end; the mounted armour on its platform. Colours by eye (P7): walls #e7dfcf, vault #ece6da, floor #a88a6a, platform edge #4a3a2c; confidence low-medium.

## The Medieval Sculpture Hall

Gallery 305, in Wing A, the Vaux and Mould building that opened on 30 March 1880 (Heckscher pp. 18, 78). The space was Vaux's cast hall. Otto R. Eggers of John Russell Pope's office designed a Romanesque armour hall to fill it (design approved December 1936, opened January 1939), and it became the Medieval Sculpture Hall in 1956 (Heckscher p. 58).

Plan (derived from the map, main floor): X -14.19 to +14.21 (28.40 m north-south) by Z -114.52 to -80.22 (34.30 m east-west), on the Great Hall's axis behind the Grand Staircase, with the Byzantine galleries and the Medieval Europe gallery 304 (Z -80.2 to -63.7) between them. Two rows of piers at X -7.01 and +7.03 (14.04 m apart) stand at Z -114.32, -108.68, -103.03, -97.37, -91.72, -86.06 and -80.43; the end ones are half-piers against the end walls, giving six bays of 5.65 m. The nave is about 14 m wide and the aisles about 7.2 m. On the second floor, European Paintings galleries 635 to 640 sit over the aisles only, so the nave rises through the second-floor level to its clerestory (map and P8).

Sourced facts:

- Choir screen, measured: 52 × 42 ft (1,585 × 1,280.2 cm), iron, gilded and painted, on a limestone base, about 1763, attributed to Rafael Amezúa of Elorrio, gift of the Hearst Foundation 1956, in gallery 305 (Met API object 201926). It was put in place in Valladolid Cathedral on 7 December 1763 and weighs 13,636 kg (Urrea, Metropolitan Museum Journal 13, 1978, pp. 143–44, https://resources.metmuseum.org/resources/metpublications/pdf/A_New_Date_for_the_Choir_Screen_from_Valladolid_The_Metropolitan_Museum_Journal_v_13_1978.pdf).
- Floor, measured but ambiguous: Heckscher (p. 18) describes a white-and-black marble pattern with narrow red-slate borders, possibly for the neighbouring tapestry hall rather than this one.
- Not found: the hall's height and lighting. Derived lower bound: the 15.85 m screen stands in the nave, so the nave is taller than about 16 m; estimate 18 to 20 m (low).

Elements (P8): white plaster vault and walls; arched clerestory windows; arcades on piers between nave and aisles; the screen across the west end, between the nave piers (12.80 m wide in a 14.04 m nave), in three tiers with gilded friezes and a gilded cresting; an arched opening at the east end. A Christmas tree with a Neapolitan crèche is set up in front of the screen each December (well known; not sourced here). Colours by eye (P8): walls and vault #dcd8d0, iron #1e1c1a, gilding #b08a3e; confidence low-medium.

## The Robert Lehman Wing court and the Vaux facade

The Lehman Wing, by Kevin Roche John Dinkeloo and Associates, opened in 1975 (Heckscher p. 72; its building permit was issued in January 1971, p. 73). It sits on the main entrance's axis on the park side, against the west front of the 1880 Vaux and Mould building.

Plan (derived from the map):

- The wing's outline is a square turned 45° with clipped corners, centred on the axis; galleries 950 to 962 ring a central court.
- Court floor (ground floor, gallery 963): a square turned 45° to the grid, 23.16 m corner to corner in both directions (side about 16.4 m, derived as 23.16/√2), with clipped corners, centred at X 0, Z -147.68 (X -11.58 to +11.58, Z -159.26 to -136.10). A square fountain 3.23 m across stands at its centre.
- From the main floor the court is open to below (void X -11.58 to +11.58, Z -156.37 to -139.01). Four stair flights, one on each of the court's sides, join it to the main-floor galleries; their map footprints (about 10.4 by 2.3 m) are schematic.
- Vaux facade: on the line where the Lehman galleries meet the old building, about Z -132 (derived from the map, ±2 m); gallery 521 (X -14.77 to +14.78, Z -132.06 to -123.90) lies just inside the old building.

Sourced facts:

- Court, measured: the square skylit centre court is set at an angle to the museum's original west facade and separated from the surrounding galleries by two concentric walls with large openings, through which one sees Vaux and Mould's pointed arches of red brick and grey granite against Roche's limestone and concrete (Heckscher p. 75). The building is described as pyramidal (Aldred p. 71; Aramco World 1980).
- Vaux facade, measured: at the main-floor level Vaux's entire west facade forms the Lehman Wing's entrance wall (Heckscher p. 18; photographs looking south and east toward it, figs. 105 and 107). Conflict on level: Heckscher says main floor, Wikipedia says the collection is on the ground floor and the basement level; the map shows both, with galleries on the main floor around a court sunk to the ground floor.
- Not found: the court's size from a source, the pyramid's base, height, sides and glazing, the facade's height, width and bay count, and the number of steps down to the court.

Elements (P9): a glazed hipped pyramid over the court with a short ridge at the top, glazed in a diagonal grid on light grey steel; cream walls with clipped corners at its base. Estimate: the pyramid rises about 6 to 8 m over the court (P9, low). Correction (roche-south modeller, 2026-10-11): fitting P9's camera from its EXIF lens gives a rise of about 11.1 m above an eave at +16.3, apex +27.4 (`LEHMAN_PYRAMID_APEX_Y`). Colours by eye (P9): steel #cfd2d4, walls #e2d6bf; the Vaux front's brick and its light and dark granite are not in P9, but in `exterior-images.md` #60 to #64 (`exterior.md` [C7]). Confidence medium. Lighting: daylight through the pyramid.

## Second-floor European Paintings galleries

Plan (derived from the map): galleries 600 to 644 fill the second floor west of the Grand Staircase, X -51.3 to +50.3 by Z -132.1 to -62.5, above the Vaux core and the ranges either side. Rooms are rectangles on bays of 8.1 to 8.3 m: the median room is about 12.2 × 8.3 m (about 100 m²); the long rooms on the axis (600, 601, 619, 620) are 29.6 m long and 8.3 to 9.5 m wide; side rooms are 8.2 to 14.7 m wide. 600 and 601 open off the top of the Grand Staircase.

Sourced facts:

- Skylights, measured: about 30,000 sq ft of glass and a louvre system admit overhead light; the skylights were built in 1939 and last remodelled in 1952; replacement began in April 2018 across 45 galleries (Met press release, 6 April 2018, copy at https://www.webwire.com/ViewPressRel.asp?aId=222379). From search summaries only: all 45 galleries reopened on 20 November 2023; Beyer Blinder Belle was the architect; Architectural Record calls the inner layer "laylights" and dates the first skylights to McKim, Mead & White in 1907.
- Interiors, measured: in 1950–53 the old picture galleries of Wings A to C had their ceilings lowered, coves simplified and trim replaced by plain travertine (Heckscher p. 63).
- Not found: ceiling heights and the laylight geometry. Model each room as a box with a coved ceiling and a flat laylight panel over most of the ceiling, under a roof skylight (form inferred from the sources' "laylights" and "louvre system"; confirm against a gallery photograph from the Met's pages before modelling).

## The Astor Court

Plan (derived from the map): second floor, in the north range along Fifth Avenue, among the Chinese galleries. The courtyard (gallery 217) is X +112.53 to +131.56 by Z -21.38 to -7.84 (19.03 × 13.54 m); the hall at its north end (gallery 218) is X +131.55 to +140.12 (8.57 m) over the same Z range; the forecourt (gallery 209) is X +100.28 to +108.44, Z -28.96 to 0.

Sourced facts:

- Size, measured: roughly 59 by 40 ft (18.0 × 12.2 m) (Christian Science Monitor, 7 July 1981, https://www.csmonitor.com/1981/0707/070701.html). The map's courtyard is 1.0 m and 1.3 m larger, probably by the walls and the covered walk. A search summary of another source gives about 400 m², unverified.
- Layout, measured: a half-pavilion on the west wall, a winding covered walk along the east side, a small pool in the south-west corner, and the Ming Room at the north end with a south-facing porch; fifty hand-hewn columns; the court is entered from the south through a moon gate (The Met, "Nature Within Walls", pp. 9, 15, https://resources.metmuseum.org/resources/metpublications/pdf/Nature_Within_Walls_The_Chinese_Garden_Court_at_The_Metropolitan_Museum_of_Art_A_Resource_for_Educators.pdf; Wikipedia, https://en.wikipedia.org/wiki/Astor_Court_(Metropolitan_Museum_of_Art)).
- Roof, measured: a pyramidal skylight designed by Kevin Roche and John Dinkeloo covers the whole court (Wikipedia, citing the New York Times of 17 January 1979).
- Date, conflict: Wikipedia says it opened in June 1980 and also that it was completed in 1981; the New York Times (12 June 1981) and the Christian Science Monitor (7 July 1981) treat it as new in 1981. Use 1981.

## Other skylit volumes the map shows

The second floor's open-to-below areas mark two more double-height spaces the build may want: the Carroll and Milton Petrie European Sculpture Court (gallery 548), a long glass-roofed court on the west elevation (Heckscher p. 73; Kravis Wing, 1990, p. 78), X -61.44 to -51.24 by Z -134.00 to -61.73 (10.2 × 72.3 m); and the patio from the Castle of Vélez Blanco (gallery 534), X -23.63 to -9.79 by Z -53.79 to -38.06 (13.8 × 15.7 m).

The way into the Petrie Court from the Greek and Roman galleries (work unit 2, M4, checked 2026-10-27 against the map, its Z in the map's frame): a corridor X -63.80 to -62.03 (1.77 m) by Z -61.72 to -60.55, with a door at each end, joins Exhibition Gallery 199 (X -83.33 to -60.69, Z -60.57 to -30.10), behind the Greek galleries, to the east end of gallery 549 (X -66.16 to -61.42, Z -123.25 to -61.71), the long gallery along the court's south side, whose eight doors on X -61.44 open into the court. The court's other way in on the main floor is Weston's 1888 door (X -51.26, Z -99.63 to -96.11), which the map's walking route takes. The map runs gallery 549 and the court on to Z -61.7, 4.2 m east of the block line the model keeps (world Z -69.0, `exterior.md` section 2); the model opens the corridor through the McKim, Mead & White party wall on that line, at the map's X less 0.22 m so the court's limestone wall stays whole (world X -64.02 to -62.25), 4.0 m high (estimate, as the Kravis Wing's main-floor doorways). Not found: a photograph of it. Until then the model's only way in was Weston's door, a closed solid piece until work unit 2's M2b makes it a door, so the court could not be walked into (the reachability gate, `src/model/reach.test.ts`).

Note (integration worker, 2026-10-13): the Petrie Court's glass roof rests on Weston's 1888 front. In both court photographs (`interior-images.md` #33 and #35) its north eave is a dark gutter on the old front's cornice and coping, and the south eave is level with it, so the roof sits at the old front's coping (`CORE_COPING_TOP_Y` in `src/model/frame.ts`, +18.15) plus the gutter, not 2.5 m above it as first modelled. The court floor is the main floor, the level of the 1888 door sill and porch.

### Weston's 1888 door

The door in the Petrie Court's north wall, the centre of Weston's south front of wing B, checked on 2026-10-28 against every source here that shows it (work unit 3). Its head is square, not round: a flat-headed opening in a moulded stone architrave between fluted Ionic pilasters, under the porch's entablature, its two wooden leaves rising to the head with no fanlight. The model had it round-arched, with a voussoir ring and a fanlight, an estimate of the core's first modelling (2026-10-11) that no source supports.

- Photograph #33 (`interior-images.md`, Benoist 2012), read at its full 6000 × 4000: the head flat, in a stepped architrave with a band of paterae over it; inside the opening the head's soffit and the east reveal in light stone, and the dark leaves rising to the head, no fanlight and no transom; the east leaf open into wing B, the lit gap at its hinge side crossed by two hinges.
- Photograph #35 (Haklai 2012), from the east balcony: the head flat, seen from above; the porch's east side a blind panel between pilasters.
- Heckscher fig. 110 (p. 76, the court in 1995, nobody in front of the porch): the whole porch, an aedicule of fluted Ionic pilasters, fluted above mid-height and plain below, with a carved frieze and a modillioned cornice carrying the balcony; the opening square-headed in its architrave, a light stone reveal beside the leaves, which rise to the head.
- Heckscher fig. 27 (p. 22), Weston's preliminary study for the south front, 1883 (a photograph of a lost drawing): a modest square-headed door at the main floor under the central arched window, at the head of a carriage drive, with the Art Schools' arched door under the drive.
- Heckscher fig. 26 (p. 22), the first-floor plan of 1888 (a photograph of a lost drawing): the entrance at the middle of the south front as a porch projecting from the wall, with the stair before it; a plan cannot show the head.
- Heckscher fig. 28 (p. 23), Weston's approved design for the south entrance front, 1885 (ink and pencil on linen, New York City Municipal Archives 1520): the central door at the main floor square-headed, a pair of panelled bronze leaves under a carved overdoor panel in an architrave under a cornice; the round arch over it is the upper storey's window.
- Heckscher fig. 29 (p. 24), Weston and Tuckerman's revised design for the staircase of the south entrance, April 1888 (ink and watercolour on paper, Municipal Archives 1522, approved by the trustees on 10 April 1888, at a quarter inch to the foot): the porch as the photographs show it, an Ionic aedicule round a square-headed opening, on pedestals at the head of the stair.
- King's Handbook of the United States, 1891, p. 604 (`exterior-images.md`): a square-headed door with a pair of panelled leaves under an entablature. Heckscher fig. 35 (p. 28, about 1895, from the southeast) and the Detroit Publishing photograph of about 1900 (`exterior-images.md`, 1880_Met_Museum.jpg) see the porch too obliquely to read the head; both show its side as a blind panel between pilasters and the 1888 stair before it.
- Heckscher's text (pp. 22–24): on 24 November 1884 the trustees moved the main entrance from Fifth Avenue to the south, so the approved design enlarged the door at grade; in February 1887 its bronze doors were not ordered; the 1888 stair added ten granite steps to the seven bluestone ones above; the wing opened on 18 December 1888. A plaque in the court calls this the carriage entrance front of Wing B, the main entrance until 1902, and says its grand stair with two torchères was removed to make the court (https://readtheplaque.com/plaque/carriage-entrance-fa-ade-of-the-metropolitan-museum-of-art, read as a summary).
- The floor map: the court's north wall on X -51.26 (world frame), with a door 3.52 m wide from Z -102.73 to -99.21, in the middle of gallery 529.

Measured on fig. 29 (Heckscher's reproduction, 1878 px wide), its scale from the drawing's own dimension of the granite landing, 56 ft 6 in over 510 px (29.6 px a metre), each figure ±2%: the opening 3.29 m wide and 4.91 m from the porch floor to its head; the architrave 0.22 m wide over the head and 0.19 to 0.21 m beside the jambs; the pilasters' capitals 5.81 m over the porch floor, on pedestals 0.96 m tall; the cornice's top 7.6 m; the porch 5.9 m wide over its pedestals, as the plan on the same sheet gives it. #33 is consistent with these proportions, to within a few per cent: taking its 124 px from the head to the capitals' top as the drawing's 0.9 m, the porch floor would lie at about y 2310 in the photograph, and the horizon read from the crowd's heads, with an eye 1.6 m up, puts it at about y 2320.

What the model takes (`src/model/core/weston-facade.ts`): the drawing's opening and its architrave's width over the head, scaled by 5.0 / 5.81 (0.861). The scale is the model's porch columns, 5.0 m to their capitals' top, against the drawing's 5.81 m, so the head keeps its place under the capitals. The opening is 2.83 m wide and 4.23 m tall, in a 0.19 m architrave on every side. A plain stone frieze fills the wall from the architrave up to the porch's entablature. The leaves rise to the head, with no fanlight. #33 and fig. 110 show stone in the reveals, so the reveals and the head's soffit are lined in stone through the wall, over a stone threshold.

Open, beyond the head: the model's porch is smaller than the real one and of another form. It has four free-standing round Ionic columns 5.0 m tall, 0.65 m off the wall, an entablature 0.8 m deep and the balcony at 6.05 m over the main floor. The real porch is a projecting aedicule of pilasters on pedestals, 5.81 m to the capitals, with an entablature 1.8 m deep and the balcony at 7.6 m, about level with the upper window's sill. Built at the drawing's full size, the opening would be 3.29 × 4.91 m.

## Checks run

- Every plan number above was printed again from the decoded map data and compared with the text; two transcription slips (the armour court's extent and the Great Hall section's area) were corrected.
- Overlap: the boxes of the spaces placed on each level (main floor: Great Hall, Grand Staircase, Medieval hall, armour court, Engelhard Court, Dendur hall, Greek and Roman court, Lehman void; second floor: balcony, upper stair, Astor Court, European Paintings rooms; ground floor: Lehman court) do not overlap on the same level. The one apparent overlap, the upper stair against a loose box drawn round the European Paintings rooms, disappears with the rooms' own extents (they start at Z -62.5, the stair ends at -56.66).
- Extent: every placed space lies inside the main-floor plate, X -150.40 to +151.95 by Z -175.55 to +11.78.

## Open questions for the coordinator

- Levels: `L1` = +4.11 rests on one magazine figure for the steps' rise; `LG` and `L2` rest on differences read from drawing labels of uncertain pairing. Reconcile with the exterior research's facade elevations (the height of the main cornice and of the window sills would fix `L1` independently).
- Facade plane: Z = 0 is the map's wall line in the arched bays, taken as the main wall's outer face; the exterior research may place the face up to 1 m differently.
- Heights not found for any space except the Engelhard Court (21.3 m, 1980) and the armour court (20.4 m): the Great Hall's dome crowns, the Dendur ceiling, the Medieval nave, the Greek and Roman court, the Lehman pyramid and the stair vault are estimates.
- The armour court's name: the brief's Emma and Georgia Bloomberg court is now the Ronald S. Lauder Arms and Armor Court per the map.
- Chapter placement for interiors newer than their shells: the Medieval Sculpture Hall (1939 in an 1880 shell), the Greek and Roman court's upper storey and skylight (2007 in a 1926 court), the bank facade (1822–24, installed 1924, enclosed 1980), and the European Paintings skylights (renewed 2018–23).

## Proposed interior build steps

Each space lists its construction or opening year and the chapter it most naturally joins, then its steps in constructional order: floor, piers and walls, vaults and domes, openings and balconies, fit-out and landmark objects, skylights last. Step ids are proposals in the spec's kebab-case; the coordinator owns the final list in `src/build/chapters.ts`. Interior steps under a roof built in an exterior step need the section cut or an interior preset to be seen, so the coordinator may want a chapter's interior steps to run before its roof steps.

1. Great Hall: built 1897–1902, opened 1902. Hunt chapter.
   - `great-hall-floor`: main-floor slab and marble floor over X ±30.43, Z -28.96 to 0.
   - `great-hall-piers`: the great piers and the wall lines at Z -22.78 and -6.27, with their openings and the end-wall doors.
   - `great-hall-arches`: the round arches on all four sides of the three bays.
   - `great-hall-domes`: the panelled pendentives and the three saucer domes (Guastavino tile), with their crown skylights.
   - `great-hall-balcony`: the balcony floor and vaults on all four sides, the four-column Ionic colonnades (end bays and central openings), entablature and balustrade.
   - `great-hall-end-vaults`: the two end arches with their half-domes.
   - `great-hall-fitout`: the round information desk and its central urn, the four pier-niche flower arrangements, the end-bay lanterns (the desk and coatrooms date from Roche's 1970 renovation; give them `year: '1970'` if the timeline should show that).
2. Grand Staircase: 1902, Hunt chapter.
   - `grand-stair-flights`: two flights and the landing (X ±3.69, Z -29.7 to -53.8) and the landing at its foot.
   - `grand-stair-arcades`: podiums and the five-arch arcades on fluted Corinthian columns on each side at second-floor level.
   - `grand-stair-vault`: the modillioned cornice, the barrel vault and the coved ceiling over the landing, and the top cross hall.
3. Medieval Sculpture Hall: shell 1880 (Vaux chapter); present hall 1936–39 by Otto R. Eggers, Medieval Sculpture Hall since 1956. Suggest the end of the McKim, Mead & White chapter with `year: '1939'`.
   - `medieval-hall-floor`, `medieval-hall-piers` (two rows, six bays), `medieval-hall-arcades`, `medieval-hall-clerestory-vault`, `medieval-hall-choir-screen` (the 1763 Valladolid screen, 15.85 × 12.80 m, installed 1956: `year: '1956'`).
4. Arms and Armor Court: Wing F, opened 1910, restored 1991. McKim, Mead & White chapter.
   - `armor-court-floor`, `armor-court-walls`, `armor-court-vault-clerestory` (the ten semicircular windows), `armor-court-balcony-organ`, `armor-court-equestrian-parade` (the landmark object), `armor-court-chandeliers-banners`.
5. Leon Levy and Shelby White Court: built 1914–26, McKim, Mead & White chapter; upper storey and skylight 2007.
   - `greek-court-floor` (the inlaid marble floor), `greek-court-peristyle` (16 columns plus the 4 at the end openings, entablature), `greek-court-fountain`, then, with `year: '2007'`, `greek-court-upper-storey` and `greek-court-skylight`.
6. Robert Lehman Wing court: 1975, Roche chapter.
   - `lehman-court-floor` (ground-floor court and fountain), `lehman-court-stairs` (the four flights), `lehman-ring-walls` (the two concentric walls with their openings), `lehman-pyramid` (last). The Vaux facade itself belongs to the 1880 chapter; it should already stand when the Lehman Wing closes round it.
7. Temple of Dendur, Sackler Wing: begun 1974, opened 1978. Roche chapter.
   - `dendur-floor`, `dendur-platform` (granite-faced platform, side steps, terrace and coping), `dendur-pool`, `dendur-gate`, `dendur-temple`, `dendur-walls` (including the sloping stone back wall), `dendur-glass-wall` (the stippled sloping north wall), `dendur-ceiling` (the hung stippled glass ceiling and track lights).
8. Charles Engelhard Court: 1980, Roche chapter; reworked 2009.
   - `engelhard-bank-facade` (1822–24, re-erected for the 1924 wing; build it with the 1924 American Wing if the coordinator models that, otherwise first in this list with `year: '1924'`), `engelhard-floor` (court floor, terraces, planting beds, pool), `engelhard-colonnades-balconies` (column rows, cafe zone, glass-fronted balconies), `engelhard-loggia` (Tiffany, about 1905), `engelhard-sculpture` (Diana, lamp standards, marbles, the two fountains), `engelhard-glass-roof` (and the west curtain wall, last).
9. Astor Court: 1981, Roche chapter.
   - `astor-court-floor-walls` (with the moon gate), `astor-court-walk-pavilion` (the covered walk, half-pavilion and Ming Room), `astor-court-skylight`.
10. Second-floor European Paintings galleries: rooms of several campaigns; skylights built 1939, remodelled 1952, renewed 2018–23.
    - `europaint-rooms` (walls on the room grid) in the chapter of the range they sit in, and `europaint-skylights` (laylights and roof glass) with `year: '2023'` at the end of the sequence.
