# Lower Alabama Outdoors — Unified App

This package combines:
- the original fishing/weather/tide PWA
- the NOAA GOES multi-sector satellite viewer
- the four-camera/video viewer

## Run with Docker

```bash
docker compose up -d --build
```

Open: `http://localhost:5001`

## Run without Docker

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Main routes
- `/` full fishing app
- `/goes` full-screen satellite viewer
- `/cameras` full-screen camera viewer
- `/health` health check

The Satellite and Cameras tools are also available as tabs in the main fishing app.

- NOAA Weather Radio, fishing reports, and alerts at `/radio`
# LAoutdoors
