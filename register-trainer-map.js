// register-trainer-map.js
import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const app  = getApps().length ? getApp() : null;
const auth = app ? getAuth(app) : null;
const db   = app ? getDatabase(app) : null;

// Your dual-mode Map ID
const MAP_ID_PICKER = "af6046a265f967e41ff3345f";

let gmap, gmarker, geocoder;
let wroteForUid = null;

/* ---------------- geohash (short) ---------------- */
const _base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
function geohashEncode(lat, lon, precision = 9) {
  let idx = 0, bit = 0, evenBit = true, geohash = "";
  let latMin=-90, latMax=90, lonMin=-180, lonMax=180;
  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax)/2;
      if (lon >= lonMid) { idx = idx*2+1; lonMin = lonMid; } else { idx = idx*2; lonMax = lonMid; }
    } else {
      const latMid = (latMin + latMax)/2;
      if (lat >= latMid) { idx = idx*2+1; latMin = latMid; } else { idx = idx*2; latMax = latMid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += _base32.charAt(idx); bit = 0; idx = 0; }
  }
  return geohash;
}

/* ---------------- helpers ---------------- */
function approxLatLng(lat, lng) {
  // blur ≈ ±300 m
  const R = 6378137;
  const dx = (Math.random()-0.5)*600;
  const dy = (Math.random()-0.5)*600;
  const newLat = lat + (dy/R)*(180/Math.PI);
  const newLng = lng + (dx/(R*Math.cos(lat*Math.PI/180)))*(180/Math.PI);
  return { lat: newLat, lng: newLng };
}

function extractCityRegion(components = []) {
  let city = "", region = "";
  components.forEach(c => {
    if (c.types.includes("locality")) city = c.long_name;
    if (!city && c.types.includes("postal_town")) city = c.long_name;
    if (c.types.includes("administrative_area_level_1")) region = c.long_name;
  });
  return { city, region };
}

function updateRegionSelect(region) {
  const sel = document.getElementById("location"); // your Kraj <select>
  if (!sel || !region) return;
  const found = Array.from(sel.options).find(o => o.textContent.trim() === region);
  if (found) sel.value = found.value;
}

function setHidden(lat, lng, city, region) {
  const precision = (document.querySelector('input[name="locPrecision"]:checked')?.value) || "exact";
  const visible   = document.getElementById("showOnMap")?.checked ?? true;

  let outLat = lat, outLng = lng;
  if (precision === "approx") ({ lat: outLat, lng: outLng } = approxLatLng(lat, lng));

  document.getElementById("loc_lat").value       = Number(outLat).toFixed(6);
  document.getElementById("loc_lng").value       = Number(outLng).toFixed(6);
  document.getElementById("loc_city").value      = city || "";
  document.getElementById("loc_region").value    = region || "";
  document.getElementById("loc_geohash").value   = geohashEncode(outLat, outLng, 9);
  document.getElementById("loc_precision").value = precision;
  document.getElementById("loc_visible").value   = String(visible);

  const cityEl = document.getElementById("cityDisplay");
  const regEl  = document.getElementById("regionDisplay");
  if (cityEl) cityEl.value = city || "";
  if (regEl)  regEl.value  = region || "";
}

function setMarker(latLng) {
  if (gmarker) gmarker.setPosition(latLng);
}

async function reverseGeocode(lat, lng) {
  // Needs Geocoding API enabled + allowed on your key
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    const best = results?.[0];
    return best ? extractCityRegion(best.address_components) : { city: "", region: "" };
  } catch (e) {
    console.warn("[map] Reverse geocode failed:", e);
    return { city: "", region: "" };
  }
}

async function setMarkerAndFill(latLng, componentsFromPlace) {
  setMarker(latLng);
  const lat = latLng.lat(), lng = latLng.lng();

  let city = "", region = "";
  if (componentsFromPlace) {
    ({ city, region } = extractCityRegion(componentsFromPlace));
  } else {
    ({ city, region } = await reverseGeocode(lat, lng));
  }

  setHidden(lat, lng, city, region);
  updateRegionSelect(region);
}

/* ---------------- init ---------------- */
function initTrainerMap() {
  const mapEl = document.getElementById("trainerMap");
  if (!mapEl || !window.google) return;

  geocoder = new google.maps.Geocoder();
  gmap = new google.maps.Map(mapEl, {
    center: { lat: 49.8175, lng: 15.4730 },
    zoom: 7,
    mapId: MAP_ID_PICKER
  });

  // draggable marker
  gmarker = new google.maps.Marker({
    map: gmap,
    draggable: true,
    position: { lat: 49.83, lng: 15.47 }
  });

  // Update on map click or marker drag — ALWAYS reverse-geocode.
  gmap.addListener("click", (e) => setMarkerAndFill(e.latLng));
  gmarker.addListener("dragend", (e) => setMarkerAndFill(e.latLng));

  // Simple search: press Enter → geocode the typed address (no Places lib)
  const input = document.getElementById("mapSearch");
  if (input) {
    input.addEventListener("keydown", async (ev) => {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      try {
        const { results } = await geocoder.geocode({ address: q, region: "cz" });
        const best = results?.[0];
        if (best?.geometry?.location) {
          gmap.panTo(best.geometry.location);
          gmap.setZoom(13);
          await setMarkerAndFill(best.geometry.location, best.address_components);
        }
      } catch (e) {
        console.warn("[map] Address geocode failed:", e);
      }
    });
  }

  // Initial hidden values (for default position)
  setHidden(49.83, 15.47, "", "");

  // Recompute blur/visibility immediately when the toggles change
  document.getElementById("showOnMap")?.addEventListener("change", () => {
    const pos = gmarker.getPosition(); if (pos) setMarkerAndFill(pos);
  });
  document.querySelectorAll('input[name="locPrecision"]').forEach(r => {
    r.addEventListener("change", () => {
      const pos = gmarker.getPosition(); if (pos) setMarkerAndFill(pos);
    });
  });
}

/* ---------------- save location to RTDB ---------------- */
async function writeLocation(uid) {
  if (!db || !uid) return;
  const visible = document.getElementById("showOnMap")?.checked ?? true;
  const payload = {
    visibleOnMap: visible,
    precision: document.querySelector('input[name="locPrecision"]:checked')?.value || "exact",
    lat:  visible ? Number(document.getElementById("loc_lat").value || 0) : null,
    lng:  visible ? Number(document.getElementById("loc_lng").value || 0) : null,
    city: document.getElementById("loc_city").value || "",
    region: document.getElementById("loc_region").value || "",
    geohash: visible ? (document.getElementById("loc_geohash").value || "") : "",
    updatedAt: Date.now()
  };
  try {
    await set(ref(db, "unverified-users/" + uid + "/location"), payload);
  } catch (e) {
    console.warn("[map] location write failed:", e);
  }
}

// As soon as user is signed in during your flow, write the current location once.
if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== wroteForUid) {
      wroteForUid = user.uid;
      writeLocation(user.uid);
    }
  });
}

// Export the init callback for the Google loader script in your HTML
window.initTrainerPickMap = function () { initTrainerMap(); };