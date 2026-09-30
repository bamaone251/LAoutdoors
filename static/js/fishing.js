/* ============================================================
   LOWER ALABAMA OUTDOORS — app.js
   Weather (Fairhope) + Tides/Marine/Bite (Point Clear)
   ============================================================ */

// ── Locations ──
const WX_LAT = 30.5227,  WX_LON  = -87.9036;  // Fairhope, AL (weather)
const MB_LAT = 30.4502,  MB_LON  = -87.9486;  // Point Clear, AL (tides/marine)
const NOAA_STATION = '8733821';               // Point Clear NOAA CO-OPS station

// ── WMO weather code → emoji + description ──
const WMO_CODES = {
  0:  { icon: '☀️',  desc: 'Clear' },
  1:  { icon: '🌤️', desc: 'Mostly Clear' },
  2:  { icon: '⛅',  desc: 'Partly Cloudy' },
  3:  { icon: '☁️',  desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Foggy' },
  48: { icon: '🌫️', desc: 'Icy Fog' },
  51: { icon: '🌦️', desc: 'Light Drizzle' },
  53: { icon: '🌦️', desc: 'Drizzle' },
  55: { icon: '🌧️', desc: 'Heavy Drizzle' },
  61: { icon: '🌧️', desc: 'Light Rain' },
  63: { icon: '🌧️', desc: 'Rain' },
  65: { icon: '🌧️', desc: 'Heavy Rain' },
  71: { icon: '🌨️', desc: 'Light Snow' },
  73: { icon: '❄️',  desc: 'Snow' },
  75: { icon: '❄️',  desc: 'Heavy Snow' },
  77: { icon: '🌨️', desc: 'Snow Grains' },
  80: { icon: '🌦️', desc: 'Light Showers' },
  81: { icon: '🌧️', desc: 'Showers' },
  82: { icon: '🌧️', desc: 'Heavy Showers' },
  85: { icon: '🌨️', desc: 'Snow Showers' },
  86: { icon: '❄️',  desc: 'Heavy Snow Showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'T-Storm w/ Hail' },
  99: { icon: '⛈️', desc: 'Severe T-Storm' },
};
function wmoLookup(code) { return WMO_CODES[code] || { icon: '🌡️', desc: `Code ${code}` }; }

// ── Unit helpers ──
function degToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
function mpsToMph(v) { return (v * 2.23694).toFixed(0); }
function cToF(c) { return (c * 9/5 + 32).toFixed(0); }
function mmToIn(mm) { return (mm * 0.0393701).toFixed(2); }
function kmToMi(km) { return (km * 0.621371).toFixed(0); }
function hpaToInHg(h) { return (h * 0.02953).toFixed(2); }

// ── Live clock ──
function updateClock() {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clock').textContent =
    `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── Tab switching ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ============================================================
   TODAY — Open-Meteo weather (Fairhope)
   ============================================================ */
async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${WX_LAT}&longitude=${WX_LON}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,` +
    `precipitation,weather_code,wind_speed_10m,wind_direction_10m,` +
    `surface_pressure,visibility,dew_point_2m,cloud_cover` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=celsius&wind_speed_unit=ms&precipitation_unit=mm` +
    `&timezone=America%2FChicago&forecast_days=7`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    renderCurrent(data.current);
    renderHourly(data.hourly);
    renderDaily(data.daily);

    document.getElementById('conditions-updated').textContent =
      'Updated ' + new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  } catch (err) {
    console.error('Weather fetch failed:', err);
    document.getElementById('wx-desc').textContent = 'Could not load conditions';
  }
}

function renderCurrent(c) {
  jubileeInputs.cloudCoverPct = c.cloud_cover;
  const wx = wmoLookup(c.weather_code);
  document.getElementById('temp').textContent        = cToF(c.temperature_2m);
  document.getElementById('feels-like').textContent  = cToF(c.apparent_temperature);
  document.getElementById('wx-desc').textContent     = wx.icon + ' ' + wx.desc;
  document.getElementById('humidity').textContent    = c.relative_humidity_2m + '%';
  document.getElementById('wind').textContent        =
    mpsToMph(c.wind_speed_10m) + ' mph ' + degToCompass(c.wind_direction_10m);
  document.getElementById('rain').textContent        = mmToIn(c.precipitation) + ' in';
  document.getElementById('pressure').textContent    = hpaToInHg(c.surface_pressure) + '"';
  document.getElementById('dewpoint').textContent    = cToF(c.dew_point_2m) + '°F';
  document.getElementById('visibility').textContent =
    c.visibility != null ? kmToMi(c.visibility / 1000) + ' mi' : '-- mi';
}

function renderHourly(h) {
  const now   = new Date();
  const strip = document.getElementById('hourly-strip');
  const times = h.time, temps = h.temperature_2m, pops = h.precipitation_probability, codes = h.weather_code;
  strip.innerHTML = '';

  let startIdx = 0;
  for (let i = 0; i < times.length; i++) {
    if (new Date(times[i]) >= now) { startIdx = i; break; }
  }

  for (let i = startIdx; i < Math.min(startIdx + 24, times.length); i++) {
    const t   = new Date(times[i]);
    const wx  = wmoLookup(codes[i]);
    const hr  = t.getHours();
    const lbl = hr === 0 ? '12 AM' : hr < 12 ? `${hr} AM` : hr === 12 ? '12 PM' : `${hr-12} PM`;
    const pop = pops[i];

    const el = document.createElement('div');
    el.className = 'hourly-item';
    el.innerHTML = `
      <span class="hourly-time">${lbl}</span>
      <span class="hourly-icon">${wx.icon}</span>
      <span class="hourly-temp">${cToF(temps[i])}°</span>
      ${pop > 10 ? `<span class="hourly-pop">${pop}%💧</span>` : ''}
    `;
    strip.appendChild(el);
  }
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderDaily(d) {
  const list = document.getElementById('daily-list');
  list.innerHTML = '';

  for (let i = 0; i < d.time.length; i++) {
    const dt  = new Date(d.time[i] + 'T12:00:00');
    const wx  = wmoLookup(d.weather_code[i]);
    const pop = d.precipitation_probability_max[i];
    const hi  = cToF(d.temperature_2m_max[i]);
    const lo  = cToF(d.temperature_2m_min[i]);
    const day = i === 0 ? 'Today' : DAYS[dt.getDay()];

    const el = document.createElement('div');
    el.className = 'daily-item';
    el.innerHTML = `
      <span class="daily-day">${day}</span>
      <span class="daily-icon">${wx.icon}</span>
      <div class="daily-desc">${wx.desc}${pop > 10 ? ' · ' + pop + '% precip' : ''}</div>
      <div class="daily-temps">
        <span class="daily-high">${hi}°</span>
        <span class="daily-low">${lo}°</span>
      </div>
    `;
    list.appendChild(el);
  }
}

async function checkAlerts() {
  try {
    const res  = await fetch(`https://api.weather.gov/alerts/active?point=${WX_LAT},${WX_LON}`);
    const data = await res.json();
    const features = data.features || [];
    if (features.length > 0) {
      const alert = features[0].properties;
      const banner = document.getElementById('alerts-banner');
      banner.style.display = 'flex';
      document.getElementById('alert-text').innerHTML =
        `<strong>${alert.event}</strong> — ${alert.headline || (alert.description || '').slice(0,120) + '...'}`;
    }
  } catch (e) { /* alerts optional, fail silently */ }
}

/* ============================================================
   SUN / MOON
   ============================================================ */
function calcSunTimes() {
  const now = new Date();
  const rad = Math.PI/180;
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  const declination = 23.45 * Math.sin(rad * (360/365) * (dayOfYear - 81));
  const latRad = WX_LAT * rad;
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination*rad)) / rad;
  const sunriseHr = 12 - hourAngle/15;
  const sunsetHr  = 12 + hourAngle/15;

  function hrToStr(hr) {
    const h = Math.floor(hr);
    const m = Math.round((hr-h)*60);
    const d = new Date();
    d.setHours(h, m, 0);
    return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  }

  document.getElementById('sunrise').textContent = hrToStr(sunriseHr + 1); // CDT correction approx
  document.getElementById('sunset').textContent  = hrToStr(sunsetHr + 1);
}

