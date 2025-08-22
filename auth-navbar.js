// auth-navbar.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyASK2terL9kejt9JTJr944WCFYzRkK8AGU",
  authDomain: "cztrainers-dat1.firebaseapp.com",
  databaseURL: "https://cztrainers-dat1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cztrainers-dat1",
  storageBucket: "cztrainers-dat1.appspot.com",
  messagingSenderId: "369200533487",
  appId: "1:369200533487:web:eb31707c0de4bda2b8f01a"
};

// Avoid duplicate init
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elements (may be missing on some pages → guard checks)
const registerBtn = document.getElementById("registerBtn");
const loginBtn    = document.getElementById("loginBtn");
const profileBtn  = document.getElementById("profileBtn");
const accountBtn  = document.getElementById("accountBtn");
const logoutBtn   = document.getElementById("logoutBtn");

// Auth state → show/hide buttons
onAuthStateChanged(auth, (user) => {
  const isOn = !!(user && user.emailVerified);
  if (registerBtn) registerBtn.style.display = isOn ? "none" : "inline-block";
  if (loginBtn)    loginBtn.style.display    = isOn ? "none" : "inline-block";
  if (profileBtn)  profileBtn.style.display  = isOn ? "inline-block" : "none";
  if (accountBtn)  accountBtn.style.display  = isOn ? "inline-block" : "none";
  if (logoutBtn)   logoutBtn.style.display   = isOn ? "inline-block" : "none";
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => (window.location.href = "index_main.html"))
      .catch(err => alert("Chyba při odhlášení: " + err.message));
  });
}

// Hamburger toggle (mobile)
const hamburger = document.getElementById("hamburger");
const navLinks  = document.getElementById("navLinks");

if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  // Optional: close menu when clicking a link (mobile UX)
  navLinks.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => {
      navLinks.classList.remove("active");
    });
  });
}
