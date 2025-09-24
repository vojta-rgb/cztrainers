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

async function getRole(uid){
  try {
    const snap = await get(ref(db, "roles/" + uid));
    if (snap.exists()) return snap.val();        // e.g. "user" | "trainer"
  } catch {}
  return null;
}

// Hamburger toggle
if (hamburger && navLinks) {
  // initial a11y state
  hamburger.setAttribute("aria-expanded", "false");

  const closeMenu = () => {
    navLinks.classList.remove("active");
    hamburger.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    navLinks.classList.add("active");
    hamburger.classList.add("active");
    hamburger.setAttribute("aria-expanded", "true");
  };

  hamburger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("active");
    hamburger.classList.toggle("active", open);       // <-- needed for bar → X animation
    hamburger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Close when clicking a link inside
  navLinks.querySelectorAll("a,button").forEach(el => {
    el.addEventListener("click", closeMenu);
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!navLinks.classList.contains("active")) return;
    if (e.target === hamburger || hamburger.contains(e.target)) return;
    if (navLinks.contains(e.target)) return;
    closeMenu();
  });

  // Close on Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Close if resizing back to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) closeMenu();
  });
}

// Theme (single button)
(function bindTheme(){
  const btn  = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");
  if (!btn) return;

  const setMode = (isDark) => {
    document.body.classList.toggle("dark", isDark);
    if (icon) icon.textContent = isDark ? "🌙" : "☀️";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  setMode(localStorage.getItem("theme") === "dark");
  btn.addEventListener("click", () => setMode(!document.body.classList.contains("dark")));
})();

// Auth → UI
onAuthStateChanged(auth, async (user) => {
  // default state (guest)
  let state = "guest";
  let name  = "Register";
  let pillHref = "register.html";
  let pillClickable = true;

  if (user && user.emailVerified) {
    const role = await getRole(user.uid);
    const display = user.displayName || (user.email ? user.email.split("@")[0] : "Uživatel");

    if (role === "user") {
      state = "app-user";          // regular app user (not trainer)
      name = display;
      pillHref = "#";              // no-op
      pillClickable = false;
    } else {
      state = "trainer";           // trainer (or unknown role defaults here)
      name = display;
      pillHref = "trainer-profile.html";
      pillClickable = true;
    }
  }

  if (pill) {
    pill.href = pillHref;
    pill.style.pointerEvents = pillClickable ? "auto" : "none";
    if (pillText) pillText.textContent = name;
  }

  // Use `hidden` so external CSS can't force them visible
  show(loginBtn,  state === "guest");
  show(logoutBtn, state !== "guest");
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "index_main.html";
    } catch (err) {
      alert("Chyba při odhlášení: " + (err?.message || err));
    }
  });
}