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

// Init once
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// --- DOM ---
const profileCta   = document.getElementById("profileCta");     // the big profile button (icon + label)
const profileLabel = document.getElementById("profileLabel");   // text label inside that button
const navLinks     = document.getElementById("navLinks");       // container for hamburger links
const hamburger    = document.getElementById("hamburger");
const themeToggle  = document.getElementById("themeToggle");    // you already handle its click elsewhere

// Helper: create a link element
function link(href, text, extraAttrs = {}) {
  const a = document.createElement("a");
  a.href = href;
  a.className = "nav-button";
  a.textContent = text;
  for (const [k, v] of Object.entries(extraAttrs)) a.setAttribute(k, v);
  return a;
}

// Helper: create a button element
function button(text, id) {
  const b = document.createElement("button");
  b.className = "nav-button";
  b.type = "button";
  b.id = id;
  b.textContent = text;
  return b;
}

// Build the menu items dynamically
function renderMenuLoggedOut() {
  navLinks.innerHTML = "";
  navLinks.appendChild(link("o-nas.html", "O nás"));
  navLinks.appendChild(link("login.html", "Přihlášení"));
  // keep your theme toggle inside the menu for mobile
  if (themeToggle && !themeToggle.parentElement?.isSameNode(navLinks)) {
    navLinks.appendChild(themeToggle);
  }
}

function renderMenuLoggedIn() {
  navLinks.innerHTML = "";
  navLinks.appendChild(link("o-nas.html", "O nás"));
  const logoutBtn = button("Odhlásit se", "logoutBtn");
  navLinks.appendChild(logoutBtn);
  if (themeToggle && !themeToggle.parentElement?.isSameNode(navLinks)) {
    navLinks.appendChild(themeToggle);
  }
  // wire logout
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "index_main.html";
    } catch (err) {
      alert("Chyba při odhlášení: " + err.message);
    }
  });
}

// Fetch role + name
async function getRoleAndName(uid) {
  // Try roles map first
  let role = "unknown";
  let name = "";
  try {
    const roleSnap = await get(ref(db, "roles/" + uid));
    if (roleSnap.exists()) role = String(roleSnap.val());
  } catch {}

  // App user info
  try {
    const appUserSnap = await get(ref(db, "app-users/" + uid));
    if (appUserSnap.exists()) {
      const v = appUserSnap.val();
      if (!name) name = v?.name || "";
      if (role === "unknown") role = "user";
    }
  } catch {}

  // Trainer info
  try {
    const trainerSnap = await get(ref(db, "users/" + uid));
    if (trainerSnap.exists()) {
      const v = trainerSnap.val();
      const full = [v?.name, v?.prijmeni].filter(Boolean).join(" ").trim();
      if (!name) name = full || v?.name || "";
      if (role === "unknown") role = "trainer";
    }
  } catch {}

  return { role, name: name || "Profil" };
}

// Toggle mobile menu
if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
  // close after clicking any link/button
  navLinks.addEventListener("click", (e) => {
    if (e.target.closest("a,button")) navLinks.classList.remove("active");
  });
}

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!profileCta || !profileLabel || !navLinks) return;

  if (!user || !user.emailVerified) {
    // LOGGED OUT
    profileLabel.textContent = "Login";
    profileCta.href = "register.html";
    profileCta.onclick = null; // allow navigation
    renderMenuLoggedOut();
    return;
  }

  // LOGGED IN → fetch role and name
  const { role, name } = await getRoleAndName(user.uid);
  profileLabel.textContent = name || "Profil";

  if (role === "user") {
    // APP-USER
    profileCta.href = "#";
    profileCta.onclick = (e) => e.preventDefault(); // does nothing
    renderMenuLoggedIn();
  } else {
    // TRAINER (or unknown → treat like trainer if they’re in /users)
    profileCta.href = "trainer-profile.html";
    profileCta.onclick = null;
    renderMenuLoggedIn();
  }
});
