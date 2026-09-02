# Données géographiques Sénégal — Entomo

## Fichier officiel

**`senegal-regions-official.geojson`** — Limites administratives ADM1 (14 régions)

| Attribut | Valeur |
|----------|--------|
| Source | Gouvernement du Sénégal, OCHA ROWCA |
| Référence HDX | [Senegal administrative boundaries (COD-AB)](https://data.humdata.org/dataset/cod-ab-sen) |
| Portail national | [Géo Sénégal / ANAT](https://www.geosenegal.gouv.sn/) |
| Fournisseur technique | geoBoundaries (gbOpen) |
| Licence | CC BY 3.0 IGO |
| Année | 2019 |
| Propriété région | `shapeName` (ex. Dakar, Kédougou, Saint Louis) |

## Fichier simplifié (fallback)

**`senegal-regions.geojson`** — Rectangles approximatifs (développement hors-ligne)

## Normalisation des noms

Le module `analytics-maps.js` normalise les noms officiels vers les libellés Entomo :
- `Saint Louis` → `Saint-Louis`
- `Sedhiou` → `Sédhiou`
- `Kedougou` → `Kédougou`
- `Thies` → `Thiès`
