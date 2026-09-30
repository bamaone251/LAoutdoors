import logging
import time
import xml.etree.ElementTree as ET
import requests
from flask import Flask, Response, abort, jsonify, render_template, send_from_directory
import config

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("lower-alabama-outdoors")
_cache = {}
HEADERS = {"Referer": config.CDN_REFERER, "User-Agent": "Mozilla/5.0 Chrome/124 Safari/537.36"}

def _band_lookup(band_id):
    return next((b for b in config.BANDS if b["id"] == band_id), None)

def _fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.ok and r.content:
            return r.content, r.headers.get("Content-Type", "image/jpeg")
    except requests.RequestException as exc:
        log.warning("NOAA fetch failed: %s", exc)
    return None

def _cached_fetch(key, urls):
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < config.CACHE_TTL_SECONDS:
        return cached[1], cached[2]
    for url in urls:
        result = _fetch(url)
        if result:
            _cache[key] = (now, result[0], result[1])
            return result
    return (cached[1], cached[2]) if cached else None

@app.get("/")
def index(): return render_template("index.html")

@app.get("/goes")
def goes():
    return render_template("goes.html", sectors=config.SECTORS, default_sector=config.DEFAULT_SECTOR_KEY)

@app.get("/cameras")
def cameras(): return render_template("cameras.html")

@app.get("/radio")
def radio(): return render_template("radio.html")

@app.get("/api/fishing-reports")
def fishing_reports():
    try:
        response = requests.get("https://feeds.libsyn.com/119027/rss", headers={"User-Agent": HEADERS["User-Agent"]}, timeout=15)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        reports = []
        for item in root.findall("./channel/item")[:3]:
            enclosure = item.find("enclosure")
            reports.append({
                "title": (item.findtext("title") or "Fishing report").strip(),
                "link": (item.findtext("link") or "").strip(),
                "published": (item.findtext("pubDate") or "").strip(),
                "audio": enclosure.get("url", "") if enclosure is not None else "",
            })
        return jsonify({"reports": reports})
    except (requests.RequestException, ET.ParseError) as exc:
        log.warning("Fishing report feed failed: %s", exc)
        return jsonify({"reports": [], "error": "Fishing reports are temporarily unavailable."}), 502

@app.get("/api/radio-alerts")
def radio_alerts():
    try:
        response = requests.get(
            "https://api.weather.gov/alerts/active",
            params={"point": "30.507,-87.8477"},
            headers={"User-Agent": "LowerAlabamaOutdoors/1.0 contact@example.com", "Accept": "application/geo+json"},
            timeout=15,
        )
        response.raise_for_status()
        features = response.json().get("features", [])
        alerts = []
        for feature in features[:8]:
            props = feature.get("properties", {})
            alerts.append({
                "event": props.get("event") or "Weather Alert",
                "headline": props.get("headline") or "",
                "description": props.get("description") or "",
                "severity": props.get("severity") or "Unknown",
                "urgency": props.get("urgency") or "Unknown",
                "url": props.get("@id") or feature.get("id") or "",
            })
        return jsonify({"alerts": alerts})
    except (requests.RequestException, ValueError) as exc:
        log.warning("Weather alerts failed: %s", exc)
        return jsonify({"alerts": [], "error": "Weather alerts are temporarily unavailable."}), 502

@app.get("/api/sectors")
def sectors(): return jsonify({"sectors": config.SECTORS, "default": config.DEFAULT_SECTOR_KEY})

@app.get("/api/bands/<sector_key>")
def bands(sector_key):
    sector = config.sector_lookup(sector_key)
    if not sector: abort(404)
    return jsonify({"sector_key": sector["key"], "sector_label": sector["label"], "bands": config.BANDS})

@app.get("/proxy/<sector_key>/loop/<band_id>")
def proxy_loop(sector_key, band_id):
    sector, band = config.sector_lookup(sector_key), _band_lookup(band_id)
    if not sector or not band: abort(404)
    base = f"{config.cdn_root_for(sector)}/{band_id}"
    sat, code = config.sat_cdn_for(sector), sector["code"].upper()
    urls = [f"{base}/{sat}-{code}-{band_id}-{size}.gif" for size in config.DEFAULT_GIF_SIZES]
    urls.append(f"{base}/latest.jpg")
    result = _cached_fetch(f"loop:{sector_key}:{band_id}", urls)
    if not result: abort(502)
    return Response(result[0], mimetype=result[1], headers={"Cache-Control": f"public,max-age={config.CACHE_TTL_SECONDS}"})

@app.get("/proxy/<sector_key>/still/<band_id>")
def proxy_still(sector_key, band_id):
    sector, band = config.sector_lookup(sector_key), _band_lookup(band_id)
    if not sector or not band: abort(404)
    result = _cached_fetch(f"still:{sector_key}:{band_id}", [f"{config.cdn_root_for(sector)}/{band_id}/latest.jpg"])
    if not result: abort(502)
    return Response(result[0], mimetype=result[1], headers={"Cache-Control": f"public,max-age={config.CACHE_TTL_SECONDS}"})

@app.get("/manifest.webmanifest")
def manifest(): return send_from_directory("static", "manifest.webmanifest", mimetype="application/manifest+json")

@app.get("/sw.js")
def sw():
    response = send_from_directory("static", "sw.js", mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response

@app.get("/health")
def health(): return {"status": "ok"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
