import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===== CONFIG ===== */

const firebaseConfig = {
  apiKey: "AIzaSyD3exFsBPPO6tCl5PgURMzgzGmg9nRhhCo",
  authDomain: "hirelens-studio.firebaseapp.com",
  projectId: "hirelens-studio"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

/* ================= REGISTER ================= */

document.getElementById("registerForm")
?.addEventListener("submit", async (e) => {

  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db,"users",userCred.user.uid),{
    name,
    email
  });

  // Clear any previous stored data
  localStorage.clear();

  window.location.href="main.html";
});

/* ================= LOGIN ================= */

document.getElementById("loginForm")
?.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  await signInWithEmailAndPassword(auth,email,password);

  // Clear stale local data
  localStorage.clear();

  window.location.href="main.html";
});

/* ================= GOOGLE ================= */

async function handleGoogle(){

  const result = await signInWithPopup(auth,provider);
  const user = result.user;

  const userRef = doc(db,"users",user.uid);
  const userDoc = await getDoc(userRef);

  if(!userDoc.exists()){
    const name = prompt("Enter your full name:") 
      || user.displayName 
      || "User";

    await setDoc(userRef,{
      name,
      email: user.email
    });
  }

  localStorage.clear();

  window.location.href="main.html";
}

document.getElementById("googleLogin")?.addEventListener("click",handleGoogle);
document.getElementById("googleRegister")?.addEventListener("click",handleGoogle);

/* ================= LOGOUT (OPTIONAL GLOBAL USE) ================= */

window.logout = function(){
  signOut(auth).then(()=>{
    localStorage.clear();
    window.location.href="index.html";
  });
};