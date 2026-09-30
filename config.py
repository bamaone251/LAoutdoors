# config.py
# Everything sector/band-specific lives here so this app can be pointed at
# whatever NOAA STAR sector pages you want just by editing this file.

# NOAA STAR CDN uses the current operational satellite name in the path,
# not the "G16"/"G18" alias used in the sector.php URLs. As of mid-2026
# GOES-East imagery is served from the GOES19 path, GOES-West from GOES18.
SAT_CDN_EAST = "GOES19"
SAT_CDN_WEST = "GOES18"

CDN_REFERER = "https://www.star.nesdis.noaa.gov/"

# How long to cache a fetched image in the proxy before re-checking NOAA (seconds).
CACHE_TTL_SECONDS = 240

DEFAULT_GIF_SIZES = ["600x600", "1200x1200", "300x300"]

# ---------------------------------------------------------------------------
# SECTORS — one entry per tab. Add/remove/reorder freely.
#   key        = short slug used in URLs, e.g. /api/bands/<key>
#   code       = NOAA's sector code from the page URL (sector.php?sector=XX)
#   label      = display name for the tab / header
#   sat        = "east" or "west" (picks SAT_CDN_EAST / SAT_CDN_WEST above)
# ---------------------------------------------------------------------------
SECTORS = [
    
    {"key": "ga",  "code": "ga",  "label": "Gulf of America", "sat": "east"},
    {"key": "smv", "code": "smv", "label": "So. Mississippi Valley", "sat": "east"},
    {"key": "umv",  "code": "umv",  "label": "Upper Mississippi Valley", "sat": "east"},
    {"key": "se",  "code": "se",  "label": "Southeast", "sat": "east"},
    {"key": "eus", "code": "eus", "label": "Eastern US", "sat": "east"},
    {"key": "wus", "code": "wus", "label": "Western US", "sat": "west"},
    
]

DEFAULT_SECTOR_KEY = "smv"

# Cards shown on every sector's page. Not every sector publishes every band
# (some regional sectors skip GLM lightning or DMW) — missing ones will just
# fall back through the proxy to latest.jpg or show "unavailable".
BANDS = [
    {"id": "GEOCOLOR", "label": "GeoColor", "group": "RGB",
     "desc": "True color by day, IR at night"},
    {"id": "AirMass", "label": "Air Mass RGB", "group": "RGB",
     "desc": "Composite from IR and water vapor"},
    {"id": "Sandwich", "label": "Sandwich RGB", "group": "RGB",
     "desc": "Bands 3 & 13 combo"},
    {"id": "DayNightCloudMicroCombo", "label": "Day/Night Cloud Micro Combo", "group": "RGB",
     "desc": "Cloud reflectance by day, low clouds/fog by night"},
    {"id": "FireTemperature", "label": "Fire Temperature RGB", "group": "RGB",
     "desc": "Fire identification"},
    {"id": "Dust", "label": "Dust RGB", "group": "RGB",
     "desc": "Airborne dust"},
    {"id": "01", "label": "Band 1 - Visible (Blue)", "group": "Single Band"},
    {"id": "02", "label": "Band 2 - Visible (Red)", "group": "Single Band"},
    {"id": "03", "label": "Band 3 - Near IR (Veggie)", "group": "Single Band"},
    {"id": "04", "label": "Band 4 - Near IR (Cirrus)", "group": "Single Band"},
    {"id": "05", "label": "Band 5 - Near IR (Snow/Ice)", "group": "Single Band"},
    {"id": "06", "label": "Band 6 - Near IR (Cloud Particle)", "group": "Single Band"},
    {"id": "07", "label": "Band 7 - IR (Shortwave)", "group": "Single Band"},
    {"id": "08", "label": "Band 8 - IR (Water Vapor, Upper)", "group": "Single Band"},
    {"id": "09", "label": "Band 9 - IR (Water Vapor, Mid)", "group": "Single Band"},
    {"id": "10", "label": "Band 10 - IR (Water Vapor, Lower)", "group": "Single Band"},
    {"id": "11", "label": "Band 11 - IR (Cloud-Top Phase)", "group": "Single Band"},
    {"id": "12", "label": "Band 12 - IR (Ozone)", "group": "Single Band"},
    {"id": "13", "label": "Band 13 - IR (Clean Longwave)", "group": "Single Band"},
    {"id": "14", "label": "Band 14 - IR (Longwave)", "group": "Single Band"},
    {"id": "15", "label": "Band 15 - IR (Dirty Longwave)", "group": "Single Band"},
    {"id": "16", "label": "Band 16 - IR (CO2 Longwave)", "group": "Single Band"},
]


def sector_lookup(key):
    for s in SECTORS:
        if s["key"] == key:
            return s
    return None


def sat_cdn_for(sector):
    return SAT_CDN_EAST if sector["sat"] == "east" else SAT_CDN_WEST


def cdn_root_for(sector):
    sat = sat_cdn_for(sector)
    return f"https://cdn.star.nesdis.noaa.gov/{sat}/ABI/SECTOR/{sector['code']}"
