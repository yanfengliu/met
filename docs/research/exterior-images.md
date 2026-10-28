# The Met Fifth Avenue — exterior reference images

Reference photographs for modelling and for the photo-for-render visual audit. Images are never committed: each entry gives the file page, the licence and author as stated on the page, what it shows, the viewpoint in the world frame of `docs/design/spec.md` (+X north up Fifth Avenue, +Z east toward the avenue, +Y up, origin on the entrance axis at sidewalk grade in the Hunt facade plane), and the model features it informs.

Compiled 2026-10-11. Licences and authors come from each file's Commons metadata (extmetadata) and were not re-checked one by one; check the file page before reusing an image outside this repo. "Viewed" means the research worker looked at the image in the browser; unviewed entries were picked from titles, descriptions, categories and geotags, and their viewpoints are inferred. Geotags on Commons are often camera-phone or Flickr positions and several fall inside the building; viewpoints below are corrected where the image was viewed.

A model source cites an entry by this file's name and the entry's number or label, `exterior-images.md #9` or `#E43`. An ID is never reused or renumbered; a new entry takes the next free number. `src/cited-images.test.ts` fails when a file under `src/model/` cites an entry that is not marked viewed: a primary's heading says "(primary, viewed)", and any other entry holds the sentence "Viewed", "Viewed at full size" or "Viewed at 1:1", with or without a date.

## Primary images and camera presets

Nine primaries for the visual audit. Presets are three.js perspective cameras: position and target in world metres, `fov` vertical in degrees. Positions are estimates (confidence noted); tune them once a render exists by matching the image's horizon and the pavilion's edges.

