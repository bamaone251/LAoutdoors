// GOES Multi-Sector Loop Viewer — frontend logic
// Fetches the band list for the active sector from /api/bands/<sector_key>,
// renders a card per band, and loads each card's animated loop through the
// /proxy/<sector_key>/loop/<band_id> endpoint (never hits NOAA's CDN
// directly from the browser). Sector tabs switch the active sector and
// re-render the grid.

const grid = document.getElementById("grid");
const filterRow = document.getElementById("filterRow");
const sectorRow = document.getElementById("sectorRow");
const refreshBtn = document.getElementById("refreshBtn");
const clockEl = document.getElementById("clock");
const sectorTitle = document.getElementById("sectorTitle");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");

let bandsData = [];
let currentFilter = "All";
let currentSector = window.DEFAULT_SECTOR || "ga";
let autoRefreshTimer = null;

function cacheBustedUrl(path) {
  return `${path}?t=${Date.now()}`;
}

function loopUrl(bandId) {
  return `/proxy/${encodeURIComponent(currentSector)}/loop/${encodeURIComponent(bandId)}`;
}

function buildCard(band) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.group = band.group;

  const media = document.createElement("div");
  media.className = "card-media";

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.textContent = "loading…";
  media.appendChild(spinner);

  const dot = document.createElement("div");
  dot.className = "dot";
  dot.title = "Live";
  media.appendChild(dot);

  const img = document.createElement("img");
  img.alt = band.label;
  img.loading = "lazy";
  img.addEventListener("load", () => {
    img.classList.add("loaded");
    spinner.remove();
  });
  img.addEventListener("error", () => {
    spinner.textContent = "unavailable";
  });
  media.appendChild(img);

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("p");
  title.className = "card-title";
  title.textContent = band.label;
  body.appendChild(title);

  if (band.desc) {
    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = band.desc;
    body.appendChild(desc);
  }

  card.appendChild(media);
  card.appendChild(body);

  card.addEventListener("click", () => openModal(band, img.src));

  // Kick off the load
  img.src = cacheBustedUrl(loopUrl(band.id));

  return { card, img, band };
}

let cardRefs = [];

function renderGrid() {
  grid.innerHTML = "";
  cardRefs = [];
  bandsData.forEach((band) => {
    const ref = buildCard(band);
    cardRefs.push(ref);
    grid.appendChild(ref.card);
  });
  applyFilter();
}

function applyFilter() {
  cardRefs.forEach(({ card, band }) => {
    const show = currentFilter === "All" || band.group === currentFilter;
    card.style.display = show ? "" : "none";
  });
}

function openModal(band, currentSrc) {
  modalTitle.textContent = band.label;
  modalImage.src = currentSrc || cacheBustedUrl(loopUrl(band.id));
  modalImage.alt = band.label;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

filterRow.addEventListener("click", (e) => {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;
  document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentFilter = chip.dataset.filter;
  applyFilter();
});

sectorRow.addEventListener("click", (e) => {
  const tab = e.target.closest(".sector-tab");
  if (!tab) return;
  const key = tab.dataset.sector;
  if (key === currentSector) return;

  document.querySelectorAll(".sector-tab").forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  currentSector = key;

  loadSector();
});

refreshBtn.addEventListener("click", () => {
  refreshBtn.classList.add("spinning");
  cardRefs.forEach(({ img, band }) => {
    img.classList.remove("loaded");
    img.src = cacheBustedUrl(loopUrl(band.id));
  });
  setTimeout(() => refreshBtn.classList.remove("spinning"), 900);
});

function updateClock() {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const hh = String(utc.getHours()).padStart(2, "0");
  const mm = String(utc.getMinutes()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm} UTC`;
}

async function loadSector() {
  const res = await fetch(`/api/bands/${encodeURIComponent(currentSector)}`);
  if (!res.ok) return;
  const data = await res.json();
  bandsData = data.bands;
  sectorTitle.textContent = data.sector_label;
  renderGrid();
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  // Auto-refresh all loops every 5 minutes to pick up new imagery
  autoRefreshTimer = setInterval(() => {
    cardRefs.forEach(({ img, band }) => {
      img.src = cacheBustedUrl(loopUrl(band.id));
    });
  }, 5 * 60 * 1000);
}

async function init() {
  updateClock();
  setInterval(updateClock, 15000);

  await loadSector();
  startAutoRefresh();
}

init();

// ---------- PWA installation ----------
let deferredInstallPrompt = null;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
