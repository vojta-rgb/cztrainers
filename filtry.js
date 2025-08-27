// filters.js — page-specific logic (trainers list + filters)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ===== Firebase config ===== */
const firebaseConfig = {
  apiKey: "AIzaSyASK2terL9kejt9JTJr944WCFYzRkK8AGU",
  authDomain: "cztrainers-dat1.firebaseapp.com",
  databaseURL: "https://cztrainers-dat1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cztrainers-dat1",
  storageBucket: "cztrainers-dat1.appspot.com",
  messagingSenderId: "369200533487",
  appId: "1:369200533487:web:eb31707c0de4bda2b8f01a"
};

/* ===== Safe init ===== */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getDatabase(app);

/* ===== Cloudinary helper (fallback pfp) ===== */
const CLOUD_NAME = "dkt3pdcbe";
function clThumb(uid) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_320,h_320,q_auto,f_auto/users/${uid}/pfp`;
}

/* ===== DOM hooks ===== */
const userList      = document.getElementById("userList");
const searchInput   = document.getElementById("search");
const loader        = document.getElementById("loader");
const filtersToggle = document.getElementById("filtersToggle");
const filtersPanel  = document.getElementById("filtersPanel");
const chipsWrap     = document.getElementById("activeChips");

const boxLocations = document.getElementById("f-locations");
const boxSpecs     = document.getElementById("f-specs");
const boxLangs     = document.getElementById("f-langs");
const boxGenders   = document.getElementById("f-genders");
const expMinInput  = document.getElementById("f-exp-min");
const expMaxInput  = document.getElementById("f-exp-max");
const expHint      = document.getElementById("f-exp-hint");

const btnApply = document.getElementById("filtersApply");
const btnClear = document.getElementById("filtersClear");

/* ===== State ===== */
let allUsers = []; // [ [uid, user], ... ]
let facets   = null;

/* ===== UI: toggle filters panel ===== */
if (filtersToggle && filtersPanel) {
  filtersToggle.addEventListener("click", () => {
    const open = filtersPanel.hasAttribute("hidden");
    if (open) filtersPanel.removeAttribute("hidden");
    else filtersPanel.setAttribute("hidden", "");
  });
}

/* ===== Helpers ===== */
const uniqPush = (set, val) => { if (val && String(val).trim()) set.add(String(val).trim()); };

function buildFacets(users){
  const locations = new Set(), specs = new Set(), langs = new Set(), genders = new Set();
  let expMin = Infinity, expMax = -Infinity;

  users.forEach(([_, u]) => {
    uniqPush(locations, u.location);
    uniqPush(genders,   u.gender);

    const sArr = Array.isArray(u.specializations) ? u.specializations :
      (typeof u.specializations === 'string' ? u.specializations.split(',').map(s=>s.trim()) : []);
    sArr.forEach(v => uniqPush(specs, v));

    const lArr = Array.isArray(u.languages) ? u.languages :
      (typeof u.languages === 'string' ? u.languages.split(',').map(s=>s.trim()) : []);
    lArr.forEach(v => uniqPush(langs, v));

    const e = Number(u.experience || 0);
    if (Number.isFinite(e)) { expMin = Math.min(expMin, e); expMax = Math.max(expMax, e); }
  });

  if (!Number.isFinite(expMin)) expMin = 0;
  if (!Number.isFinite(expMax)) expMax = 0;
  return { locations, specs, langs, genders, expMin, expMax };
}

function checkboxList(container, name, values){
  if (!container) return;
  const arr = [...values].sort((a,b)=>a.localeCompare(b,'cs'));
  container.innerHTML = arr.map(v => `
    <label style="display:block; margin:.25rem 0;">
      <input type="checkbox" name="${name}" value="${v}"> ${v}
    </label>
  `).join("") || "<span class='small'>Žádné položky</span>";
}

function populateFilters(){
  checkboxList(boxLocations, "loc",    facets.locations);
  checkboxList(boxSpecs,     "spec",   facets.specs);
  checkboxList(boxLangs,     "lang",   facets.langs);
  checkboxList(boxGenders,   "gender", facets.genders);

  if (expMinInput) expMinInput.placeholder = String(facets.expMin);
  if (expMaxInput) expMaxInput.placeholder = String(facets.expMax);
  if (expHint)     expHint.textContent     = `Rozsah v datech: ${facets.expMin} – ${facets.expMax} let`;
}

function getFiltersFromUI(){
  const checked = (sel) => [...document.querySelectorAll(sel+':checked')].map(i=>i.value);
  return {
    q:      (searchInput?.value || "").trim().toLowerCase(),
    loc:    checked('input[name="loc"]'),
    spec:   checked('input[name="spec"]'),
    lang:   checked('input[name="lang"]'),
    gender: checked('input[name="gender"]'),
    expMin: expMinInput?.value ? Number(expMinInput.value) : null,
    expMax: expMaxInput?.value ? Number(expMaxInput.value) : null,
  };
}

function applyFilters(users, f){
  const q = f.q;
  return users.filter(([_, u]) => {
    if (q) {
      const hay = [
        u.name, u.prijmeni, u.bio,
        Array.isArray(u.specializations) ? u.specializations.join(" ") : u.specializations,
        u.location
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (f.loc.length && !f.loc.includes(u.location)) return false;

    if (f.spec.length) {
      const sArr = Array.isArray(u.specializations) ? u.specializations :
        (typeof u.specializations === 'string' ? u.specializations.split(',').map(s=>s.trim()) : []);
      if (!f.spec.every(s => sArr.includes(s))) return false; // all specs must match
    }

    if (f.lang.length) {
      const lArr = Array.isArray(u.languages) ? u.languages :
        (typeof u.languages === 'string' ? u.languages.split(',').map(s=>s.trim()) : []);
      if (!f.lang.some(l => lArr.includes(l))) return false; // at least one lang
    }

    if (f.gender.length && !f.gender.includes(u.gender)) return false;

    const e = Number(u.experience || 0);
    if (f.expMin != null && e < f.expMin) return false;
    if (f.expMax != null && e > f.expMax) return false;

    return true;
  });
}

function renderChips(f){
  if (!chipsWrap) return;
  const chips = [];
  const add = (label, value, clearKey, clearVal) => {
    chips.push(`<span class="chip">${label}: ${value} <button data-k="${clearKey}" data-v="${encodeURIComponent(clearVal || '')}">×</button></span>`);
  };

  if (f.q) add("Hledat", f.q, "q");
  f.loc.forEach(v => add("Lokalita", v, "loc", v));
  f.spec.forEach(v => add("Specializace", v, "spec", v));
  f.lang.forEach(v => add("Jazyk", v, "lang", v));
  f.gender.forEach(v => add("Pohlaví", v, "gender", v));
  if (f.expMin != null) add("Zkušenost ≥", f.expMin, "expMin");
  if (f.expMax != null) add("Zkušenost ≤", f.expMax, "expMax");

  chipsWrap.innerHTML = chips.join("") || "";
  chipsWrap.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.k;
      const v = decodeURIComponent(btn.dataset.v||"");
      switch (k) {
        case "q": if (searchInput) searchInput.value = ""; break;
        case "expMin": if (expMinInput) expMinInput.value = ""; break;
        case "expMax": if (expMaxInput) expMaxInput.value = ""; break;
        default: {
          const selector = `input[name="${k}"][value="${CSS.escape(v)}"]`;
          const el = document.querySelector(selector);
          if (el) el.checked = false;
        }
      }
      doFilter();
    });
  });
}

function safeProfileUrl(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return `profile.html?id=${encodeURIComponent(id)}`;
}

function renderUsers(users) {
  if (!userList) return;
  userList.innerHTML = "";
  if (!users.length) {
    userList.innerHTML = "<p>Žádní uživatelé nebyli nalezeni.</p>";
    return;
  }

  users.forEach(([id, user]) => {
    const href = safeProfileUrl(id);
    if (!href) return;

    const photoURL =
      (typeof user.profilePicture === "string" && user.profilePicture.startsWith("http"))
        ? user.profilePicture
        : clThumb(id);

    const name = (user.name || "").trim() || "Neznámý";
    const lastName = (user.prijmeni || "").trim();

    const card = document.createElement("a");
    card.className = "card";
    card.href = href;
    card.innerHTML = `
      <img class="profile-pic"
           src="${photoURL}"
           alt="Profilový obrázek"
           onerror="this.onerror=null;this.src='https://placehold.co/300x300?text=Profil';">
      <div class="card-info">
        <h3>${name} ${lastName}</h3>
        <p><strong>Zkušenosti:</strong> ${user.experience || "-"} let</p>
        <p><strong>Specializace:</strong> ${
          Array.isArray(user.specializations)
            ? user.specializations.join(", ")
            : (user.specializations || "-")
        }</p>
        <p><strong>Lokalita:</strong> ${user.location || "-"}</p>
      </div>
    `;
    userList.appendChild(card);
  });
}

/* ===== Debounced filter runner ===== */
const doFilter = (() => {
  let t;
  return function trigger(){
    clearTimeout(t);
    t = setTimeout(() => {
      const f = getFiltersFromUI();
      renderChips(f);
      renderUsers(applyFilters(allUsers, f));
    }, 150);
  };
})();

/* ===== Wire events ===== */
btnApply?.addEventListener("click", () => {
  doFilter();
  filtersPanel?.setAttribute("hidden", "");
});
btnClear?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  if (expMinInput) expMinInput.value = "";
  if (expMaxInput) expMaxInput.value = "";
  document.querySelectorAll('#filtersPanel input[type="checkbox"]').forEach(cb => (cb.checked = false));
  doFilter();
});
searchInput?.addEventListener("input", doFilter);
filtersPanel?.addEventListener("change", (e) => {
  const t = e.target;
  if (t && (t.matches('input[type="checkbox"]') || t.matches('input[type="number"]'))) doFilter();
});

/* ===== Load trainers & boot ===== */
onValue(ref(db, "users/"), (snapshot) => {
  if (loader) loader.style.display = "none";
  const data = snapshot.val() || {};
  allUsers = Object.entries(data).filter(([_, user]) => user && user.email);
  facets = buildFacets(allUsers);
  populateFilters();
  doFilter();
});