| # | id | image | position | target | fov | confidence |
|---|---|---|---|---|---|---|
| 1 | `ref-front-axis` | Schneider 2019 frontal | (0, 1.7, 44) | (0, 14, 0) | 50 | high (geotag on the axis at Z +43.7; photo is perspective-corrected, so for an exact match use a level camera with a vertical view offset) |
| 2 | `ref-front-street` | Haklai 2012 frontal | (2, 1.6, 44.5) | (0, 11.9, 0) | 52 | medium (camera pitched up about 13°, from the horizon at people's eye level) |
| 3 | `ref-column-pair-north` | Epicgenius 2023 frame 30 | (60, 1.6, 40) | (27, 20, 2) | 14 | low (telephoto from the northeast) |
| 4 | `ref-entrance-up` | PerpetualTraveler 2022 | (−2, 5.3, 7) | (0, 17, 0) | 70 | medium (on the landing at the central arch) |
| 5 | `ref-fountain-north` | Hałun 2023 | (46, 1.4, 21) | (5, 9, 2) | 55 | medium (from the north fountain looking southwest) |
| 6 | `ref-park-south` | Peel 2024 | (−200, 3, −92) | (−151.6, 9, −68) | 50 | low (from the east end of Wallach Walk, OSM X −265..−192, Z −104..−85) |
| 7 | `ref-park-northwest` | King of Hearts 2013 | (175, 6, −140) | (140, 12, −125) | 50 | low (park north of the American Wing) |
| 8 | `ref-park-north` | Jfcapdet 2013 | (230, 6, −110) | (153, 12, −72) | 55 | low (park north of the museum) |
| 9 | `ref-plan-ortho` | NYC orthophoto 2018 | (0, 600, −85) | (0, 0, −85) | 30 | high (top-down, camera up = (0, 0, −1) so the park is at the top, Fifth Avenue at the bottom, north to the right) |

### 1. Schneider 2019 — Hunt pavilion, frontal (primary, viewed)

- https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_(The_Met)_-_Central_Park,_NYC.jpg — Hugo Schneider, 2019-09-09, CC BY-SA 2.0, 2666×1488.
- Shows the whole central pavilion square-on: four column pairs, three arches with lunettes, entablature breaks, attic blocks, cresting, the ends of the flanking extensions with pedimented windows, the full flight of steps, the 2014 plaza. Wangechi Mutu's bronzes stand in the four niches (2019 Facade Commission).
- Viewpoint: east sidewalk of Fifth Avenue on the axis, about (0, 1.7, 44), looking west (−Z).
- Informs: bay rhythm and all pavilion heights (exterior.md H2–H13), step width, overall silhouette. Main measurement source (S7).

### 2. Haklai 2012 — centre of the pavilion and the steps (primary, viewed)

- https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_-_Main_Building.jpg — Yair Haklai, 2012-05-26, CC BY-SA 4.0, 3264×2448.
- Shows the central and inner bays, columns, medallions, keystone heads, doorways, lunettes, pedestals, the landing and the steps before the 2014 plaza; overcast light, good for colour.
- Viewpoint: east sidewalk just north of the axis, about (2, 1.6, 44.5), looking west and up.
- Informs: column proportions, arch and door heights, step count (H4, H10, H11, P3), limestone and granite colours (C1–C5).

### 3. Epicgenius 2023 frame 30 — north outer column pair (primary, viewed)

- https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_30.jpg — Epicgenius, 2023-04-14, CC BY-SA 4.0, 5184×3456.
- Shows the north outer pair from below and the northeast: freestanding columns with fluted wall pilasters behind them, the entablature break returning to the wall, the stepped rough-stone block on its plinth, the cresting with masks, a medallion and the north arch's archivolt; to the right the lower flanking extension with a caryatid.
- Viewpoint: telephoto from about (60, 1.6, 40), looking southwest and up.
- Informs: depth of the column screen and the break (H5, H7, H9), extension height (H14), ornament detail.

### 4. PerpetualTraveler 2022 — central arch from the landing (primary, viewed)

- https://commons.wikimedia.org/wiki/File:Entrance_to_The_Met_Fifth_Avenue_(2022).jpg — PerpetualTraveler, 2022-05-28, CC BY-SA 4.0, 4096×3072. Its geotag (X −33, Z +25) is wrong for this view.
- Shows the central arch's coffered archivolt, the lunette grille, the doorway screen of two small columns and the door entablature with Greek-key frieze, and the colossal columns standing well clear of the piers.
- Viewpoint: on the landing at the central arch, about (−2, 5.3, 7), looking up and west.
- Informs: arch infill (H11), column clearance from the wall (H5).

### 5. Hałun 2023 — north fountain and the pavilion (primary, viewed)

- https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art,_New_York_City,_20231006_125206.jpg — Jakub Hałun, 2023-10-06, CC BY 4.0, 4000×3000. Its geotag (X +120, Z +29) is wrong for this view.
- Shows the north fountain's ring of inward-arcing jets over its dark basin, the steps and the pavilion receding south, red parasols at the south end, a planter tree by the steps.
- Viewpoint: by the north fountain, about (46, 1.4, 21), looking southwest.
- Informs: fountains (P6), plaza paving and furniture (P5, P9), oblique massing of the pavilion.

### 6. Peel 2024 — south side from Wallach Walk (primary, viewed)

- https://commons.wikimedia.org/wiki/File:At_New_York_City_2024_317.jpg — Mike Peel, 2024-03-03, CC BY-SA 4.0, 6960×4640.
- Shows the Michael C. Rockefeller Wing's sloping glass south wall between limestone masses, winter trees, the park path in front.
- Viewpoint: Wallach Walk south of the building, about (−200, 3, −92), looking north.
- Informs: Rockefeller glass wall (K5), park grade on the south side (F11), the Wallace and south-wing masses.

### 7. King of Hearts 2013 — American Wing from the park (primary, viewed)

- https://commons.wikimedia.org/wiki/File:Central_Park_New_York_August_2013_002.jpg — King of Hearts, 2013-08-17, CC BY-SA 4.0, 3150×2520.
- Shows limestone walls with ivy, a tall glazed slot, sloped and stepped glazing at the top, a sloped glass wall receding on the left, schist outcrops and lawn in front.
- Viewpoint: park north of the American Wing, about (175, 6, −140), looking southwest (low confidence).
- Informs: American Wing and Sackler park facades (K3, K4), park terrain and rock (site chapter).

### 8. Jfcapdet 2013 — north side from the park (primary, viewed)

- https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_-_Central_Park.jpg — Jfcapdet, 2013-04-09, CC BY-SA 4.0, 3264×2448.
- Shows the Sackler Wing's sloped glass wall facing the park, partly behind bare trees, with Fifth Avenue towers behind.
- Viewpoint: park north of the museum, about (230, 6, −110), looking southeast.
- Informs: Sackler glass wall (K3), the north end massing, skyline context.

### 9. NYC orthophoto 2018 — plan view (primary, viewed)

- Tiles from the NYC Office of Technology and Innovation map service, 2018 aerial imagery (0.5 ft source): https://maps.nyc.gov/xyz/1.0.0/photo/2018/{z}/{x}/{y}.png8 (zoom 19–20; for example tile 20/308856/393989 covers the Hunt pavilion). Public city map service; check NYC's terms before reuse outside this repo.
- Shows the whole roofscape and the plaza from above: Great Hall skylights, the Rockefeller ridge skylights, the Lehman pyramid, the Sackler and American Wing glass roofs, the roof garden, fountains, groves, allées, steps, curbs.
- Viewpoint: vertical, rotated 61° so +X points right and +Z down.
- Informs: block outlines, roofscape (R1–R6), plaza layout (P5–P9).

## Other candidates

Unviewed unless marked. Coordinates are Commons geotags converted to the world frame; "(?)" marks an inferred viewpoint.

### Hunt pavilion, frontal and oblique

10. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_main_building,_5th_Avenue_entrance_01.jpg — TheCatalyst31, 2025-10-16, CC BY-SA 4.0, 6000×4000. Current facade (2025). Informs: present-day state, niches. Siblings _02, _03, _04 in the same series.
11. https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_45.jpg — Epicgenius, 2023-04-14, CC BY-SA 4.0. First frame of a 22-frame series along the facade (frames 24 to 45, same caption); likely covers the wings bay by bay. Informs: MMW bays and windows (W5).
12. https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_36.jpg and https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_41.jpg — Epicgenius, 2023, CC BY-SA 4.0. Same series. The second is [E41] below.
13. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_entrance_NYC.JPG — Arad, 2007-05-11, CC BY-SA 3.0. Entrance facade (geotag wrong).
14. https://commons.wikimedia.org/wiki/File:MET,_esterno.JPG — sailko, 2010-09-22, CC BY-SA 3.0. Entrance facade.
15. https://commons.wikimedia.org/wiki/File:Museo_Metropolitano_de_Arte,_Manhattan,_Nueva_York,_EE.UU._2007-08-09,_DD_6664.jpg — Diego Delso, 2007-08-09, CC BY-SA 4.0. Portrait view of the pavilion.
16. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_-_panoramio.jpg — Roman Suzuki, 2007-09-09, CC BY 3.0; camera (63, 31) on the north part of the plaza looking southwest (?). Oblique of the pavilion and north link.
17. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art,_New_York_City_NY,_entrance.jpg — Arad, 2007-05-11, CC BY-SA 3.0; camera (60, 18) (?). Oblique from the north.
18. https://commons.wikimedia.org/wiki/File:Das_Metropolitan_Museum_auf_der_5_th_Avenue_beim_Central_Park_-_panoramio.jpg — Martin Furtschegger, 2012-06-16, CC BY 3.0; camera (−9, 59) east of Fifth Avenue looking west (?).
19. https://commons.wikimedia.org/wiki/File:The_Metropolitan_Museum_of_Art_Manhattan_NYC_sideview.jpg — Daniel Dimitrov, 2012-01-02, CC BY-SA 4.0. Side view along Fifth Avenue; informs the end pavilions' projection. Viewed at 1:1 (2026-10-11). It is [D12] below.
20. https://commons.wikimedia.org/wiki/File:New_York_Metropolitan_Museum_of_Art_(4679685892).jpg — Tony Hisgett, 2010-05-29, CC BY 2.0. Panorama of the front (geotag wrong).
21. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_Of_Art_-_New_York_-_USA_-_panoramio_(2).jpg — Paulo JC Nogueira, 2014-04-05, CC BY-SA 3.0. Panorama from the plaza during the 2014 works.

### Close-ups

22. https://commons.wikimedia.org/wiki/File:Details_of_the_exterior_of_Metropolitan_Museum_of_Art.jpg — Rodrigo Alomía Díaz, 2016-10-24, CC BY-SA 4.0. Exterior details (capitals, cornice).
23. https://commons.wikimedia.org/wiki/File:Details_of_the_Met.JPG — Marlith, CC BY-SA 4.0. Front facade details.

### McKim, Mead & White wings and corners

24. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_Of_Art_-_New_York_-_USA_-_panoramio_(4).jpg — Paulo JC Nogueira, 2014-04-05, CC BY-SA 3.0. Panorama near the north wing (?).
25. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_-_panoramio_(1).jpg — TomasEE, 2012-03-10, CC BY 3.0. North wing area (?).
26. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_Of_Art_-_New_York_-_USA_-_panoramio_(24).jpg — Paulo JC Nogueira, 2014-04-05, CC BY-SA 3.0. South end, 80th Street side (?).
27. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_Of_Art_-_New_York_-_USA_-_panoramio_(5).jpg — Paulo JC Nogueira, 2014-04-05, CC BY-SA 3.0. Panorama of the south part of the plaza (?).

### McKim, Mead & White fronts measured by the mmw modeller (added 2026-10-13)

Measured at 1:1 by the `mmw` worker, each photograph viewed on the date its entry gives; the readings are in `src/model/mmw/dims.ts` (header) and `exterior.md` [W4]. Licences re-read from each file's Commons metadata on 2026-10-13, except the Mapillary frames.

- [E39] https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_39.jpg — Epicgenius, 2023-04-14 11:17, CC BY-SA 4.0, 5184×3456. Viewed at 1:1 (2026-10-13). The south end pavilion's north-east corner and its seam with the south link. Informs: the end pavilion's giant order, crowning cornice and parapet.
- [E40] https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_40.jpg — Epicgenius, 2023-04-14 11:17, CC BY-SA 4.0, 5184×3456. Viewed at 1:1 (2026-10-13). The whole south link. Informs: its bays, attic panels and crowning cornice (dentils, no modillions, no cresting).
- [E41] https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_41.jpg — Epicgenius, 2023-04-14 11:17, CC BY-SA 4.0, 5184×3456. Viewed at 1:1 (2026-10-13). The Hunt south extension frontally. Informs: its dentilled cornice over the caryatids and its crowning cornice.
- [E42] https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_42.jpg — Epicgenius, 2023-04-14 11:18, CC BY-SA 4.0, 5184×3456. Viewed at 1:1 (2026-10-13). The south end pavilion's north-east corner, as [E39]. Informs: the end pavilion's heights against the link's cornice in the same frame.
- [E43] https://commons.wikimedia.org/wiki/File:5_Av_Apr_2023_43.jpg — Epicgenius, 2023-04-14 11:18, CC BY-SA 4.0, 5184×3456. Viewed at 1:1 (2026-10-13). The south link's last four bays and the Hunt south extension frontally from the far sidewalk, 27 mm (6277 px focal), about 44 m out, pitched up about 15°. Informs: every height above the links' windows and the seam with the Hunt extension (the links' cornice top runs just under the extension's dentil course). Viewed again by the integration worker on 2026-10-13: the extension's crowning cornice is plain, with no modillions under its corona.
- [P37] Mapillary, user tomjmat, frame of 2020-05-25 16:21:37 (named 16H21M37S in `mmw/dims.ts`; its image key was not recorded), Mapillary's CC BY-SA 4.0 imagery licence. Viewed at 1:1 (2026-10-11). The north link frontally from Fifth Avenue, camera about 39 m out, level to 1.7°. Informs: the links' heights up to the window glass, and the anchor of [E43]'s projective scale.
- [P35] Mapillary, user tomjmat, frame of 2020-05-25 16:21:35 (named 16H21M35S in `mmw/dims.ts`; its image key was not recorded), Mapillary's CC BY-SA 4.0 imagery licence. Viewed at 1:1 (2026-10-11). The north link frontally from Fifth Avenue, as [P37].
- [P47] Mapillary, user tomjmat, frame of 2020-05-25 16:21:47 (named 16H21M47S in `mmw/dims.ts`; its image key was not recorded), Mapillary's CC BY-SA 4.0 imagery licence. Viewed at 1:1 (2026-10-11). The south link frontally.
- [P50] Mapillary, user tomjmat, frame of 2020-05-25 16:21:50 (named 16H21M50S in `mmw/dims.ts`; its image key was not recorded), Mapillary's CC BY-SA 4.0 imagery licence. Viewed at 1:1 (2026-10-11). The south end pavilion's north end bay, with its tall blind niche.
- [L14] https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_circa_1914_LC-USZ62-101736.jpg — Irving Underhill, about 1914 (Library of Congress LC-USZ62-101736), public domain, 3678×2826. Viewed at 1:1 (2026-10-11). Informs: the north link's seven arched windows and the north end pavilion's south side and giant order.
- [D12] https://commons.wikimedia.org/wiki/File:The_Metropolitan_Museum_of_Art_Manhattan_NYC_sideview.jpg — Daniel Dimitrov, 2012-01-02, CC BY-SA 4.0, 3264×2448 (also #19 above). Viewed at 1:1 (2026-10-11). Informs: the south link's bays, base windows and archivolts, and its channelled base.

### Steps, plaza, fountains, Fifth Avenue

28. https://commons.wikimedia.org/wiki/File:Fountain_at_The_Met.jpg — G. Scott Segler, 2017-06-10, CC BY-SA 4.0; camera (51, 12) by the north grove. North fountain; informs P6.
29. https://commons.wikimedia.org/wiki/File:The_Museum_(224697871).jpeg — Emily Serven, 2017-06-25, CC BY 3.0. A fountain outside the Met.
30. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_Fountains_(6279251093).jpg — Erik Drost, 2011-08-04, CC BY 2.0. The 1970 fountains before 2014 (history only).
31. https://commons.wikimedia.org/wiki/File:Outside_the_Metropolitan_Museum_Of_Art_(5893442271).jpg — Alex Proimos, 2011-07-02, CC BY 2.0. The pre-2014 plaza.
32. https://commons.wikimedia.org/wiki/File:Outside_the_2026_Met_Gala_1.jpg — SWinxy, 2026-05-04, CC BY 4.0. The front from across Fifth Avenue in 2026; latest view of the present state.
33. https://commons.wikimedia.org/wiki/File:Photograph_of_Fifth_Avenue_from_the_Metropolitan%E2%80%94New_York_City.jpg — A. Balet, 2008-03-22, CC BY 3.0. Looking east from the steps; informs Fifth Avenue and the buildings opposite.
34. https://commons.wikimedia.org/wiki/File:From_The_Steps_of_the_Metropolitan_Museum_Of_Art_(5892536051).jpg — Alex Proimos, 2011-07-02, CC BY 2.0. View from the steps.
35. https://commons.wikimedia.org/wiki/File:Museum_Row_in_Manhattan._(4270510812).jpg — Moto "Club4AG" Miwa, 2010-01-07, CC BY 2.0; camera (52, 27) on the north plaza.

### Aerial and high views

36. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_(The_MET),_Turtle_Pond_and_Belvedere_Castle_in_Central_Park,_Manhattan_-_CentralParkFromAboveCropped_(cropped).jpg — Ellen Murphy / Roy Smith, 2005-02-12, CC BY-SA 3.0. From a plane: the whole building and the park west of it.
37. https://commons.wikimedia.org/wiki/File:CentralParkWithGatesFrom2000feet.jpg — Ellen Murphy / Roy Smith, 2005-02-12, CC BY-SA 3.0. The park from 2,000 ft looking southeast, the Met at the edge.
38. https://commons.wikimedia.org/wiki/File:ISS043-E-241995_-_View_of_New_York_City_-_Midtown_Manhattan_-_United_Nations_Headquarters_-_Roosevelt_Island_-_Central_Park_(The_MET,_Jacqueline_Kennedy_Onassis_Reservoir)_-_Harlem_-_Morningside_Park_(cropped).jpg — NASA, 2015-05-23, public domain. Oblique from orbit, the roof plan at low resolution.
39. https://commons.wikimedia.org/wiki/File:Drone_photo_of_Central_Park_20170506-001-2_(33679392984).jpg — CucombreLibre, 2017-05-06, CC BY 2.0; camera (155, −236) in the park northwest of the building (?). Possible high view of the park side.

### Park side, Cleopatra's Needle, Roof Garden

40. https://commons.wikimedia.org/wiki/File:Central_Park_(near_Metropolitan_Museum)_-_panoramio.jpg — Jean-François Capdet, 2013-04-09, CC BY 3.0; camera (188, −149) north of the building.
41. https://commons.wikimedia.org/wiki/File:Central_Park_Greywacke_Arch_underpass_looking_east.jpg — Beyond My Ken, 2014-08-01, CC BY-SA 4.0; camera (−117, −222) southwest of the building, looking east toward the Wallace and Kravis wings (?).
42. https://commons.wikimedia.org/wiki/File:Cleopatra's_Needle-1.jpg — Captain-tucker, 2008-07-11, CC BY-SA 3.0; camera (−62, −234) at the obelisk (OSM X −66..−55, Z −234..−224), the museum's west side behind (?).
43. https://commons.wikimedia.org/wiki/File:Central_Park,_N.Y.C._1997_05.jpg — LBM1948, 1997, CC BY-SA 4.0. Lawn next to the Met.
44. https://commons.wikimedia.org/wiki/File:MetFashion_2019-09_WMNYC_(7)_jeh.jpg — Jim Henderson, 2019-09-07, CC BY-SA 4.0, 4096×3072; camera (−95, −134) on the Roof Garden looking north. Viewed at full size 2026-10-28: the deck of weathered grey teak planks underfoot, box hedges in planters along the left (park) edge, the 2019 roof commission (black steel frames holding stone spheres) left of centre, a pale grey pergola of square posts and beams under vines along the right (east) edge with a glazed structure under its far end, a limestone wall at the right, and the park's trees and the towers of Central Park West beyond. Informs K6.
45. https://commons.wikimedia.org/wiki/File:People_in_the_rooftop_bar_of_the_Metropolitan_Museum_of_Art,_New_York,_2007.jpg — DimiTalen, 2007-08-03, CC0; camera (−113, −123) on the Roof Garden.
46. https://commons.wikimedia.org/wiki/File:Central_Park_New_York_May_2017_005.jpg — King of Hearts, 2017-05-06, CC BY-SA 4.0; camera (−138, −109) on the Roof Garden; the view out over the park.

### Night

47. https://commons.wikimedia.org/wiki/File:Metropolitan_museum_of_art_1.jpg — Fcb981, 2008-01, CC BY-SA 3.0. Facade at night (siblings _2, _3).
48. https://commons.wikimedia.org/wiki/File:P8090156_(20258857508).jpg — Ajay Suresh, 2015-08-09, CC BY 2.0. Facade at night after the 2014 plaza lighting.

### Historical (for the chapter boundaries)

49. https://commons.wikimedia.org/wiki/File:Original_Met.jpg — unknown, about 1880, public domain, 1384×968. The Vaux & Mould building alone in the park (chapter `vaux-mould-1880`). Viewed at full size 2026-10-28: the building from the park, a long front of seven pointed arches with alternating light and dark voussoirs on its main floor, its ground storey behind a grassy mound, between two taller end blocks under steep hipped roofs with chimneys; behind the front a hipped roof rises to a long glazed clerestory; at the right end a porch with a stair and a small canopy.
50. https://commons.wikimedia.org/wiki/File:US-NY(1891)_p604_NYC,_METROPOLITAN_MUSEUM_OF_ART.jpg — King's Handbook, 1891, public domain, 969×479. Engraving after the 1888 wing. Viewed 2026-10-28: Weston's south entrance front near square-on, three round-arched upper windows with roundels between them over a square-headed door with a pair of panelled leaves under an entablature, and the stair below it (`interior.md`, Weston's 1888 door).
51. https://commons.wikimedia.org/wiki/File:(King1893NYC)_pg311_METROPOLITAN_MUSEUM_OF_MODERN_ART,_CENTRAL_PARK,_NEAR_FIFTH_AVENUE.jpg — King's Handbook, 1893, public domain. The brick complex near Fifth Avenue (chapter `weston-tuckerman-1894`).
52. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art,_Central_Park,_from_Robert_N._Dennis_collection_of_stereoscopic_views.jpg — about 1896, public domain. Stereoview of the brick buildings.
53. https://commons.wikimedia.org/wiki/File:1880_Met_Museum.jpg — Detroit Publishing Co., about 1900, public domain, 9406×6439. Viewed at full size 2026-10-28: the brick complex from the park to the southwest, and at the right Weston's south front receding east, its entrance porch seen from the west with a blind panel between pilasters on its side and the 1888 stair before it, too obliquely to read the door's head (`interior.md`, Weston's 1888 door).
54. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art,_New_York,_N._Y_(NYPL_b12647398-63134).tiff — Detroit Publishing Co., 1902–03, public domain. Postcard of the new Hunt facade (chapter `hunt-1902`).
55. https://commons.wikimedia.org/wiki/File:New_York_City_-_Metropolitan_Museum_of_Art_LCCN2003678130.jpg — Library of Congress, 1905, public domain. Hunt facade before the MMW wings.
56. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum,_New_York,_N._Y_(NYPL_b12647398-69920).tiff — Detroit Publishing Co., 1908–09, public domain. Postcard, MMW wings under way (?).
57. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_-_DPLA_-_396e806367e04eb35c76361d66d2660d.jpg — Edmund F. Arras, 1913, public domain. Fifth Avenue entrance.
58. https://commons.wikimedia.org/wiki/File:Metropolitan_Museum_of_Art_with_obelisk,_5th_Ave._&_81st_St._LCCN90713161.jpg — Irving Underhill, 1914, public domain; camera (−90, 47) at 81st Street east of Fifth Avenue. The south side before Wing K (chapter `mckim-mead-white-1926`).
59. https://commons.wikimedia.org/wiki/File:Returning_Home,_New_York_Times,_1919.JPG — 1919-04-28, public domain. Parade with the Met behind.

### The 1880 west front today (added by work unit 4, 2026-10-28)

60. https://www.untappedcities.com/the-met-original-building-museum/ — Nicole Saraniero, Untapped New York, "The Met's Original Building is Still Hiding Inside the Museum", 2026-04-17: its photograph captioned "The former west facade as seen from the Robert Lehman Wing" (1260×840; reference only, not freely licensed). Viewed at full size 2026-10-28: from the Lehman court's floor looking east and up, the glazed pyramid with its short ridge over the court's cream limestone walls, and through three tall openings in them the 1880 west front, in red brick: pointed arches of alternating light and dark grey voussoirs over striped tympana and lit windows, a light stone band at the windows' heads, and a light cornice at the wall's top; a balcony with a rail stands in the middle opening. The article's text says the 1888 wing moved the main entrance from Fifth Avenue (east) to the park (south); `history.md` has the 1880 entrance facing the park (west). Informs: the west front's arches and materials.

## Gaps

- No candidate yet shows the Lehman Wing pyramid or the American Wing glass court from outside at close range, the 80th and 84th Street corners named explicitly, or the MMW wings under construction. The Epicgenius 2023 series (frames 24 to 45), the Ferfive "Visiting The MET MUSEUM" series (2025, CC BY 4.0) and "The Met, NYC, Sep 2026" (1)–(5) (CC BY-SA 4.0) are the best places to look next.
- Commons has no dedicated categories for the facade, the exterior, the Lehman or Sackler wings or aerial views of the Met; the main category is "Metropolitan Museum of Art - Main Building" (152 files).
