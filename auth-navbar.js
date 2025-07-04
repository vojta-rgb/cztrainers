import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYpN-GLPRWu-VhhOVruSgy5I1UN1k-2a4",
  authDomain: "cztrainers-dat1.firebaseapp.com",
  databaseURL: "https://cztrainers-dat1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cztrainers-dat1",
  storageBucket: "cztrainers-dat1.appspot.com",
  messagingSenderId: "369200533487",
  appId: "1:369200533487:web:eb31707c0de4bda2b8f01a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ Navbar element references
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    if (registerBtn) registerBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "none";
    if (profileBtn) profileBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (registerBtn) registerBtn.style.display = "inline-block";
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (profileBtn) profileBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => window.location.href = "index_main.html")
      .catch((error) => alert("Chyba při odhlášení: " + error.message));
  });
}
