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

// ✅ Prevent duplicate Firebase init
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ Navbar element refs
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const profileBtn = document.getElementById("profileBtn");
const accountBtn = document.getElementById("accountBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ✅ Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    if (registerBtn) registerBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "none";
    if (profileBtn) profileBtn.style.display = "inline-block";
    if (accountBtn) accountBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (registerBtn) registerBtn.style.display = "inline-block";
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (profileBtn) profileBtn.style.display = "none";
    if (accountBtn) accountBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});

// ✅ Logout handler
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => window.location.href = "index_main.html")
      .catch((error) => alert("Error signing out: " + error.message));
  });
}

// ✅ Hamburger toggle
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
}
