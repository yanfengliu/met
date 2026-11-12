# The Met Fifth Avenue — surroundings research

What a planner needs to draw the museum's surroundings as environment: the buildings round it, Central Park's features and trees, and the sun through the year. The owner decided on 2026-11-11 that the surroundings are drawn like the sky and the workspace ground, outside the model, its mesh and triangle budgets, the section cut and the floor views; the page fetches nothing at runtime, so whatever is drawn comes from a data file that a script run by hand generates and commits, as the collection's catalogue is (`docs/work/27_improvement-list/plan.md`, item 8 and "Approach").

Positions are in the world frame of `docs/design/spec.md`: metres, +Y up, +X grid north (up Fifth Avenue), +Z grid east (toward the avenue), origin on the Great Hall's axis at Fifth Avenue sidewalk grade in the plane of the Hunt facade. Bearings are true, clockwise from north. Every number carries its source in square brackets, or a tag as in `exterior.md`: **M** measured, **D** derived (working shown), **E** estimated (the reason given).

Research run 2026-11-11 by a research worker. Every query asked a service for counts, or for the records inside a distance of the origin with only the fields needed, about one request a second per host, under a generic client name and with no token. Query results stay under the ignored `research/cache/surroundings/` and the throwaway scripts under the ignored `research/cache/surroundings-tools/`; nothing downloaded is committed. No request went to The Met's Collection API.

## Sources

