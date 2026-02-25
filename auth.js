import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
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

/* ================= EMAIL REGISTER ================= */

document.getElementById("registerForm")
.addEventListener("submit", async (e) => {

  e.preventDefault();

  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db,"users",userCred.user.uid),{
    name,
    email
  });

  localStorage.setItem("userName", name);
  window.location.href="main.html";
});

/* ================= EMAIL LOGIN ================= */

document.getElementById("loginForm")
.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const userCred = await signInWithEmailAndPassword(auth,email,password);

  const userDoc = await getDoc(doc(db,"users",userCred.user.uid));

  if(userDoc.exists()){
    localStorage.setItem("userName",userDoc.data().name);
  }

  window.location.href="main.html";
});

/* ================= GOOGLE LOGIN / REGISTER ================= */

async function handleGoogle(){

  const result = await signInWithPopup(auth,provider);
  const user = result.user;

  const userRef = doc(db,"users",user.uid);
  const userDoc = await getDoc(userRef);

  if(!userDoc.exists()){
    // Ask for name if not exists
    const name = prompt("Enter your full name:");
    await setDoc(userRef,{
      name: name || user.displayName || "User",
      email: user.email
    });
    localStorage.setItem("userName", name || user.displayName);
  }else{
    localStorage.setItem("userName",userDoc.data().name);
  }

  window.location.href="main.html";
}

document.getElementById("googleLogin").addEventListener("click",handleGoogle);
document.getElementById("googleRegister").addEventListener("click",handleGoogle);