function calcMoonPhase() {
  const knownNewMoon = new Date(2000, 0, 6, 18, 14);
  const synodic = 29.53058867;
  const now = new Date();
  const days = (now - knownNewMoon) / 86400000;
  const phase = (days % synodic) / synodic;

  let icon, name;
  if (phase < 0.03 || phase > 0.97)      { icon='🌑'; name='New Moon'; }
  else if (phase < 0.22)                  { icon='🌒'; name='Waxing Crescent'; }
  else if (phase < 0.28)                  { icon='🌓'; name='First Quarter'; }
  else if (phase < 0.47)                  { icon='🌔'; name='Waxing Gibbous'; }
  else if (phase < 0.53)                  { icon='🌕'; name='Full Moon'; }
  else if (phase < 0.72)                  { icon='🌖'; name='Waning Gibbous'; }
  else if (phase < 0.78)                  { icon='🌗'; name='Last Quarter'; }
  else                                     { icon='🌘'; name='Waning Crescent'; }

  document.getElementById('moon-icon').textContent = icon;
  document.getElementById('moon-phase').textContent = name;
  return { phase, icon, name };
}

/* ============================================================
   TIDES — NOAA CO-OPS API (Point Clear)
   ============================================================ */
async function fetchTides() {
  const today = new Date();
  const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const begin = new Date(today); begin.setDate(begin.getDate()-1);
  const end   = new Date(today); end.setDate(end.getDate()+2);

  const hiloUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=predictions&application=lowalabamaoutdoors&begin_date=${fmt(begin)}&end_date=${fmt(end)}` +
    `&datum=MLLW&station=${NOAA_STATION}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;

  const curveUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=predictions&application=lowalabamaoutdoors&begin_date=${fmt(begin)}&end_date=${fmt(end)}` +
    `&datum=MLLW&station=${NOAA_STATION}&time_zone=lst_ldt&units=english&interval=6&format=json`;

  try {
    const [hiloRes, curveRes] = await Promise.all([fetch(hiloUrl), fetch(curveUrl)]);
    const hiloData  = await hiloRes.json();
    const curveData = await curveRes.json();

    if (hiloData.error || curveData.error) throw new Error('NOAA station data unavailable');

    renderTideEvents(hiloData.predictions);
    renderTideGraph(curveData.predictions, hiloData.predictions);
    renderTideNow(curveData.predictions);

    document.getElementById('tide-updated').textContent =
      'Updated ' + new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  } catch (err) {
    console.error('Tide fetch failed:', err);
    document.getElementById('tide-events').innerHTML =
      '<div class="hourly-loading">Tide data unavailable — try the Point Clear tide chart link on the Links tab</div>';
  }
}

function renderTideNow(predictions) {
  const now = new Date();
  let closest = predictions[0], minDiff = Infinity;
  for (let i=0;i<predictions.length;i++){
    const t = new Date(predictions[i].t.replace(' ','T'));
    const diff = Math.abs(t-now);
    if (diff < minDiff) { minDiff = diff; closest = predictions[i]; }
  }
  const idx = predictions.indexOf(closest);
  const next = predictions[idx+1] || closest;
  const rising = parseFloat(next.v) > parseFloat(closest.v);

  document.getElementById('tide-height').textContent = parseFloat(closest.v).toFixed(1);
  document.getElementById('tide-arrow').textContent = rising ? '↗' : '↘';
  document.getElementById('tide-arrow').style.color = rising ? 'var(--accent)' : 'var(--amber)';
  document.getElementById('tide-stage').textContent = rising ? 'Rising' : 'Falling';
  jubileeInputs.tideRising = rising;
  jubileeInputs.tideHeightFt = parseFloat(closest.v);
}

function renderTideEvents(hilo) {
  const now = new Date();
  const container = document.getElementById('tide-events');
  container.innerHTML = '';

  const upcoming = hilo.filter(p => new Date(p.t.replace(' ','T')) >= new Date(now - 60*60*1000)).slice(0, 6);

  upcoming.forEach(p => {
    const t = new Date(p.t.replace(' ','T'));
    const isHigh = p.type === 'H';
    const timeStr = t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const dayStr = t.toDateString() === now.toDateString() ? 'Today' :
                   t.toDateString() === new Date(now.getTime()+86400000).toDateString() ? 'Tomorrow' :
                   t.toLocaleDateString('en-US',{weekday:'short'});

    const el = document.createElement('div');
    el.className = 'tide-event';
    el.innerHTML = `
      <span class="tide-event-type ${isHigh?'high':'low'}">${isHigh?'HIGH':'LOW'}</span>
      <span class="tide-event-time">${dayStr} ${timeStr}</span>
      <span class="tide-event-height">${parseFloat(p.v).toFixed(1)} ft</span>
    `;
    container.appendChild(el);
  });
}

function renderTideGraph(predictions, hilo) {
  const svg = document.getElementById('tide-graph');
  const W = 720, H = 220, PAD = 20;

  const now = new Date();
  const winStart = new Date(now.getTime() - 6*3600*1000);
  const winEnd   = new Date(now.getTime() + 30*3600*1000);

  const pts = predictions
    .map(p => ({ t: new Date(p.t.replace(' ','T')), v: parseFloat(p.v) }))
    .filter(p => p.t >= winStart && p.t <= winEnd);

  if (pts.length < 2) return;

  const vMin = Math.min(...pts.map(p=>p.v));
  const vMax = Math.max(...pts.map(p=>p.v));
  const vRange = (vMax - vMin) || 1;

  const xScale = t => PAD + ((t - winStart) / (winEnd - winStart)) * (W - PAD*2);
  const yScale = v => (H - PAD) - ((v - vMin) / vRange) * (H - PAD*2 - 20);

  let pathD = `M ${xScale(pts[0].t)} ${yScale(pts[0].v)}`;
  for (let i=1;i<pts.length;i++) pathD += ` L ${xScale(pts[i].t)} ${yScale(pts[i].v)}`;

  const fillD = pathD + ` L ${xScale(pts[pts.length-1].t)} ${H} L ${xScale(pts[0].t)} ${H} Z`;
  const nowX = xScale(now);

  let svgContent = `
    <defs>
      <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${fillD}" fill="url(#tideFill)" />
    <path d="${pathD}" fill="none" stroke="#00d4ff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${nowX}" y1="0" x2="${nowX}" y2="${H}" stroke="#f1c40f" stroke-width="1.5" stroke-dasharray="4,3" />
    <circle cx="${nowX}" cy="${yScale(interpAt(pts, now))}" r="5" fill="#f1c40f" stroke="#0a0d12" stroke-width="2"/>
  `;

  hilo.forEach(p => {
    const t = new Date(p.t.replace(' ','T'));
    if (t < winStart || t > winEnd) return;
    const x = xScale(t), y = yScale(parseFloat(p.v));
    const isHigh = p.type === 'H';
    const label = t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    svgContent += `
      <circle cx="${x}" cy="${y}" r="4" fill="${isHigh?'#00d4ff':'#f1c40f'}" />
      <text x="${x}" y="${isHigh ? y-12 : y+22}" fill="${isHigh?'#00d4ff':'#f1c40f'}"
            font-family="JetBrains Mono" font-size="11" text-anchor="middle">${label}</text>
    `;
  });

  svg.innerHTML = svgContent;
}

function interpAt(pts, target) {
  for (let i=0;i<pts.length-1;i++){
    if (pts[i].t <= target && pts[i+1].t >= target) {
      const frac = (target - pts[i].t) / (pts[i+1].t - pts[i].t);
      return pts[i].v + frac * (pts[i+1].v - pts[i].v);
    }
  }
  return pts[0].v;
}

/* ============================================================
   MARINE CONDITIONS — Open-Meteo (Point Clear)
   ============================================================ */
async function fetchMarine() {
  const wxUrl = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${MB_LAT}&longitude=${MB_LON}` +
    `&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility` +
    `&hourly=wind_speed_10m,wind_gusts_10m,weather_code,temperature_2m,precipitation_probability` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago&forecast_days=2`;

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?` +
    `latitude=${MB_LAT}&longitude=${MB_LON}&current=wave_height,sea_surface_temperature` +
    `&length_unit=imperial&timezone=America%2FChicago`;

  try {
    const [wxRes, marineRes] = await Promise.all([fetch(wxUrl), fetch(marineUrl)]);
    const wx = await wxRes.json();
    const marine = await marineRes.json().catch(() => null);
    const c = wx.current;

    const now = new Date();
    let curIdx = 0;
    for (let i = 0; i < wx.hourly.time.length; i++) {
      if (new Date(wx.hourly.time[i]) >= now) { curIdx = Math.max(0, i - 1); break; }
    }
    const currentCode = wx.hourly.weather_code[curIdx];
    const currentPop  = wx.hourly.precipitation_probability[curIdx];
    const w = wmoLookup(currentCode);

    jubileeInputs.windSpeedMph = c.wind_speed_10m;
    jubileeInputs.windDirDeg   = c.wind_direction_10m;

    document.getElementById('air-temp').textContent = c.temperature_2m.toFixed(0);
    document.getElementById('marine-wind').textContent =
      c.wind_speed_10m.toFixed(0) + ' mph ' + degToCompass(c.wind_direction_10m);
    document.getElementById('marine-gust').textContent = c.wind_gusts_10m.toFixed(0) + ' mph';
    document.getElementById('marine-vis').textContent =
      c.visibility != null ? kmToMi(c.visibility/1000) + ' mi' : '-- mi';
    document.getElementById('rain-chance').textContent = (currentPop ?? 0) + '%';
    document.getElementById('marine-wx').textContent = w.icon + ' ' + w.desc;

    if (marine && marine.current) {
      const sst = marine.current.sea_surface_temperature;
      document.getElementById('water-temp').textContent = sst != null ? cToF(sst) : '--';
      jubileeInputs.waterTempF = sst != null ? parseFloat(cToF(sst)) : null;
      const wave = marine.current.wave_height;
      document.getElementById('wave-height').textContent = wave != null ? wave.toFixed(1) + ' ft' : '-- ft';
    } else {
      document.getElementById('water-temp').textContent = '--';
      document.getElementById('wave-height').textContent = 'N/A';
      jubileeInputs.waterTempF = null;
    }

    document.getElementById('marine-updated').textContent =
      'Updated ' + new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});

    const advisoryBanner = document.getElementById('marine-alert-banner');
    if (c.wind_gusts_10m >= 25) {
      advisoryBanner.style.display = 'flex';
      document.getElementById('marine-alert-text').innerHTML =
        `<strong>Caution</strong> — gusts to ${c.wind_gusts_10m.toFixed(0)} mph. Check NWS Marine forecast before heading out.`;
    } else {
      advisoryBanner.style.display = 'none';
    }
  } catch (err) {
    console.error('Marine fetch failed:', err);
  }
}