- [U1] NYC Open Data, Building Footprints (dataset 5zhs-2jue), published by the Office of Technology and Innovation (OTI); rows updated 2026-11-08, queried 2026-11-11 through the SODA API at `https://data.cityofnewyork.us/resource/5zhs-2jue.json`. Data dictionary: https://github.com/CityOfNewYork/nyc-geo-metadata/blob/master/Metadata/Metadata_BuildingFootprints.md (metadata of 2025-10-09).
- [U2] The same footprints as the city's ArcGIS services, named in [U1]'s dictionary: polygons at https://services6.arcgis.com/yG5s3afENB5iO9fj/arcgis/rest/services/BUILDING_view/FeatureServer and centroid points at `.../BUILDING_P_view/FeatureServer`.
- [U3] NYC Planimetric Database (Manhattan imagery of 18 March 2022), OTI, on NYC Open Data: Hydrography (pjs3-c3z5), Open Space (Parks) (y6ja-fw4f), Sidewalk (52n9-sdep), Roadbed (i36f-5ih7), Retaining Wall (s2pi-ccum), Elevation Points (9uxf-ng6q). Capture rules: https://github.com/CityOfNewYork/nyc-planimetrics/blob/master/Capture_Rules.md.
- [U4] NYC Parks on NYC Open Data: Parks Properties (enfh-gkve; Central Park is property M010, 840.01 acres) and Forestry Tree Points (hn5i-inap; rows updated 2026-11-04).
- [U5] The city's canopy from its 2017 LiDAR: Land Cover Raster Data (2017) – 6in Resolution (he6d-2qns, one zip of 1,334,211,225 bytes), Tree Canopy Change 2010–2017 (by9k-vhck, one zip of 666,685,898 bytes), and the per-census-tract summary service https://services6.arcgis.com/yG5s3afENB5iO9fj/arcgis/rest/services/Canopy_2010_2017/FeatureServer.
- [U6] NYC Department of City Planning, PLUTO (64uk-42ks), for the Fifth Avenue row's addresses, floors and years, joined on the footprints' tax lots.
- [U7] USDA Forest Service, NLCD Tree Canopy Cover, product suite v2023-5, 30 m, the 2023 layer, exported for a box round the origin from https://imagery.geoplatform.gov/iipp/rest/services/Vegetation/USFS_EDW_NLCD_TCC_CONUS/ImageServer (exportImage). Product page: https://data.fs.usda.gov/geodata/rastergateway/treecanopycover/ (which now offers a v2025-6 release, 1985–2025).
- [U8] USGS 3D Elevation Program (3DEP), exported for the same box from https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer (exportImage).
- [U9] OpenStreetMap: aggregates through the ohsome API (https://api.ohsome.org/v1, data to 2026-07-27, asked at 2026-07-01), and three ways read by id through the OSM API: the plaza fountains 552699591 and 552699597 and Cleopatra's Needle 179685272. The Overpass servers (overpass-api.de, overpass.kumi.systems, overpass.private.coffee) timed out or answered 502 throughout this run and ohsome's extraction endpoints answered 403, so no other OSM geometry was read.
- [U10] NOAA Global Monitoring Laboratory, "General Solar Position Calculations" (https://gml.noaa.gov/grad/solcalc/solareqns.PDF, two pages), and the notes to its solar calculator (https://gml.noaa.gov/grad/solcalc/calcdetails.html), which name Jean Meeus' Astronomical Algorithms as the calculator's source; the US Naval Observatory's rise, set and transit service (https://aa.usno.navy.mil/api/rstt/oneday) for the check.
- [U11] Central Park Conservancy, Central Park Fall Foliage Map (2022): https://assets.centralparknyc.org/media/documents/CPCWeb_Downloadablemaps_2022_CPFallFoliageMap_Final.pdf.
- [U12] Terms: NYC Administrative Code § 23-502(d) (https://nyc-laws.readthedocs.io/en/latest/nycadmincode/t23/c05/); NYC.gov terms of use (https://www.nyc.gov/main/terms-of-use); OpenStreetMap copyright (https://www.openstreetmap.org/copyright); USGS, Copyrights and Credits (https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits).
- [U13] Severud Associates, 270 Park Avenue (https://www.severud.com/office-buildings/270-park-avenue/), for that tower's published height; read in a search extract, not opened.
- Photographs: `exterior-images.md` #33, #34, #46 and #68 to #71 (section 7).

## 1. Data and licences

### Buildings

- [D1] Building Footprints [U1] holds every building in the five boroughs over 400 sq ft and 12 ft tall, as an outline with a roof height and a ground elevation; photogrammetric outlines are good to ±2 ft (95%). It covers New York City only: New Jersey, across the Hudson to the west, is not in it.
- [D2] Fields, as the SODA API names them [U1]:

| Field | What it holds |
|---|---|
| `the_geom` | MultiPolygon in WGS84 longitude, latitude (the city keeps EPSG:2263, Long Island State Plane in US feet, and Open Data serves EPSG:4326); an outer ring per part, inner rings for courts |
| `height_roof` | Roof height above `ground_elevation`, in feet; zero or null where unknown. Its source points are "the highest portion of the roof", without antennas or roof fixtures ([U3], Building Elevation) |
| `ground_elevation` | "Lowest elevation at the building ground level, in feet", NAVD88 where captured photogrammetrically or from modern sources |
| `bin`, `doitt_id` | Building Identification Number (not unique) and the city's stable key |
| `base_bbl`, `mappluto_bbl` | Tax lot, for joining PLUTO [U6] |
| `feature_code` | 2100 building, 5110 garage, 5100 under construction, 1000 parking, 1001 gas station canopy, 1002 storage tank, 1003 placeholder triangle, 1004 auxiliary structure, 1005 temporary structure, 1006 cantilevered building, 2110 skybridge |
| `construction_year`, `last_status_type`, `last_edited_date`, `geom_source`, `name` | Year, status, edit date, Photogrammetric or Other (Manual), and a common name "not actively maintained" |
| `shape_area`, `shape_length` | "Do not use": computed in Web Mercator |

- [D3] Terms. The dataset names no licence; its metadata gives "Office of Technology and Innovation (OTI)" as the attribution and says "Open Data policies and restrictions apply", linking a terms page that now redirects to a general nyc.gov page with no dataset terms. The law behind it, NYC Administrative Code § 23-502(d) [U12], makes public data sets available without registration, licence requirements or restrictions on their use, and lets the city require a third party that provides a data set, or an application using one, to the public to identify its source and version and describe any modifications. NYC.gov's terms disclaim every warranty, of accuracy and currency among them [U12]. The same holds for [U3] to [U6].
- [D4] Query by place, on `https://data.cityofnewyork.us/resource/5zhs-2jue.json` [U1]:
  - Count and vertex total: `$select=count(*), sum(num_points(the_geom))` with `$where=within_circle(the_geom, 40.77911, -73.9626733, 1000)`.
  - Records: `$select=bin,doitt_id,height_roof,ground_elevation,feature_code,the_geom`, the same `$where`, `$order=doitt_id`, `$limit=5000` and `$offset` pages; a ring as `within_circle(..., 3600) AND NOT within_circle(..., 1000)`.
  - Simplified on the server: `simplify_preserve_topology(the_geom, 0.000004)` (degrees: about 0.44 m north–south and 0.34 m east–west, D by [T3]'s metres per degree), under a new alias. An alias named `the_geom` shadowed the column, so a `num_points(the_geom)` in the same select counted the simplified outline (found in this run).
  - `within_circle` on these polygons returns the footprints wholly inside the circle, not those touching it or with their centroid in it: at 250 m it returned 102 footprints of 1,470 points, where the same outlines transformed here (section 2) give 103 wholly inside, 122 by centroid and 133 touching; at 500 m it returned 443, against 446 wholly inside and 471 by centroid; and no footprint it returned within 1 km reached past 1,000 m. The counts by centroid in section 4 therefore come from records: the 24,965 footprints wholly inside 3.6 km, then sorted by centroid.
  - The ArcGIS services [U2] take a point and a distance in metres, with `returnCountOnly` or `outStatistics`: `.../BUILDING_P_view/FeatureServer/0/query?where=1=1&geometry=-73.9626733,40.77911&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=250&units=esriSRUnit_Meter&returnCountOnly=true&f=json` counts centroids by construction. The point layer differs a little from the polygons: it holds 5 points within 250 m that neither polygon copy has (BINs 1046789, 1046790, 1046791, 1046800 and 1046801 on tax block 1495, all last edited 2017-08-22, probably stale), and counts 14 buildings over 100 m within 1 km where the polygons give 17. Use the polygons.
- [D5] What the footprints cannot give:
  - One roof height per footprint, its highest roof, so a base with towers becomes a prism to the towers' top: the San Remo (BIN 1028714) is one 2,208 m² footprint at 120.5 m, where photograph #70 shows two towers over a lower block; 432 Park Avenue is two footprints of 228 m² and 2,975 m², both at 425.5 m, where photograph #46 shows a slender shaft.
  - OpenStreetMap carries building parts with heights (`building:part`) for many Midtown towers: 6,420 parts within 3.5 km, 6,252 of them with a height, but only 49 within 1 km [U9]. It has 14 parts within 40 m of Central Park Tower's centroid, 13 at 432 Park Avenue and 14 at 111 West 57th Street, and none within 40 m of the San Remo's, the Beresford's, the Eldorado's or the Majestic's. The twin-towered Central Park West buildings need massing drawn from photographs.
  - Heights can lag construction: 270 Park Avenue (BIN 1091887, `construction_year` 2025) carries 281.0 m, where its engineer gives 1,388 ft (423 m) [U13].
  - The `name` field stops at old names (it still calls 30 Rockefeller Plaza the "RCA Building" and names none of the 57th Street towers); the names in this document come from each footprint's place, year and height and, for the Fifth Avenue row, from PLUTO's addresses [U6].
  - 30 Hudson Yards (BIN 1088961) has no ground elevation.

### The park

- [P1] What the open data hold for Central Park:

| Feature | City data [U3], [U4] | OpenStreetMap [U9], inside the park's outline |
|---|---|---|
| Outline | Parks Properties M010, 840.01 acres; planimetric park boundary (code 4980) of 343.0 ha, X −1,850..+2,263, Z −814..+30 (D, by section 2's transform) | — |
| Lawns | Only ball fields (code 4900: 25 in the park, 8 of them on the Great Lawn), courts (4910: 26) and a rink (4970) | Grass and gardens 28.8 ha; pitches 24.1 ha |
| Paths and drives | Interior sidewalks (the park's paved through paths; spurs and dead ends not captured) and roadbeds; not told apart from the streets in this run (868 sidewalk and 1,461 roadbed polygons in a box round the park) | 102.6 km of footways, paths, cycleways, bridleways, pedestrian ways and steps; 7.8 km of named drives |
| Water | The Reservoir 38.68 ha, the Lake 7.08 ha, Harlem Meer 4.01 ha, the Pond 1.50 ha, Turtle Pond 0.91 ha (unnamed in the data), Conservatory Water 0.76 ha (named "BOAT BASIN"), the Pool 0.65 ha, streams; water levels as Elevation Points (code 3010) | 54.2 ha of water |
| The wall along Fifth Avenue | Not held: the retaining-wall layer keeps walls of 10 ft or more along roads (62 in the box round the park) | 3.27 km of walls and 2.31 km of fences, not located in this run |
| Trees | Section 5 | Section 5 |
| Ground | Spot elevations on roads and interior sidewalks (code 3000; 6,908 in the box, 5.15 to 138.3 ft, Y −24.4 to +16.2) | — |

- [P2] The model's site already builds the perimeter wall inside its bounds: 0.45 m thick and 0.9 m over the sidewalk (E, `src/model/site/avenue.ts`), at Z ≈ +21.5 (E, `src/model/site/ground.ts`). North and south of the site it would follow the park's east edge in the outlines above.
- [P3] Query by place: SODA's `within_box(the_geom, 40.8005, -73.9825, 40.7635, -73.9485)` (north-west and south-east corners round the whole park) or `park_name='Central Park'` on the parks layer; ohsome's `elements/count`, `elements/area` and `elements/length` with `bpolys` (the park's outline from Parks Properties, simplified on the server with `simplify_preserve_topology(multipolygon, 0.00002)`) or `bcircles=c:-73.9626733,40.77911,<metres>`, and a filter such as `natural=tree and type:node`; Overpass with `(around:<metres>,40.77911,-73.9626733)` when it answers.
- [P4] OpenStreetMap's terms [U12]: the data are under the Open Database Licence 1.0; credit OpenStreetMap and its contributors and make clear the data are under the ODbL; and "If you alter or build upon our data, you may distribute the result only under the same license". A committed data file generated from OSM data is such a result, so it would go out under the ODbL.

### Ground and water

- [G1] The ground round the origin from 3DEP [U8], exported as a 240 × 240 grid of 0.000366° cells (about 41 m by 31 m) over 40.7352..40.8230 N, 74.0066..73.9188 W, as Y = NAVD88 − 25.92 (`exterior.md` [F5]): within 250 m −3.4 to +7.4 (median +1.1); within 500 m −9.3 to +11.0; within 1 km −13.6 to +15.7 (median +0.9); within 2 km −25.9 to +15.7 (median −5.0); within 3.5 km −26.7 to +28.9 (median −17.7, the rivers' share). The cell nearest the origin, 25 m off, reads Y +1.40.
- [G2] Along the entrance axis eastward (X = 0, East 82nd Street and its line beyond), sampled every 50 m in [G1]: land to Z ≈ 1.7 km, the East River's west channel to ≈ 1.9 km, Roosevelt Island to ≈ 2.1 km, the east channel to ≈ 2.4 km, then Queens; the nearest Queens footprint on that line is BIN 4617526 at Z 2,439 [U1].
- [G3] Water levels [U3] (code 3010, NAVD88 feet): the Reservoir 113.25 (Y +8.60), Turtle Pond 98.75 (+4.18), the Lake 54.3 (−9.37), the Pool 47.62 (−11.41), Conservatory Water 39.88 (−13.76), the Pond 30.07 (−16.75), Harlem Meer 11.69 (−22.36). The rivers stand near NAVD88 0, Y ≈ −26 ([G1]'s lowest cells).
- [G4] So the ground is not flat at this scale. A building's walls can run from its own ground level, or from under the workspace ground (`src/viewer/environment.ts` lays it 0.5 m under the model's lowest point), to its roof Y, so no base floats; the rivers lie about 26 m under the plaza. A 100 m terrain grid over ±4 km would be 81 × 81 heights, 13 KB as 16-bit integers (D).
- [G5] Terms: "USGS-authored or produced data and information are considered to be in the U.S. Public Domain"; USGS asks for the credit "U.S. Geological Survey" [U12].

### What the README would credit

The README's Credits already name OpenStreetMap (ODbL), Building Footprints 5zhs-2jue (for the museum's outline), the curbs and the 3DEP DEM. Drawing the surroundings would add, as far as the generator uses each:

- Building Footprints (5zhs-2jue), OTI, for the buildings round the museum, with its version (the dataset's update date and the day the generator ran) and the modifications (outlines simplified and quantised, distant buildings reduced to boxes), as § 23-502(d) lets the city ask [D3].
- In the same form, any planimetric layer used ([U3]: hydrography, parks, elevation points), NYC Parks' Parks Properties [U4], and PLUTO [U6] if addresses are kept.
- USDA Forest Service, NLCD Tree Canopy Cover (2023, 30 m), if the canopy comes from it: a US federal work; its page states no licence and asks no credit [U7].
- U.S. Geological Survey, 3DEP, if the ground comes from it [G5].
- OpenStreetMap contributors, ODbL, and a note that the generated surroundings file is available under the ODbL, if any OSM data (woods, tree nodes, paths, building parts) goes into it [P4].
- NOAA's solar position equations, as a courtesy (a US federal work).

## 2. The transform

- [T1] `exterior.md` [F1], [F2] and [F5] define the frame; these are the steps a script repeats (`src/model/frame.ts` holds the constants):
  1. Take the WGS84 latitude φ and longitude λ in degrees (the city's GeoJSON and OSM's give them; GeoJSON's order is longitude, latitude).
  2. ECEF on the WGS84 ellipsoid at height 0: a = 6,378,137 m, f = 1/298.257223563, e² = f(2 − f); N = a/√(1 − e² sin²φ); x = N cosφ cosλ, y = N cosφ sinλ, z = N(1 − e²) sinφ.
  3. East and north in the tangent plane at φ0 = 40.7794°, λ0 = −73.9632° ([F2]), with (Δx, Δy, Δz) the difference from that point's ECEF: e = −sinλ0·Δx + cosλ0·Δy; n = −sinφ0·cosλ0·Δx − sinφ0·sinλ0·Δy + cosφ0·Δz. The up component is dropped: the frame is flat.
  4. Shift to the origin at 40.77911°, −73.9626733° ([F2]), whose own (e, n) by steps 2 and 3 are (44.462, −32.204) m: de = e − 44.462, dn = n + 32.204.
  5. Rotate by the grid bearing θ = 29.03° ([F1]; +X points to true 29.03°, +Z to 119.03°): X = de·sinθ + dn·cosθ; Z = de·cosθ − dn·sinθ.
  6. Height: Y = NAVD88 metres − 25.92 ([F5]). From the footprints' feet: ground Y = 0.3048 × `ground_elevation` − 25.92 and roof Y = 0.3048 × (`ground_elevation` + `height_roof`) − 25.92.
  7. Back: de = X·sinθ + Z·cosθ and dn = X·cosθ − Z·sinθ, add the origin's (44.462, −32.204), then find the ellipsoid point with that east and north: start from the plane point lifted to the ellipsoid and correct it by the local metres per degree; three passes reach 0.1 mm.
- [T2] The checks, both ways:
  - The Met's own city footprint (BIN 1083810) comes out at X −152.96..+154.60 and Z −180.00..+10.22, its outer ring 45,279 m², the pavilion's roof line at X −32.06 and +32.07 on Z −0.59..−0.83, its roof Y 31.31. `exterior.md` recorded X −152.97..+154.60 and Z −179.99..+10.22 ([B0]), 45,279 m² ([B00]), X ±32.06 at Z −0.7 ([H1]) and Y +31.3 ([W4]).
  - One point both ways: the south plaza fountain (OSM way 552699591, a square of 190.3 m²) has its centroid at 40.7787483 N, 73.9627574 W, which goes to X −38.57, Z +13.28; and X −38.57, Z +13.28 comes back to 40.7787483, −73.9627574. `exterior.md` [P6] has (−38.55, +13.27). The north fountain (552699597) comes out at (+38.53, +13.33) against [P6]'s (+38.49, +13.34).
  - The origin and (2,000, −3,000) make the round trip to within 0.1 mm.
- [T3] A shortcut: a plain equirectangular map at the origin, 111,049.64 m a degree of latitude and 84,415.44 m a degree of longitude (the WGS84 radii of curvature at 40.77911°), followed by step 5, differs from [T1] by at most 0.97 m within 3.5 km (D, over a grid of points 0.0008° apart). Good enough for anything beyond the site; [T1] matches the frame as `exterior.md` defined it.
- [T4] The flat frame drops the earth's curvature: a point d away lies about d²/2R under the tangent plane (R = 6,371 km): 0.08 m at 1 km, 0.96 m at 3.5 km, 5.0 m at 8 km, less with refraction. Leave it out; the largest, 5.7 m at One World Trade Center's 8.5 km, is 1.3% of its height and lies under the haze ([N5]).

## 3. What is seen from where

### From the plaza and the steps, looking east

- [V1] The east side of Fifth Avenue starts at Z ≈ 50: the footprints' west faces lie on Z 49.2 to 50.5 (and the model's `EAST_LINE_Z` is 50), 7 m past the avenue's far curb (Z 42.9, `exterior.md` [F8]) and 21 m past its near one (Z 28.92, [F7]). The row is what the facade looks at, and it fills the view: from an eye 1.6 m over the plaza on the axis (0, 1.6, 20) its roofs stand 29° (1009 Fifth) to 55° (1001 Fifth) high, so nothing behind it can show over it [V12].
- [V2] The row between East 78th and East 86th Streets [U1], [U6], by X (world frame; the floors and years are PLUTO's):

| Address | BIN | X | Z | Height | Floors | Built | Ground Y | Roof Y |
|---|---|---|---|---|---|---|---|---|
| 972 Fifth Avenue | 1041896 | −293.5..−280.2 | 47.6..79.8 | 27.5 | 6 | 1906 | −2.8 | 24.8 |
| 973 Fifth Avenue | 1041895 | −280.4..−272.4 | 50.0..80.0 | 26.9 | 5 | 1905 | −2.5 | 24.5 |
| 974 Fifth Avenue | 1041894 | −272.6..−262.0 | 48.9..80.9 | 24.3 | 5 | 1899 | −2.5 | 21.8 |
| East 79th Street | | | | | | | | |
| 980 Fifth Avenue | 1046426 | −225.8..−202.9 | 58.4..95.5 | 79.9 | 25 | 1968 | −2.8 | 77.1 |
| 985 Fifth Avenue | 1046427 | −209.9..−185.7 | 55.5..72.3 | 70.9 | 25 | 1970 | −2.1 | 68.7 |
| 988 Fifth Avenue | 1046594 | −185.8..−170.1 | 50.1..77.2 | 50.0 | 13 | 1926 | −1.5 | 48.5 |
| East 80th Street | | | | | | | | |
| 990 Fifth Avenue | 1046607 | −152.0..−144.1 | 49.8..80.1 | 51.0 | 14 | 1927 | −1.5 | 49.4 |
| 991 Fifth Avenue | 1046608 | −144.2..−136.0 | 49.8..80.3 | 22.7 | 5 | 1901 | −1.5 | 21.1 |
| 993 Fifth Avenue | 1046609 | −136.1..−112.7 | 49.9..80.5 | 74.1 | 17 | 1930 | −1.2 | 72.8 |
| 995 Fifth Avenue | 1046650 | −112.8..−89.1 | 50.0..86.6 | 53.0 | 17 | 1926 | −0.6 | 52.4 |
| East 81st Street | | | | | | | | |
| 998 Fifth Avenue | 1046660 | −71.8..−39.9 | 49.4..88.7 | 50.0 | 12 | 1912 | −0.3 | 49.7 |
| 1001 Fifth Avenue | 1046686 | −40.1..−17.4 | 49.3..71.3 | 72.2 | 23 | 1978 | −0.3 | 71.9 |
| 1009 Fifth Avenue | 1087074 | −17.5..−8.5 | 49.2..80.8 | 27.4 | 7 | 1901 | 0.0 | 27.4 |
| East 82nd Street, on the axis | | | | | | | | |
| 1010 Fifth Avenue | 1046740 | 9.8..40.5 | 50.5..95.3 | 50.7 | 14 | 1925 | 0.3 | 51.0 |
| 1014 Fifth Avenue | 1046771 | 40.5..48.3 | 49.4..88.0 | 23.8 | 6 | 1907 | 0.9 | 24.7 |
| 1016 Fifth Avenue | 1046770 | 48.2..71.3 | 50.3..102.4 | 51.4 | 15 | 1927 | 0.9 | 52.3 |
| East 83rd Street | | | | | | | | |
| 1020 Fifth Avenue | 1046777 | 89.3..108.2 | 49.6..77.0 | 50.4 | 14 | 1925 | 0.9 | 51.3 |
| 1025 Fifth Avenue | 1046778 | 90.2..152.3 | 43.3..132.2 | 37.4 | 13 | 1955 | 1.2 | 38.6 |
| 1026 Fifth Avenue | 1046797 | 121.3..132.2 | 49.7..80.4 | 28.2 | 6 | 1903 | 0.9 | 29.1 |
| 1027 Fifth Avenue | 1046796 | 132.2..144.2 | 49.7..78.9 | 27.9 | 6 | 1903 | 1.2 | 29.1 |
| 1028 Fifth Avenue | 1046795 | 144.1..152.4 | 49.7..78.9 | 24.6 | 6 | 1903 | 1.5 | 26.1 |
| East 84th Street | | | | | | | | |
| 1030 Fifth Avenue | 1046809 | 170.3..189.0 | 49.9..84.7 | 49.7 | 13 | 1925 | 1.8 | 51.5 |
| 1033 Fifth Avenue | 1046810 | 188.9..195.6 | 49.9..84.9 | 20.6 | 5 | 1870 | 1.8 | 22.4 |
| 1035 Fifth Avenue | 1046826 | 195.5..233.3 | 49.8..96.8 | 50.4 | 15 | 1925 | 2.1 | 52.5 |
| East 85th Street | | | | | | | | |
| 1040 Fifth Avenue | 1046827 | 251.1..285.3 | 50.1..77.2 | 70.4 | 17 | 1930 | 2.4 | 72.9 |
| 1045 Fifth Avenue | 1046844 | 285.3..298.6 | 50.1..70.9 | 44.7 | 15 | 1967 | 2.7 | 47.4 |
| 1048 Fifth Avenue | 1046843 | 298.6..312.9 | 50.1..80.5 | 23.1 | 5 | 1914 | 3.0 | 26.1 |
| East 86th Street | | | | | | | | |
| 1050 Fifth Avenue | 1046845 | 343.9..376.6 | 49.9..90.1 | 60.8 | 20 | 1958 | 3.0 | 63.8 |

  The 28 run from 20.6 to 79.9 m, median 50.0 m, in three kinds: town houses of 5 to 7 floors from 1870 to 1914 (20.6 to 28.2 m), apartment houses of 12 to 17 floors from 1912 to 1930 (49.7 to 74.1 m), and post-war buildings of 13 to 25 floors (37.4 to 79.9 m). The table's Z is each footprint's extent, its west face first; 1025 Fifth's 43.3 reaches into the sidewalk and its 132.2 wraps behind 1026 to 1028.
- [V3] The cross streets, as the gaps between the row's footprints (D from [V2]): East 80th Street X −170.1..−152.0 (18.1 m between buildings), 81st −89.1..−71.8 (17.3 m), 82nd −8.5..+9.8 (18.3 m, on the axis), 83rd +71.3..+89.3 (18.0 m), 84th +152.4..+170.3 (17.9 m), 85th +233.3..+251.1 (17.8 m), 86th +312.9..+343.9 (31.0 m, a wide street); East 79th Street lies in −262.0..−225.8, where 980 Fifth also stands back from the avenue. The model's own cross streets (`src/model/site/ground.ts` `CROSS_STREETS_X`: −162, −81, 0, 80, 162, from OSM centrelines) fall in these gaps.
- [V4] Through those 17 to 18 m slots, and nowhere else, the plaza sees past the row: East 82nd Street runs on the axis to Manhattan's shore at Z ≈ 1.7 km, then over the East River and Roosevelt Island to Queens from Z ≈ 2.4 km [G2]. These canyons are lined by the buildings along each street.
- [V5] Along the avenue: Fifth Avenue runs to true 209.03° southward (the grid's −X). At its far end, 1.7 to 2.1 km south, four buildings by Grand Army Plaza stand 4.6° to 5.9° over the plaza eye: the Pierre, the Sherry-Netherland, the General Motors Building and Trump Tower, at bearings 206° to 207° [V12]. West of the avenue the park's trees stand between the plaza and the 57th Street towers. Photographs #33 and #34 look north along the avenue from the landing and the steps instead; the view north was not studied further.
- [V6] On the park side the sidewalk is edged by the perimeter wall and the park's trees; inside the site (X −215..+200) the model builds them, and beyond it, north and south, the environment's wall and canopy would carry on [P2].

### From the aerial presets

- [V7] The fit presets look at the model's bounding box (`src/viewer/presets.ts` `fitBox`, vertical field 45°, margin 1.05). Taking that box as the site (X −215..+200, Z −260..+60, `frame.ts`) from Y −3 to +34 (E: the ground to just over the Great Hall's ridge at 33.37), at a 16:9 window (D, by the same formula):
  - `aerial-ne`: camera at (358, 326, 266), 603 m from the box's centre, looking 31° down. The view's top edge looks 8.5° down and meets the ground 1.74 km from the origin at its middle and 2.34 km at its corners; its bottom edge 0.21 km.
  - `aerial-sw`: camera at (−373, 326, −466); top edge 1.59 km at its middle and 2.14 km at its corners; bottom edge 0.36 km.
  - `top`: camera 546 m over the site; it sees 0.24 to 0.37 km round.
  - On a 390 × 844 phone the aerial camera backs off to 1.47 km and its top edge meets the ground 3.8 to 4.1 km out.
  - No aerial preset shows the horizon, so from them the skyline matters less than the city's floor: every block within about 2.5 km (4 km on a phone), the park, the Reservoir and the rivers.
- [V8] The `front` fit preset puts its camera at (−8, 85, 337) (D, same formula), inside the blocks east of Fifth Avenue. Its line of sight to the box's centre crosses the row (Z 50..95) at about Y 43, under the roofs of 1001 Fifth (Y 71.9), 1010 Fifth (51.0) and 998 Fifth (49.7), so once the row is drawn it hides the facade from that preset. The camera has to move, or the orbit view has to leave out what stands between camera and model. The photo cameras on the east sidewalk (`ref-front-axis` at Z 44, `ref-front-street` at 44.5, `ref-column-pair-north` at 40) stand in front of the row and are not affected.

### From the roof garden

- [V9] Where: the Cantor Roof Garden on the Wallace Wing, X −136.7..−89.3, Z −126.8..−103.9 (`src/model/frame.ts` `ROOF_GARDEN_*`, from the Met's floor map), its deck at Y 21.6 (E, `frame.ts` `ROOF_GARDEN_Y`), built by `src/model/roche-south/wallace-garden.ts`. The page reaches it through the floor picker's Roof floor (`src/viewer/floors.ts`) and has no preset there (plan item 3). An eye 1.6 m over the deck stands at Y 23.2, NAVD88 49.1 m. The photographs' geotags put their cameras at (−137, −110), (−121, −124) and (−138, −109) (section 7).
- [V10] The canopy is the view's floor. In photograph #70 the nearest crowns, west of the wing, rise to the line of sight to the feet of the Central Park West buildings; in #68 and #69 the canopy fills the lower half of the view out to the city. An eye at Y 23.2 looking at Y ≈ 1 a kilometre off passes Y ≈ 21 at 100 m; with the park's ground there at Y +2.3 to +5.2 (`exterior.md` [F11]), the nearest crowns reach some 16 to 19 m over it (E, from those photographs; no canopy height was measured). So only what stands well over the trees shows: the Central Park West row shows its top floors and its towers, and Midtown its towers.
- [V11] What the roof garden sees, by direction: south-south-east along Fifth Avenue (165° to 200°), the Carlyle's tower and the row of the avenue's 70s and 60s receding to Grand Army Plaza, with Midtown's towers over it (#46, #68); south-south-west (200° to 235°), the 57th Street towers, Midtown and the Time Warner towers over the park (#69); west (235° to 290°), Central Park West from the Century to the San Remo and the Natural History Museum (#70); north-west, over the museum's own roofs, the Beresford and the Eldorado (#71's right end). To the north-east and east the museum's own roofs close the view. Within about 250 m the view is the model's own site: its trees and the knoll of the Obelisk.
- [V12] The landmarks [U1], by the transform of section 2. Positions are footprint centroids; heights `height_roof`; roof Y adds `ground_elevation`; bearings and elevation angles are seen from the roof-garden eye at (−110, 23.2, −113) and, for the avenue's vista, from the plaza eye at (0, 1.6, 20) (D):

| Landmark | BIN | X, Z | From origin | Height | Roof Y | Roof garden: bearing, distance, elevation | Plaza: bearing, elevation |
|---|---|---|---|---|---|---|---|
| 1009 Fifth Avenue (Duke–Semans mansion) | 1087074 | −13, 65 | 66 m | 27.4 | 27.4 | 90°, 203 m, 1.2° | 135°, 28.9° |
| 1001 Fifth Avenue | 1046686 | −29, 60 | 67 m | 72.2 | 71.9 | 94°, 191 m, 14.3° | 155°, 54.9° |
| 1010 Fifth Avenue | 1046740 | 24, 72 | 76 m | 50.7 | 51.0 | 83°, 228 m, 7.0° | 94°, 41.0° |
| The Carlyle | 1041797 | −471, 230 | 524 m | 130.4 | 124.0 | 165°, 498 m, 11.4° | |
| Belvedere Castle | 1083837 | −231, −486 | 538 m | 7.6 | 24.4 | 281°, 392 m, 0.2° | |
| Delacorte Theater | 1088650 | −139, −516 | 535 m | 5.2 | 10.6 | 295°, 404 m, −1.8° | |
| The Beresford | 1031141 | −41, −866 | 868 m | 90.1 | 93.1 | 304°, 757 m, 5.3° | |
| American Museum of Natural History (larger footprint) | 1083846 | −286, −941 | 984 m | 44.8 | 43.6 | 287°, 847 m, 1.4° | |
| The San Remo | 1028714 | −617, −860 | 1,059 m | 120.5 | 121.4 | 265°, 903 m, 6.2° | |
| The Eldorado | 1031607 | 693, −867 | 1,110 m | 103.6 | 113.0 | 346°, 1,101 m, 4.7° | |
| The Dakota | 1028637 | −778, −869 | 1,167 m | 50.9 | 51.8 | 258°, 1,009 m, 1.6° | |
| The Majestic | 1028618 | −869, −867 | 1,228 m | 109.4 | 110.0 | 254°, 1,070 m, 4.6° | |
| The Pierre | 1040809 | −1730, 92 | 1,732 m | 156.9 | 146.2 | 202°, 1,633 m, 4.3° | 207°, 4.8° |
| The Century | 1076225 | −1587, −873 | 1,811 m | 105.2 | 102.4 | 236°, 1,661 m, 2.7° | |
| The Sherry-Netherland | 1040751 | −1840, 69 | 1,841 m | 161.8 | 150.8 | 203°, 1,740 m, 4.2° | 207°, 4.6° |
| 15 Central Park West | 1087510 | −1661, −909 | 1,894 m | 154.2 | 152.7 | 236°, 1,744 m, 4.2° | |
| General Motors Building | 1036082 | −1904, 130 | 1,909 m | 210.4 | 198.5 | 201°, 1,811 m, 5.5° | 206°, 5.9° |
| Trump International Hotel and Tower | 1027191 | −1742, −856 | 1,941 m | 171.0 | 169.5 | 234°, 1,793 m, 4.7° | |
| 111 West 57th Street | 1023728 | −1984, −336 | 2,012 m | 435.3 | 427.0 | 216°, 1,887 m, 12.1° | |
| 220 Central Park South | 1090184 | −1912, −667 | 2,025 m | 290.2 | 287.4 | 226°, 1,885 m, 8.0° | |
| One57 | 1088565 | −1990, −474 | 2,045 m | 310.4 | 298.6 | 220°, 1,914 m, 8.2° | |
| Deutsche Bank Center (Time Warner Center) | 1026318 | −1869, −935 | 2,090 m | 217.9 | 217.6 | 234°, 1,942 m, 5.7° | |
| Trump Tower | 1035794 | −2089, 76 | 2,091 m | 202.7 | 193.2 | 204°, 1,988 m, 4.9° | 207°, 5.2° |
| Central Park Tower | 1090180 | −1982, −671 | 2,093 m | 472.4 | 470.9 | 226°, 1,954 m, 12.9° | |
| 432 Park Avenue (larger footprint) | 1088817 | −2083, 274 | 2,101 m | 425.5 | 414.5 | 198°, 2,011 m, 11.0° | |
| 53 West 53rd Street | 1090777 | −2313, −212 | 2,323 m | 320.0 | 314.2 | 212°, 2,205 m, 7.5° | |
| Citigroup Center | 1036474 | −2310, 581 | 2,382 m | 277.7 | 263.6 | 192°, 2,307 m, 5.9° | |
| 30 Rockefeller Plaza | 1076262 | −2632, −179 | 2,638 m | 254.4 | 248.0 | 211°, 2,523 m, 5.1° | |
| 270 Park Avenue (height lags, [D5]) | 1091887 | −3126, 1 | 3,126 m | 281.0 | 276.8 | 207°, 3,018 m, 4.8° | |
| One Vanderbilt | 1090825 | −3188, 236 | 3,197 m | 427.0 | 419.4 | 203°, 3,098 m, 7.3° | |
| Bank of America Tower | 1087268 | −3189, −358 | 3,209 m | 270.6 | 263.0 | 214°, 3,089 m, 4.4° | |
| Chrysler Building | 1036156 | −3187, 543 | 3,233 m | 288.6 | 275.2 | 197°, 3,146 m, 4.6° | |
| Empire State Building | 1015862 | −3920, −49 | 3,921 m | 377.6 | 366.9 | 208°, 3,811 m, 5.2° | |
| 30 Hudson Yards (no ground elevation) | 1088961 | −4051, −1445 | 4,301 m | 385.6 | — | 228°, 4,160 m | |
| One World Trade Center | 1088469 | −8488, −170 | 8,490 m | 429.3 | 404.9 | 209°, 8,378 m, 2.6° | |

  The plaza column is left empty where the museum or the row stands between the plaza and the building. The names come from place, year and height ([D5]); the city's own names agree where it has them (Empire State Building, Chrysler Building, Citigroup Center, Bank of America Tower, Time Warner Center, Trump International, Century Apts, Dakota).

### The park's named places

- [V13] Positions in the world frame from the sources named:
  - Cleopatra's Needle (the Obelisk): OSM way 179685272 (`man_made=obelisk`, `height=21`, `start_date=1881-02-22`) [U9], its base square of 72.6 m² centred at (−60.49, −229.33). It stands inside the model's site (whose west edge is Z −260), on the knoll the site builds (`src/model/site/ground.ts`), so it belongs to the site chapter rather than the environment; the model does not build it today.
  - Turtle Pond: an unnamed water polygon [U3] centred at (−176, −411), X −215..−133, Z −500..−323, 0.91 ha, water at Y +4.18 [G3].
  - The Great Lawn: its eight ball fields [U3] lie in X −55..+305, Z −322..−484 (0.10 to 0.12 ha each); the lawn round them is not a polygon in the city's data (OSM's grass would give it).
  - Belvedere Castle and the Delacorte Theater: [V12].
  - The Reservoir, to the north: [U3] centred at (691, −321), X 308..1,147, Z −710..−38, 38.68 ha, water at Y +8.60 [G3].
  - The Lake (−651, −544), 7.08 ha, Y −9.37; Conservatory Water (−658, −66), 0.76 ha, Y −13.76 [U3], [G3].

## 4. Counts and cost

- [N1] Buildings by centroid distance from the origin [U1], the museum (BIN 1083810) left out, by the transform of section 2:

| Within | Buildings | Over 30 m | Over 60 m | Over 100 m | No height | Outline vertices | Rings |
|---|---|---|---|---|---|---|---|
| 250 m | 121 | 30 | 5 | 0 | 0 | 1,406 | 123 |
| 500 m | 470 | 143 | 27 | 0 | 0 | 5,859 | 476 |
| 1 km | 2,315 | 492 | 123 | 17 | 3 | 29,415 | 2,339 |
| 2 km | 9,977 | 1,780 | 494 | 122 | 14 | 132,539 | 10,142 |
| 3.5 km | 23,853 | 3,489 | 1,208 | 479 | 44 | 295,684 | 24,319 |

- [N2] Cross-checks: the server's counts of footprints wholly inside each circle, the museum included, are 102, 443, 2,249, 9,880 and 23,621 [D4]; the city's centroid points [U2], the museum and the stale points included, 127, 483, 2,378, 10,103 and 24,067.
- [N3] Kinds within 3.5 km (wholly inside, [U1]): 22,777 buildings, 771 garages, 18 under construction, 14 skybridges, 12 parking structures, 10 auxiliary structures, 9 cantilevered buildings, 5 canopies, 4 placeholder triangles and 1 temporary structure. Skybridges and cantilevered parts stand off the ground and placeholders are not outlines: leave them out.
- [N4] Beyond 3.5 km, from the polygons over 60 m wholly within 9 km [U1], by centroid: from 3.5 to 5 km, 169 over 100 m, 55 over 150 m and 18 over 200 m; from 5 to 6 km, 4 over 100 m; from 6 to 8 km, 27, 5 and 0; from 8 to 9 km (Lower Manhattan), 85, 37 and 20. New Jersey is not counted [D1].
- [N5] Haze: `src/viewer/environment.ts` fogs with three.js's FogExp2 at a density of 0.00025 per metre, so 1 − exp(−(0.00025 d)²) of the colour is horizon: 6% at 1 km, 22% at 2 km, 54% at 3.5 km, 79% at 5 km, 98% at 8 km (D). Past 5 km even the tallest towers are mostly haze, and One World Trade Center at 8.5 km is 99% gone.
- [N6] Simplification and boxes, measured on the 2,315 footprints within 1 km: Douglas–Peucker keeps 69% of the outline vertices at a 0.1 m tolerance, 68% at 0.25 m, 64% at 0.5 m, 55% at 1 m and 45% at 2 m. A footprint's area over that of its smallest enclosing rectangle has a median of 0.943 and a tenth percentile of 0.814; 1,539 of the 2,315 are over 0.9. The server's 0.000004° simplification kept 64% of the vertices beyond 1 km (170,183 of 266,269).
- [N7] Cost formulas (D): an extruded outline of n vertices in one ring, flat-roofed and floorless, is 2n wall and n − 2 roof triangles, 3n − 2 in all; a box (four walls and a roof) is 10. Committed bytes: an outline vertex is 4 (X and Z as 16-bit integers in 0.25 m steps, ±8.19 km); a footprint adds 4 (ground Y and height as 16-bit integers in 0.05 m steps) and 2 a ring (its vertex count); a box is 10 (X and Z as above, width and depth as bytes in whole metres, yaw as a byte in 1/256 of a half turn, ground Y as a signed byte in metres, height as 16 bits in 0.05 m).
- [N8] The three ways, by those formulas from [N1] and [N6] (D; not built, not encoded):

| Way | What is drawn | Triangles | Bytes | As base64 text |
|---|---|---|---|---|
| A, every footprint extruded | 23,853 outlines to 3.5 km, as they are | 838,414 | 1,326,786 (1,296 KiB) | 1,728 KiB |
| A, simplified at 0.5 m | the same, 64% of the vertices | 519,076 | 901,002 (880 KiB) | 1,173 KiB |
| A, simplified at 1 m | the same, 55% of the vertices | 439,240 | 794,554 (776 KiB) | 1,035 KiB |
| B, footprints near and boxes far | 2,315 outlines within 1 km simplified at 0.25 m; 21,538 boxes from 1 to 3.5 km | 270,708 | 309,326 (302 KiB) | 403 KiB |
| B, switching at 500 m | 470 outlines within 500 m; 23,383 boxes from 500 m to 3.5 km; the 169 skyline boxes of the next row | 246,520 | 254,288 (248 KiB) | 331 KiB |
| B with the skyline | B, plus the 169 buildings over 100 m from 3.5 to 5 km as boxes | 272,398 | 311,016 (304 KiB) | 405 KiB |
| C, tall buildings only far away | outlines within 1 km as in B; from 1 to 3.5 km only the 2,997 over 30 m, as boxes; the skyline boxes | 86,988 | 125,606 (123 KiB) | 164 KiB |
| C with outlines far | the same, the 2,997 as their full outlines | 231,411 | 354,134 (346 KiB) | 461 KiB |

  A cannot be committed as one file under the repository's limits (no binary over 512 KiB, no file over 1 MiB; AGENTS.md) without being split, and it costs twice B's triangles for detail no camera resolves beyond 1 km. C leaves out 18,541 of the 21,538 buildings beyond 1 km (86%), so the aerial views would show towers standing on bare ground.
- [N9] Recommendation: B with the skyline.
  - Within 1 km of the origin, every footprint as its own extruded outline, simplified at 0.25 m, walls from its ground level (or from under the workspace ground) to its roof Y. These are the buildings the plaza and the side streets see ([V1] to [V4]) and the aerial presets' foreground (0.2 to 0.4 km, [V7]); from cameras about 0.6 km away a pixel covers about 0.65 m (45° over 720 px), so a box would show where it differs from the outline: a median footprint fills 94% of its box, and one in ten 81% or less [N6].
  - From 1 to 3.5 km, every building as an instanced box: its smallest enclosing rectangle, from its ground to its roof. At 2 km a pixel covers about 2.2 m, and the aerial presets see this ring as the city's floor out to 1.6 to 2.3 km (4 km on a phone) [V7], so every building matters there but not its outline.
  - From 3.5 to 5 km, only the 169 buildings over 100 m, as boxes: the roof garden's southern skyline, the Empire State Building and Hudson Yards among them, under 54 to 79% haze [N5]. Nothing beyond 5 km: there is almost nothing over 100 m from 5 to 8 km, and Lower Manhattan at 8 km is 98% haze [N4].
  - Leave out feature codes 1003, 1005, 1006 and 2110 [N3].
  - Hand-built massing for about a dozen landmarks whose prisms would read wrong in the views that matter: the twin-towered Central Park West buildings (the San Remo, the Majestic, the Eldorado, the Century, the Beresford) from photographs #70 and #71, since neither data source has their parts [D5]; and the slim 57th Street towers (432 Park Avenue, Central Park Tower, 111 West 57th Street, One57) from OSM's parts (which would bring the ODbL, [P4]) or by hand. Their base heights could not be found in the data.
  - Data form: one generated TypeScript module like `src/model/collection/catalogue.ts`, written by a script run by hand, holding the source, version and generation date in clear and the geometry as a base64 string of a little-endian binary in the integer forms of [N7]. Budget: 400 KiB of binary, about 534 KiB of base64 text. B with the skyline is 304 KiB; the canopy cells (15 KiB, [K3]) and a terrain grid (13 KiB, [G4]) bring it to about 331 KiB.
  - Cost: about 272,000 triangles of buildings, 205,000 of canopy ([K3]) and 13,000 of terrain, about 490,000 in all; for scale, the model is 1.61 million of its 3 million budget (plan, "Limits"). The buildings make two draw calls if the near outlines are one merged mesh and the boxes one instanced mesh. The frame time was not measured: the plan records walking frame budgets that already fail on a loaded machine, so it must be.
  - Shadows: `environment.ts` fits the sun's shadow camera to the model's casters, so the surroundings must not cast into it, or the map would stretch over kilometres. One consequence for the lighting work: under the present sun (azimuth 140°, elevation 46°) the row's 50 m roofs would throw shadows 48 m long toward true 320°, reaching from Z 50 to about Z 5, across the avenue and the plaza (D: 50 / tan 46°). Drawing that needs the row alone among the shadow casters.
  - What it was measured from: counts and vertex totals from [U1]'s polygons fetched 2026-11-11 and transformed by section 2; simplification and box fits from the 2,315 footprints within 1 km; triangles and bytes by [N7]'s formulas, not from a built mesh or an encoded file.

## 5. The park's trees

- [K1] Sources and licences:
  - NYC Parks' Forestry Tree Points [U4] (species, trunk diameter and condition, as points) stop at the park's edge: three 150 m circles inside the park held 1, 0 and 0 points, against 12 within 60 m of the origin on the avenue's sidewalks. City terms [D3].
  - OpenStreetMap [U9]: 1,484 tree nodes inside the park's outline (none with a height, 191 with a leaf type, 15 with a genus or species), against the Conservancy's "roughly 18,000 trees" [U11]; 43.3 ha of woods (`natural=wood` or `landuse=forest`). ODbL [P4]. Within circles round the origin: 101 tree nodes within 250 m, 150 within 500 m, 407 within 1 km, 3,489 within 2 km and 9,183 within 3.5 km (any trees, street trees included).
  - The city's 2017 LiDAR canopy [U5], with vegetation over 8 ft classed as canopy, comes only as whole-city zip files (1.33 GB of 6 in land cover, 667 MB of canopy polygons), so it cannot be queried by place. Its per-tract summary can: Central Park's census tract (1014300) had 50.6% canopy in 2017 and 53.5% in 2010 (444.8 and 470.4 of 879.5 units; the service names no unit, and the tract's area matches the park's 840 acres with its edges, so acres, E).
  - The Forest Service's canopy cover [U7], percent canopy in 30 m cells, can be exported for a box: its 2023 layer gives 153.5 ha of canopy inside the park's outline, 45.3% of the 339.3 ha of cells in it, a little under the city's LiDAR figure. A US federal work; its page states no licence and asks no credit.
- [K2] Canopy by distance from the origin [U7], leaving out the model's site (X −215..+200, Z −260..+60), where the site chapter draws its own trees (the site holds 3.1 ha of it):

| Within | Canopy | 30 m cells with 20% or more | Clumps at one per 100 m² |
|---|---|---|---|
| 250 m | 0.6 ha | 11 | 56 |
| 500 m | 14.3 ha | 219 | 1,431 |
| 1 km | 60.9 ha | 907 | 6,086 |
| 2 km | 175.4 ha | 2,897 | 17,537 |
| 3.5 km | 300.6 ha | 5,088 | 30,061 |

  The whole park lies within 3.5 km; between 2 and 3.5 km only 13.1 of the ring's 125.2 ha of canopy lie in the park (153.5 ha within 3.5 km against 140.4 within 2 km), the rest in the city round it.
- [K3] A cheap canopy that reads as the park:
  - Commit the canopy, not trees: the 5,088 cells of 30 m with 20% cover or more within 3.5 km, each as a 16-bit cell index and a cover byte, about 15 KiB (D).
  - From the site's edge to 1 km, clumps of about 10 m, one per 100 m² of canopy, placed by a seeded jitter inside each cell in proportion to its cover: 6,086 clumps. As an instanced 20-triangle icosahedron with smooth normals and jittered size and colour, about 122,000 triangles (an 80-triangle icosphere would be 487,000).
  - From 1 to 3.5 km, one clump per cell, scaled by its cover: 4,181 clumps, about 84,000 triangles.
  - Crowns about 16 to 19 m over the ground near the museum (E, [V10]); the clumps' feet on the coarse ground [G4].
  - From the roof garden the near ring is the view's floor (#68, #69, #70): its clumps should overlap into an unbroken surface at about the eye's height. From the aerial presets the canopy is a carpet with holes where the lawns and water are, which the city's ball fields and water polygons place [P1].
  - OSM's tree nodes and woods are too sparse to place the canopy alone (1,484 of about 18,000 trees; 43.3 of the 153.5 to 180 ha of canopy). They could add single trees near the site, as the site chapter does inside it.

## 6. The sun

- [S1] The frame: +X points to true bearing 29.03° (`exterior.md` [F1], `src/model/frame.ts` `GRID_BEARING_DEG`) and +Z to 119.03°. A sun at true azimuth A (clockwise from north) and elevation h lies along (cos h·cos(A − 29.03°), sin h, cos h·sin(A − 29.03°)) in the world frame. That is `sunDirection` in `src/viewer/sun.ts`, which the page already uses.
- [S2] The short formula, NOAA's "General Solar Position Calculations" [U10], at latitude φ = 40.77911 and longitude λ = −73.9626733 (east positive):
  - Fractional year in radians: γ = 2π/365 × (day of year − 1 + (hour − 12)/24), with 366 in a leap year.
  - Equation of time in minutes: eqtime = 229.18 × (0.000075 + 0.001868 cos γ − 0.032077 sin γ − 0.014615 cos 2γ − 0.040849 sin 2γ).
  - Declination in radians: δ = 0.006918 − 0.399912 cos γ + 0.070257 sin γ − 0.006758 cos 2γ + 0.000907 sin 2γ − 0.002697 cos 3γ + 0.00148 sin 3γ.
  - Time offset in minutes: eqtime + 4λ − 60 × timezone (hours from UTC); true solar time tst = hour × 60 + minute + second / 60 + time offset; hour angle ha = tst/4 − 180, in degrees.
  - Zenith: cos Φ = sin φ sin δ + cos φ cos δ cos ha; elevation h = 90° − Φ.
  - Azimuth θ, clockwise from north: cos(180° − θ) = −(sin φ cos Φ − sin δ)/(cos φ sin Φ). The PDF gives only this cosine, whose arccos reaches no further than 180°; in the afternoon (ha > 0) take 360° − θ. Or use θ = atan2(−sin ha · cos δ, cos φ sin δ − sin φ cos δ cos ha), which needs no such rule (D; it gave the azimuths below).
- [S3] Accuracy. The PDF states none. Against the Meeus-based algorithm that NOAA's own calculator uses [U10] (Julian century, geometric mean longitude and anomaly, equation of centre, apparent longitude, obliquity), the short formula's direction differed by up to 0.46° over 2026, sampled every 10 minutes with the sun over 1° (D): its fractional-year series drifts against the calendar by up to about a day, and near the equinoxes the declination moves 0.4° a day. The Meeus-based functions put rise, transit and set within 30 s of the USNO's published times on both test dates [U10]: on 21 December 2026, 07:16:40, 11:54:00 and 16:31:30 EST against 07:17, 11:54 and 16:31; on 21 June 2026, 05:24:40, 12:57:40 and 20:30:50 EDT against 05:25, 12:58 and 20:31. NOAA's notes call the calculator's positions approximate and its sunrise and sunset good to a minute between ±72° latitude [U10]. For a renderer either will do; a test against the values below, if the short formula is what gets built, wants a tolerance of 0.5°.
- [S4] Refraction, NOAA's correction to add to the elevation h in degrees [U10]: 0 above 85°; (58.1/tan h − 0.07/tan³ h + 0.000086/tan⁵ h)/3600 from 5° to 85°; (1735 − 518.2h + 103.4h² − 12.79h³ + 0.711h⁴)/3600 from −0.575° to 5°; −20.774/tan h/3600 below. It matters only near the horizon: 0.19° at 4°.
- [S5] Worked examples at the origin (Meeus-based, D):
  - 21 June 2026, local solar noon, 12:57:43 EDT (16:57:43 UTC): azimuth 179.997°, elevation 72.659° (72.664° with refraction). World direction (−0.2606, 0.9545, 0.1447). The short formula gives 180.379° and 72.674°.
  - 21 December 2026, 16:00 EST (21:00 UTC): azimuth 233.919°, elevation 4.130° (4.315° with refraction). World direction (−0.9048, 0.0720, −0.4198), with refraction (−0.9046, 0.0752, −0.4197). The short formula gives 233.974° and 4.101°.
- [S6] The present fixed sun (azimuth 140°, elevation 46°, `src/viewer/sun.ts`) lies along (−0.2486, 0.7193, 0.6486). The sun stands there when its declination is +3.83° (D: sin δ = sin φ sin h + cos φ cos h cos A): on 30 March 2026 at about 11:14 EDT and on 12 September 2026 at about 11:06 EDT (Meeus-based with refraction, to within 0.12° and 0.20°). `sun.ts` calls it "a clear late morning in spring", which is 30 March.

## 7. Reference photographs

Entered in `exterior-images.md`, viewed on 2026-11-11 at up to 2,000 px wide (not at full size); no copy is committed. Their directions come from the bearings of the landmarks in them [V12].

- #68: from the roof garden's south edge, looking true 197° along Fifth Avenue toward Midtown, about 24° across (2007, CC0). Checks: the canopy's top below the eye, the row of the avenue's 70s and 60s, the Citigroup Center, the Chrysler Building, the General Motors Building, the Pierre, the Sherry-Netherland and the Plaza, in place and height against each other. It predates the 57th Street towers.
- #69: from the roof garden, looking true 219°, about 62° across (2014, CC BY-SA 3.0). Checks: the canopy as an unbroken floor up to the city; the skyline from the Citigroup Center past 432 Park Avenue (topping out), the GM Building and One57 to the Time Warner Center's two towers and the Upper West Side.
- #70: from the roof garden, looking west at the San Remo (2017, CC BY-SA 4.0). Checks: the nearest crowns at the eye's height, and what shows of Central Park West over them; the San Remo's twin towers on their block.
- #71: a stitched panorama of about 180° from the Carlyle to the Eldorado (2007, CC BY 2.0). Checks: the whole sweep's layout; too small and distorted to measure.
- #46: from the roof garden, looking true 183°, about 49° across (2017). Checks: the Carlyle's tower, the row of the 70s, and Midtown with 432 Park Avenue complete.
- #33 and #34: from high on the landing and from the steps, looking north along the avenue (2008 and 2011). Check: the east side from 82nd Street north, its town houses and apartment houses, and the corner of East 82nd Street (#34). No photograph found shows the row south of the axis from the steps.

## 8. What could not be found

- OpenStreetMap's geometry beyond three ways: Overpass did not answer during this run and ohsome's extraction endpoints refused, so the park's paths, woods, walls and the building parts were counted and measured, not located [U9].
- The base heights of the twin-towered Central Park West buildings: neither the city's footprints nor OSM holds their parts [D5]; the city's 3-D building model (2014) was not looked at.
- Canopy heights: no source that can be queried by place gives them; [V10]'s 16 to 19 m is an estimate from photographs.
- New Jersey's buildings and the Palisades, west of the Hudson, are outside the city's data [D1]; OSM covers them but was not counted.
- How much the recommended surroundings cost in frame time: not measured, as nothing was built.
- The aerial presets' camera positions assume the site box from Y −3 to +34 ([V7]); the model's real bounds were not read from a running page.
- The current wording of NYC Open Data's own terms of use: the link in the dataset's metadata now redirects to a general page; [D3] rests on the Administrative Code.
- Photographs of the view east from the steps toward the row south of 82nd Street, and of the roof garden's view since the 57th Street towers were finished (the roof garden closed in October 2025, `exterior.md` [K6]).
