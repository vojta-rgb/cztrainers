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

// Hamburger toggle
if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
  // close after clicking any item (mobile UX)
  navLinks.querySelectorAll("a,button").forEach(el => {
    el.addEventListener("click", () => navLinks.classList.remove("active"));
  });
}

// Theme (bind both buttons if present)
function bindTheme(btnId){
  const btn = document.getElementById(btnId);
  if(!btn) return;
  const icon = document.getElementById("themeIcon"); // desktop icon only
  const update = (isDark) => {
    document.body.classList.toggle("dark", isDark);
    if (icon) icon.textContent = isDark ? "🌙" : "☀️";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };
  // init
  if (localStorage.getItem("theme") === "dark") update(true);
  btn.addEventListener("click", () => update(!document.body.classList.contains("dark")));
}
bindTheme("themeToggle");
bindTheme("themeToggleMobile");

// Role helper
async function getRole(uid){
  try {
    const snap = await get(ref(db, "roles/" + uid));
    if (snap.exists()) return snap.val(); // "user" | "trainer" | etc.
  } catch {}
  return null;
}

// Auth → UI
onAuthStateChanged(auth, async (user) => {
  // default: guest
  let state = "guest";
  let name  = "Login";
  let pillHref = "register.html";
  let pillClickable = true;

  if (user && user.emailVerified) {
    const role = await getRole(user.uid);
    const display = user.displayName || user.email?.split("@")[0] || "Uživatel";

    if (role === "user") {
      // APP-USER: show name, pill does nothing
      state = "app-user";
      name = display;
      pillHref = "#";
      pillClickable = false;
    } else {
      // USER / trainer: show name, goes to trainer-profile.html
      state = "trainer";
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

  if (loginBtn)  loginBtn.style.display  = (state === "guest") ? "inline-block" : "none";
  if (logoutBtn) logoutBtn.style.display = (state === "guest") ? "none" : "inline-block";
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
