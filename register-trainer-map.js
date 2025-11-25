// register-trainer-map.js
import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const app  = getApps().length ? getApp() : null;
const auth = app ? getAuth(app) : null;
const db   = app ? getDatabase(app) : null;

const MAP_ID_PICKER = "af6046a265f967e41ff3345f"; // dual-mode MapID

let gmap, gmarker, geocoder, autocomplete;
let wroteForUid = null;

// -------- geohash (short) ----------
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

// -------- helpers ----------
function approxLatLng(lat, lng) {
  // blur ≈ ±300 m
  const R = 6378137;
  const dx = (Math.random()-0.5)*600;
  const dy = (Math.random()-0.5)*600;
  const newLat = lat + (dy/R)*(180/Math.PI);
  const newLng = lng + (dx/(R*Math.cos(lat*Math.PI/180)))*(180/Math.PI);
  return { lat: newLat, lng: newLng };
}

function extractCityRegion(components) {
  let city = "", region = "";
  (components || []).forEach(c => {
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

  // Always keep exact coordinates
  const exactLat = Number(lat);
  const exactLng = Number(lng);

  // Public coords used for map display (blur only if approx)
  let pubLat = exactLat;
  let pubLng = exactLng;
  if (precision === "approx") ({ lat: pubLat, lng: pubLng } = approxLatLng(exactLat, exactLng));

  // hidden fields for saving: exact
  const latEl = document.getElementById("loc_lat");
  const lngEl = document.getElementById("loc_lng");
  if (latEl) latEl.value = isFinite(exactLat) ? exactLat.toFixed(6) : "";
  if (lngEl) lngEl.value = isFinite(exactLng) ? exactLng.toFixed(6) : "";

  // hidden fields for saving: public
  const latPubEl = document.getElementById("loc_lat_public");
  const lngPubEl = document.getElementById("loc_lng_public");
  if (latPubEl) latPubEl.value = isFinite(pubLat) ? pubLat.toFixed(6) : "";
  if (lngPubEl) lngPubEl.value = isFinite(pubLng) ? pubLng.toFixed(6) : "";

  document.getElementById("loc_city").value      = city || "";
  document.getElementById("loc_region").value    = region || "";
  document.getElementById("loc_geohash").value   = geohashEncode(pubLat, pubLng, 9);
  document.getElementById("loc_precision").value = precision;
  document.getElementById("loc_visible").value   = String(visible);

  const cityEl = document.getElementById("cityDisplay");
  const regEl  = document.getElementById("regionDisplay");
  if (cityEl) cityEl.value = city || "";
  if (regEl)  regEl.value  = region || "";
}

function setMarker(latLng) {
  if (!gmarker) return;
  gmarker.setPosition(latLng);
}

async function reverseGeocode(lat, lng) {
  // Requires Geocoding API to be enabled + allowed on your key
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    const best = results?.[0];
    if (!best) return { city: "", region: "" };
    return extractCityRegion(best.address_components || []);
  } catch (e) {
    console.warn("[map] Reverse geocode failed (enable Geocoding API?):", e);
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

// -------- init ----------
function initTrainerMap() {
  const mapEl = document.getElementById("trainerMap");
  if (!mapEl || !window.google) return;

  geocoder = new google.maps.Geocoder();
  gmap = new google.maps.Map(mapEl, {
    center: { lat: 49.8175, lng: 15.4730 },
    zoom: 7,
    mapId: MAP_ID_PICKER
  });

  // marker (draggable)
  gmarker  = new google.maps.Marker({
    map: gmap,
    draggable: true,
    position: { lat: 49.83, lng: 15.47 }
  });

    // expose for the edit page
    window.gmap = gmap;
    window.gmarker = gmarker;

    // clicks on the map move the pin
    gmap.addListener("click", ({ latLng }) => setMarkerAndFill(latLng));

    // dragging the pin updates hidden fields
    gmarker.addListener("dragend", ({ latLng }) => setMarkerAndFill(latLng));

    // keep hidden loc_* in sync with the current marker (used before saving)
    window.syncHiddenFromMarker = function () {
    if (!window.gmarker) return;
    const p = window.gmarker.getPosition();
    if (!p) return;

    // keep any already-filled city/region unless geocoding just ran
    const city   = document.getElementById("loc_city")?.value   || "";
    const region = document.getElementById("loc_region")?.value || "";
    setHidden(p.lat(), p.lng(), city, region);
    };

  // Places Autocomplete
  const input = document.getElementById("mapSearch");
  if (input) {
    // eslint-disable-next-line no-undef
    const ac = new google.maps.places.Autocomplete(input, {
      fields: ["geometry", "address_components"],
      componentRestrictions: { country: ["cz"] },
      types: ["geocode"]
    });
    ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (p?.geometry?.location) {
        gmap.panTo(p.geometry.location);
        gmap.setZoom(13);
        setMarkerAndFill(p.geometry.location, p.address_components || []);
      }
    });
    autocomplete = ac;
  }
  // react to toggles (recompute blur/visibility immediately)
  document.getElementById("showOnMap")?.addEventListener("change", () => {
    const pos = gmarker.getPosition(); if (pos) setMarkerAndFill(pos);
  });
  document.querySelectorAll('input[name="locPrecision"]').forEach(r => {
    r.addEventListener("change", () => {
      const pos = gmarker.getPosition(); if (pos) setMarkerAndFill(pos);
    });
  });
    const latEl = document.getElementById("loc_lat");
    const lngEl = document.getElementById("loc_lng");
    const hasSaved =
        latEl?.value && lngEl?.value &&
        isFinite(parseFloat(latEl.value)) && isFinite(parseFloat(lngEl.value));

    if (hasSaved) {
    window.setTrainerMapFromHidden?.();
    } 
    else {
    const cz = { lat: 49.83, lng: 15.47 };
    gmarker.setPosition(cz);
    gmap.setCenter(cz);
    gmap.setZoom(7);
    }
}

// Read hidden loc_* input and move the marker/map accordingly
window.setTrainerMapFromHidden = function () {
  if (!window.gmap || !window.gmarker) return;

  const latEl = document.getElementById("loc_lat");
  const lngEl = document.getElementById("loc_lng");
  if (!latEl || !lngEl) return;

  const lat = parseFloat(latEl.value);
  const lng = parseFloat(lngEl.value);
  if (!isFinite(lat) || !isFinite(lng)) return;

  const city      = (document.getElementById("loc_city")?.value || "");
  const region    = (document.getElementById("loc_region")?.value || "");
  const precision = (document.getElementById("loc_precision")?.value || "exact");
  const visible   = (document.getElementById("loc_visible")?.value !== "false");

  const pos = { lat, lng };
  gmarker.setPosition(pos);
  gmap.setCenter(pos);
  gmap.setZoom(13);

  // sync UI toggles + region select
  const radio = document.querySelector(`input[name="locPrecision"][value="${precision === "approx" ? "approx" : "exact"}"]`);
  if (radio) radio.checked = true;
  const show = document.getElementById("showOnMap");
  if (show) show.checked = visible;

  // update "Kraj" <select> if present
  if (typeof updateRegionSelect === "function") updateRegionSelect(region);

  // refresh hidden set (keeps geohash etc. in step with current pos)
  if (typeof setHidden === "function") setHidden(lat, lng, city, region);
};

// save to RTDB under unverified-users/{uid}/location
async function writeLocation(uid) {
  if (window.suspendMapWrites) return;
  if (!db || !uid) return;

  try {
    const visible = document.getElementById("showOnMap")?.checked ?? true;
    const precision = document.querySelector('input[name="locPrecision"]:checked')?.value || "exact";

    // read exact coords (may be empty strings)
    const exactLatRaw = document.getElementById("loc_lat")?.value;
    const exactLngRaw = document.getElementById("loc_lng")?.value;
    const exactLat = exactLatRaw !== undefined && exactLatRaw !== "" ? Number(exactLatRaw) : null;
    const exactLng = exactLngRaw !== undefined && exactLngRaw !== "" ? Number(exactLngRaw) : null;

    // public coords (fallback to exact if empty)
    const pubLatRaw = document.getElementById("loc_lat_public")?.value;
    const pubLngRaw = document.getElementById("loc_lng_public")?.value;
    const publicLat = pubLatRaw !== undefined && pubLatRaw !== "" ? Number(pubLatRaw) : (exactLat ?? null);
    const publicLng = pubLngRaw !== undefined && pubLngRaw !== "" ? Number(pubLngRaw) : (exactLng ?? null);

    // If visibleOnMap is true we require at least valid exact coords
    if (visible && (!isFinite(exactLat) || !isFinite(exactLng))) {
      console.warn("[map] skipping location write — no valid exact coords and visibleOnMap is true");
      return;
    }

    // safe string fields
    const cityEl = document.getElementById("loc_city");
    const regionEl = document.getElementById("loc_region");
    const city = cityEl?.value || "";
    const region = regionEl?.value || "";

    const geohashVal = (visible && (document.getElementById("loc_geohash")?.value || "")) || "";

    const payload = {
      visibleOnMap: !!visible,
      precision: precision,
      lat: visible && isFinite(exactLat) ? exactLat : null,
      lng: visible && isFinite(exactLng) ? exactLng : null,
      publicLat: visible && isFinite(publicLat) ? publicLat : null,
      publicLng: visible && isFinite(publicLng) ? publicLng : null,
      city: city,
      region: region,
      geohash: geohashVal,
      updatedAt: Date.now()
    };

    await set(ref(db, "unverified-users/" + uid + "/location"), payload);
    // small success log for debugging during development
    console.debug("[map] wrote location for", uid, payload);
  } catch (e) {
    console.warn("[map] location write failed:", e);
  }
}

// mirror your sign-in flow: as soon as the user exists, write current location
if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== wroteForUid) {
      wroteForUid = user.uid;
      writeLocation(user.uid);
    }
  });
}

// exported callback for the loader script
window.initTrainerPickMap = function () { initTrainerMap(); };

