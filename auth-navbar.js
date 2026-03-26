// auth-navbar.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyASK2terL9kejt9JTJr944WCFYzRkK8AGU",
  authDomain: "cztrainers-dat1.firebaseapp.com",
  databaseURL: "https://cztrainers-dat1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cztrainers-dat1",
  storageBucket: "cztrainers-dat1.appspot.com",
  messagingSenderId: "369200533487",
  appId: "1:369200533487:web:eb31707c0de4bda2b8f01a"
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// DOM
const pill      = document.getElementById("profilePill");
const pillText  = document.getElementById("pillText");
const loginBtn  = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const hamburger = document.getElementById("hamburger");
const navLinks  = document.getElementById("navLinks");

// ── Pill dropdown (desktop only) ──────────────────────────────────────────────
// Injected once, shown/hidden as needed. Sits right below the pill.
let pillDropdown = null;

function createPillDropdown() {
  if (pillDropdown) return;

  pillDropdown = document.createElement("div");
  pillDropdown.id = "pillDropdown";
  pillDropdown.setAttribute("role", "menu");
  pillDropdown.setAttribute("aria-label", "Možnosti účtu");

  // Inline styles — no extra CSS file needed, works on every page
  Object.assign(pillDropdown.style, {
    position:     "fixed",
    top:          "0",          // set dynamically on open
    right:        "0",          // set dynamically on open
    minWidth:     "160px",
    background:   "#0072CE",
    borderRadius: "0 0 0 12px",
    boxShadow:    "0 12px 32px rgba(0,0,0,.22)",
    padding:      "6px",
    zIndex:       "1050",
    display:      "none",
    flexDirection:"column",
    gap:          "4px",
  });

  const logoutItem = document.createElement("button");
  logoutItem.textContent = "Odhlásit se";
  logoutItem.setAttribute("role", "menuitem");
  Object.assign(logoutItem.style, {
    display:      "flex",
    alignItems:   "center",
    width:        "100%",
    padding:      "10px 14px",
    background:   "rgba(255,255,255,.07)",
    border:       "1px solid rgba(255,255,255,.14)",
    borderRadius: "10px",
    color:        "#fff",
    fontSize:     "14px",
    fontWeight:   "700",
    cursor:       "pointer",
    fontFamily:   "inherit",
    textAlign:    "left",
  });
  logoutItem.addEventListener("mouseenter", () => {
    logoutItem.style.background = "rgba(255,255,255,.16)";
  });
  logoutItem.addEventListener("mouseleave", () => {
    logoutItem.style.background = "rgba(255,255,255,.07)";
  });
  logoutItem.addEventListener("click", async () => {
    closePillDropdown();
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      alert("Chyba při odhlášení: " + (err?.message || err));
    }
  });

  pillDropdown.appendChild(logoutItem);
  document.body.appendChild(pillDropdown);

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!pillDropdown || pillDropdown.style.display === "none") return;
    if (pill && pill.contains(e.target)) return;
    if (pillDropdown.contains(e.target)) return;
    closePillDropdown();
  });

  // Close on Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePillDropdown();
  });
}

function openPillDropdown() {
  if (!pillDropdown || !pill) return;

  // Only on desktop (hamburger hidden means desktop nav is active)
  if (window.innerWidth < 768) return;

  const rect = pill.getBoundingClientRect();
  // Align dropdown's top-right corner with pill's bottom-right corner
  pillDropdown.style.top   = (rect.bottom + 6) + "px";
  pillDropdown.style.right = (window.innerWidth - rect.right) + "px";
  pillDropdown.style.display = "flex";
  pillDropdown.style.borderRadius = "0 0 12px 12px";
}

function closePillDropdown() {
  if (pillDropdown) pillDropdown.style.display = "none";
}