async function checkMarineAlerts() {
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${MB_LAT},${MB_LON}`);
    const data = await res.json();
    const features = (data.features || []).filter(f =>
      /marine|wind|small craft|coastal|flood/i.test(f.properties.event)
    );
    if (features.length > 0) {
      const a = features[0].properties;
      const banner = document.getElementById('marine-alert-banner');
      banner.style.display = 'flex';
      document.getElementById('marine-alert-text').innerHTML =
        `<strong>${a.event}</strong> — ${a.headline || (a.description||'').slice(0,140)}`;
    }
  } catch(e) { /* fail silently, NWS may have no alerts */ }
}

/* ============================================================
   SOLUNAR / BITE TIMES
   Simplified solunar theory: score peaks near new/full moon.
   ============================================================ */
function calcSolunar() {
  const moon = calcMoonPhase();

  const distFromSyzygy = Math.min(Math.abs(moon.phase - 0), Math.abs(moon.phase - 0.5), Math.abs(moon.phase - 1));
  let score;
  if (distFromSyzygy < 0.05) score = 5;
  else if (distFromSyzygy < 0.10) score = 4;
  else if (distFromSyzygy < 0.18) score = 3;
  else score = 2;

  const ratingText = {
    5: 'Excellent — new or full moon, strongest tidal pull. Fish are most active.',
    4: 'Good — approaching peak moon phase. Solid activity expected.',
    3: 'Fair — moderate solunar influence today.',
    2: 'Slow — quarter moon, weakest tidal pull. Focus on dawn/dusk and moving tide instead.',
  }[score];

  document.getElementById('bite-score').textContent = score;
  document.getElementById('bite-rating-text').textContent = ratingText;

  const arc = document.getElementById('bite-gauge-arc');
  const pct = score / 5;
  const circumference = 267;
  arc.style.strokeDashoffset = circumference - (circumference * pct);
  arc.style.stroke = score >= 4 ? '#00d4ff' : score === 3 ? '#f1c40f' : '#8a9a8c';

  const periods = [
    { type:'major', label:'Major', start: 6, len: 2 },
    { type:'minor', label:'Minor', start: 12, len: 1.5 },
    { type:'major', label:'Major', start: 18.5, len: 2 },
    { type:'minor', label:'Minor', start: 0.5, len: 1.5 },
  ].sort((a,b) => a.start - b.start);

  const container = document.getElementById('bite-periods');
  container.innerHTML = '';
  periods.forEach(p => {
    const h = Math.floor(p.start);
    const m = Math.round((p.start - h) * 60);
    const startD = new Date(); startD.setHours(h, m, 0);
    const endD = new Date(startD.getTime() + p.len * 3600000);
    const fmt = d => d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});

    const el = document.createElement('div');
    el.className = 'bite-period-row';
    el.innerHTML = `
      <span class="bite-period-type ${p.type}">${p.label}</span>
      <span class="bite-period-time">${fmt(startD)} – ${fmt(endD)}</span>
    `;
    container.appendChild(el);
  });
}

/* ============================================================
   JUBILEE PREDICTOR
   Heuristic conditions gauge, NOT a scientific forecast.
   Weighted 0–100 score built from the folklore + DISL science
   on what precedes a jubilee: gentle east wind, calm water,
   rising tide, warm stratified water, pre-dawn hours, and an
   overcast/still setup. Season-gated since jubilees essentially
   only occur June–September.
   ============================================================ */
const jubileeInputs = {
  windSpeedMph: null, windDirDeg: null,
  tideRising: null, tideHeightFt: null,
  waterTempF: null, cloudCoverPct: null,
};

function scoreWindDirection(dirDeg) {
  // Full marks at due east (90°), falling off toward N/S, zero beyond a 90° swing.
  if (dirDeg == null) return 0;
  const diff = Math.min(Math.abs(dirDeg - 90), 360 - Math.abs(dirDeg - 90));
  return Math.max(0, 25 * (1 - diff / 90));
}

function scoreWindSpeed(mph) {
  // Triangular curve peaking at 5 mph (a "gentle breeze"). Dead calm or >15mph both score low.
  if (mph == null) return 0;
  if (mph > 15) return 0;
  return Math.max(0, 15 * (1 - Math.abs(mph - 5) / 10));
}

function scoreTide(rising) {
  if (rising == null) return 0;
  return rising ? 20 : 0;
}

function scoreWaterTemp(tempF) {
  if (tempF == null) return 7.5; // unknown → neutral half-credit
  if (tempF <= 78) return 0;
  if (tempF >= 88) return 15;
  return 15 * ((tempF - 78) / 10);
}

function scoreTimeOfDay(hour) {
  // Jubilees overwhelmingly happen pre-dawn.
  if (hour >= 4 && hour < 6) return 15;
  if ((hour >= 2 && hour < 4) || (hour >= 6 && hour < 8)) return 10;
  if (hour >= 0 && hour < 2) return 5;
  return 2;
}

function scoreCloudCover(pct) {
  if (pct == null) return 5;
  if (pct >= 70) return 10;
  if (pct >= 30) return 5;
  return 2;
}

function seasonFactor(month) {
  // Jan=0 ... Dec=11. Peak season Jun–Sep, shoulder Apr/May/Oct, rare otherwise.
  if (month >= 5 && month <= 8) return 1.0;   // Jun–Sep
  if (month === 3 || month === 4 || month === 9) return 0.5; // Apr, May, Oct
  return 0.15;
}

function calcJubileePredictor() {
  const now = new Date();
  const fWind  = scoreWindDirection(jubileeInputs.windDirDeg);
  const fSpeed = scoreWindSpeed(jubileeInputs.windSpeedMph);
  const fTide  = scoreTide(jubileeInputs.tideRising);
  const fTemp  = scoreWaterTemp(jubileeInputs.waterTempF);
  const fTime  = scoreTimeOfDay(now.getHours());
  const fCloud = scoreCloudCover(jubileeInputs.cloudCoverPct);

  const rawScore = fWind + fSpeed + fTide + fTemp + fTime + fCloud; // 0–100
  const finalScore = Math.round(rawScore * seasonFactor(now.getMonth()));

  let label, color;
  if (finalScore >= 75)      { label = 'PRIME CONDITIONS — get to the water'; color = '#2ecc71'; }
  else if (finalScore >= 50) { label = 'ELEVATED — worth a pre-dawn check';    color = '#00d4ff'; }
  else if (finalScore >= 25) { label = 'WATCH — a few pieces are in place';    color = '#f1c40f'; }
  else                        { label = 'LOW — conditions aren\'t lining up';  color = '#7a8ba8'; }

  document.getElementById('jubilee-score').textContent = finalScore;
  document.getElementById('jubilee-rating-text').textContent = label;

  const arc = document.getElementById('jubilee-gauge-arc');
  const circumference = 267;
  arc.style.strokeDashoffset = circumference - (circumference * (finalScore / 100));
  arc.style.stroke = color;

  const factors = [
    { name: 'Wind Direction', val: fWind, max: 25, detail: jubileeInputs.windDirDeg != null ? degToCompass(jubileeInputs.windDirDeg) : '--' },
    { name: 'Wind Speed',     val: fSpeed, max: 15, detail: jubileeInputs.windSpeedMph != null ? jubileeInputs.windSpeedMph.toFixed(0) + ' mph' : '--' },
    { name: 'Tide Stage',     val: fTide, max: 20, detail: jubileeInputs.tideRising == null ? '--' : (jubileeInputs.tideRising ? 'Rising' : 'Falling') },
    { name: 'Water Temp',     val: fTemp, max: 15, detail: jubileeInputs.waterTempF != null ? jubileeInputs.waterTempF.toFixed(0) + '°F' : '--' },
    { name: 'Time of Day',    val: fTime, max: 15, detail: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) },
    { name: 'Cloud Cover',    val: fCloud, max: 10, detail: jubileeInputs.cloudCoverPct != null ? jubileeInputs.cloudCoverPct + '%' : '--' },
  ];

  const container = document.getElementById('jubilee-factors');
  container.innerHTML = '';
  factors.forEach(f => {
    const pct = (f.val / f.max) * 100;
    const el = document.createElement('div');
    el.className = 'jubilee-factor-row';
    el.innerHTML = `
      <span class="jf-name">${f.name}</span>
      <span class="jf-detail">${f.detail}</span>
      <div class="jf-bar-track"><div class="jf-bar-fill" style="width:${pct}%"></div></div>
    `;
    container.appendChild(el);
  });
}

/* ============================================================
   INIT
   ============================================================ */
async function initApp() {
  checkAlerts();
  calcSunTimes();
  checkMarineAlerts();
  calcSolunar();
  await Promise.all([fetchWeather(), fetchTides(), fetchMarine()]);
  calcJubileePredictor();
}

initApp();
setInterval(initApp, 10 * 60 * 1000); // refresh every 10 min
