import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD3exFsBPPO6tCl5PgURMzgzGmg9nRhhCo",
    authDomain: "hirelens-studio.firebaseapp.com",
    projectId: "hirelens-studio",
    storageBucket: "hirelens-studio.firebasestorage.app",
    messagingSenderId: "274271462149",
    appId: "1:274271462149:web:6df015d15a7c908a900d6c",
    measurementId: "G-P3JRC27VCE"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // Redirect after login
    window.location.href = "dashboard.html";

  } catch (error) {
    errorMessage.innerText = error.message;
  }
});