function togglePillDropdown(e) {
  e.preventDefault();
  if (!pillDropdown || pillDropdown.style.display === "none") {
    openPillDropdown();
  } else {
    closePillDropdown();
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Helpers
const show = (el, visible) => {
  if (!el) return;
  if (visible) {
    el.removeAttribute("hidden");
    el.style.display = "";
  } else {
    el.setAttribute("hidden", "");
    el.style.display = "none";
  }
};

async function getUserType(uid){
  try {
    const trainerSnap = await get(ref(db, "users/" + uid));
    if (trainerSnap.exists()) return "trainer";
  } catch {}
  return "user";
}

// Prefer real name from DB over email/local-part
async function resolveDisplayName(uid, role, user){
  const tryUsers = async () => {
    try{
      const s = await get(ref(db, "users/" + uid));
      if (s.exists()){
        const d = s.val();
        const full = [d.name, d.prijmeni].filter(Boolean).join(" ").trim();
        if (full) return full;
        if (d.name) return d.name;
      }
    } catch {}
    return null;
  };

  const tryAppUsers = async () => {
    try{
      const s = await get(ref(db, "app-users/" + uid));
      if (s.exists()){
        const d = s.val();
        const full = [d.name, d.prijmeni].filter(Boolean).join(" ").trim();
        if (full) return full;
        if (d.name) return d.name;
      }
    } catch {}
    return null;
  };

  if (role === "user"){
    return (await tryAppUsers()) || (await tryUsers()) || user?.displayName || (user?.email ? user.email.split("@")[0] : "Uživatel");
  }
  return (await tryUsers()) || (await tryAppUsers()) || user?.displayName || (user?.email ? user.email.split("@")[0] : "Uživatel");
}

// Hamburger toggle
if (hamburger && navLinks) {
  hamburger.setAttribute("aria-expanded", "false");

  const closeMenu = () => {
    navLinks.classList.remove("active");
    hamburger.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
  };

  hamburger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("active");
    hamburger.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navLinks.querySelectorAll("a,button").forEach(el => {
    el.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (e) => {
    if (!navLinks.classList.contains("active")) return;
    if (e.target === hamburger || hamburger.contains(e.target)) return;
    if (navLinks.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) closeMenu();
  });
}

// Theme (single button) + SVG icon sync
(function bindTheme(){
  const btn  = document.getElementById("themeToggle");
  if (!btn) return;

  const sun  = document.getElementById("iconSun");
  const moon = document.getElementById("iconMoon");

  const syncIcons = (isDark) => {
    if (sun)  sun.style.display  = isDark ? "block" : "none";
    if (moon) moon.style.display = isDark ? "none"  : "block";
  };

  const setMode = (isDark) => {
    document.body.classList.toggle("dark", isDark);
    syncIcons(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  setMode(localStorage.getItem("theme") === "dark");
  btn.addEventListener("click", () => setMode(!document.body.classList.contains("dark")));
})();

// Auth → UI
onAuthStateChanged(auth, async (user) => {
  let state    = "guest";
  let name     = "Registrace";
  let pillHref = "register.html";

  if (user && user.emailVerified) {
    const type    = await getUserType(user.uid);
    const display = user.displayName || (user.email ? user.email.split("@")[0] : "Uživatel");

    if (type === "user") {
      state    = "app-user";
      name     = display;
      pillHref = "#";
    } else {
      state    = "trainer";
      name     = display;
      pillHref = "trainer-profile.html";
    }
    try { name = await resolveDisplayName(user.uid, type, user) || name; } catch {}
  }

  if (pill) {
    pill.href = pillHref;
    pill.style.pointerEvents = "auto";
    pill.onclick = null;
    if (pillText) pillText.textContent = name;

    if (state === "app-user") {
      // Desktop: clicking pill opens logout dropdown
      // Mobile: logout is available in the hamburger sheet via logoutBtn
      createPillDropdown();
      pill.onclick = togglePillDropdown;
      pill.style.cursor = "pointer";
    }
  }

  show(loginBtn,  state === "guest");
  show(logoutBtn, state !== "guest");
});

// Logout button (mobile sheet / hamburger menu)
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      alert("Chyba při odhlášení: " + (err?.message || err));
    }
  });
}