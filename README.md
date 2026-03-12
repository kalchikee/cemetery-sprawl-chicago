# Cemetery Sprawl — Chicago

**Quantifying urban land locked in perpetual non-use and its relationship to racial equity.**

[**Live Map →**](https://kalchikee.github.io/cemetery-sprawl-chicago/)

---

## Overview

Chicago has over 29 mapped cemeteries covering **~1,550 acres** of urban land. This project maps every cemetery in Chicago, calculates total acreage and estimated land value, analyzes the relationship between cemetery preservation and historical redlining, and models the theoretical housing capacity of cemetery land to contextualize the scale of permanently locked urban land.

This is a spatial analysis and data visualization portfolio project exploring:

- **Land use**: How much prime urban land is locked in cemetery use?
- **Opportunity cost**: What is the theoretical housing capacity of cemetery land near transit?
- **Racial equity**: Does the pattern of cemetery preservation vs. destruction correlate with HOLC redlining and the racial composition of surrounding neighborhoods?

---

## Map Features

| Layer | Source |
|-------|--------|
| Cemetery boundaries | OpenStreetMap (`landuse=cemetery`) |
| % Black population by Census tract | ACS 5-Year Estimates 2022, Table B03002 |
| CTA rail stations | City of Chicago Open Data |
| Chicago community areas | City of Chicago Open Data |
| HOLC redlining grades | [Mapping Inequality](https://dsl.richmond.edu/panorama/redlining/) *(manual download, see below)* |

---

## Key Findings

- **29 mapped cemeteries** covering **~1,553 total acres**
- **Estimated 62,000+ theoretical housing units** at average Chicago residential density (~40 units/acre)
- **5 cemeteries** are within 800m of a CTA rail station (Graceland, Calvary, Saint Boniface, Wunder's, All Saints)
- Rosehill Cemetery alone covers **309 acres** — larger than many Chicago neighborhoods

---

## Adding the HOLC Redlining Layer

The HOLC redlining layer requires a manual download due to restrictions on the Mapping Inequality project's data distribution:

1. Visit [Mapping Inequality — Chicago](https://dsl.richmond.edu/panorama/redlining/#loc=11/41.83/-87.7&city=chicago-il)
2. Download the Chicago GeoJSON file
3. Save it as `data/holc_chicago.geojson`
4. Reload the map — the HOLC layer will appear automatically

---

## Data Sources

| Dataset | Source |
|---------|--------|
| Cemetery Boundaries | [OpenStreetMap](https://www.openstreetmap.org) via osmnx |
| Parcel-Level Land Values | [Cook County Assessor](https://datacatalog.cookcountyil.gov) |
| HOLC Redlining Maps | [Mapping Inequality Project](https://dsl.richmond.edu/panorama/redlining/) |
| Racial Composition | [Census ACS B03002](https://data.census.gov) |
| CTA Rail Stations | [City of Chicago Open Data](https://data.cityofchicago.org) |
| Community Areas | [City of Chicago Open Data](https://data.cityofchicago.org) |

---

## Technical Stack

- **GIS Analysis**: Python (`osmnx`, `geopandas`, `shapely`)
- **Web Map**: [Leaflet.js](https://leafletjs.com) with CartoDB dark basemap
- **Data**: GeoJSON, Census API, Socrata API
- **Hosting**: GitHub Pages

---

## Methodology Notes

### Cemetery Inventory
Cemetery polygons were extracted from OpenStreetMap using the `landuse=cemetery` tag for the Chicago metro area. Acreage was calculated after projecting to UTM Zone 16N (EPSG:32616). Transit proximity was measured from each cemetery's centroid to the nearest CTA rail station.

### Housing Capacity Estimate
Theoretical housing unit capacity is calculated at ~40 units/acre, approximating Chicago's average medium-density residential zoning. **This is explicitly a thought experiment to contextualize scale — not a development proposal.**

### Racial Composition
ACS 2022 5-Year Estimates (Table B03002) for Cook County Census tracts. Joined to TIGER/Line tract boundaries.

---

## Repository Structure

```
cemetery-sprawl-chicago/
├── index.html          # Interactive web map
├── css/
│   └── style.css       # Dark-theme styles
├── js/
│   └── map.js          # Leaflet map logic
├── data/
│   ├── cemeteries.geojson      # OSM cemetery polygons + computed attributes
│   ├── census_tracts.geojson   # Cook County tracts + ACS racial composition
│   ├── cta_stations.geojson    # CTA rail stations
│   └── community_areas.geojson # Chicago community areas
└── README.md
```

---

*Analysis by [kalchikee](https://github.com/kalchikee)*
