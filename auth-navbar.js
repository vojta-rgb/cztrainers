// navbar.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ---------- Firebase (safe init) ---------- */
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

/* ---------- DOM refs ---------- */
const hamburger   = document.getElementById("hamburger");
const dropdown    = document.getElementById("navDropdown");

const registerBtn = document.getElementById("registerBtn");
const loginBtn    = document.getElementById("loginBtn");
const profileBtn  = document.getElementById("profileBtn");
const accountBtn  = document.getElementById("accountBtn");
const logoutBtn   = document.getElementById("logoutBtn");

const themeToggle = document.getElementById("themeToggle");
const themeIcon   = document.getElementById("themeIcon");

/* ---------- Theme ---------- */
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  if (themeIcon) themeIcon.textContent = isDark ? "🌙" : "☀️";
}

(function initTheme(){
  const stored = localStorage.getItem("theme");
  applyTheme(stored === "dark");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextDark = !document.body.classList.contains("dark");
      localStorage.setItem("theme", nextDark ? "dark" : "light");
      applyTheme(nextDark);
    });
  }
})();

/* ---------- Auth-driven nav visibility ---------- */
onAuthStateChanged(auth, (user) => {
  const authed = !!(user && user.emailVerified);
  if (registerBtn) registerBtn.style.display = authed ? "none" : "inline-block";
  if (loginBtn)    loginBtn.style.display    = authed ? "none" : "inline-block";
  if (profileBtn)  profileBtn.style.display  = authed ? "inline-block" : "none";
  if (accountBtn)  accountBtn.style.display  = authed ? "inline-block" : "none";
  if (logoutBtn)   logoutBtn.style.display   = authed ? "inline-block" : "none";
});

/* ---------- Logout ---------- */
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => (window.location.href = "index_main.html"))
      .catch((err) => alert("Chyba při odhlášení: " + err.message));
  });
}

/* ---------- Hamburger dropdown behavior ---------- */
function closeDropdown() {
  if (!dropdown) return;
  dropdown.classList.remove("open");
  if (hamburger) hamburger.setAttribute("aria-expanded", "false");
}

function toggleDropdown() {
  if (!dropdown) return;
  const willOpen = !dropdown.classList.contains("open");
  dropdown.classList.toggle("open", willOpen);
  if (hamburger) hamburger.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

if (hamburger && dropdown) {
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.classList.contains("open")) return;
    const within = dropdown.contains(e.target) || hamburger.contains(e.target);
    if (!within) closeDropdown();
  });

  // Close with Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });

  // Close after navigation
  dropdown.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", () => closeDropdown());
  });
}
