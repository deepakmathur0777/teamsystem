import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* FIREBASE CONFIG */

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
const db = getFirestore(app);
const auth = getAuth(app);

/* AUTH CHECK */

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadUsers();
  }
});

/* LOAD USERS INTO DROPDOWN */

async function loadUsers() {
  const dropdown = document.getElementById("userDropdown");
  dropdown.innerHTML = "<option value=''>Select Member</option>";

  const querySnapshot = await getDocs(collection(db, "users"));

  querySnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.role === "member") {
      dropdown.innerHTML += `
        <option value="${data.email}" data-name="${data.name}">
          ${data.name}
        </option>
      `;
    }
  });
}

/* HANDLE FORM SUBMIT */

const form = document.getElementById("assignForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const dropdown = document.getElementById("userDropdown");
  const assignedEmail = dropdown.value;
  const assignedName =
    dropdown.options[dropdown.selectedIndex].getAttribute("data-name");

  const deadlineInput = document.getElementById("deadline").value;
  const priority = document.getElementById("priority").value;

  const deadlineDate = new Date(deadlineInput);

  try {

    await addDoc(collection(db, "tasks"), {
      title: title,
      assignedTo: assignedName,
      assignedToEmail: assignedEmail,
      status: "pending",
      deadline: Timestamp.fromDate(deadlineDate),
      priority: priority,
      createdAt: Timestamp.now()
    });

    document.getElementById("message").innerText =
      "Task assigned successfully!";

    form.reset();

    (() => {
      window.location.href = "dashboard.html";
    }, 1000);setTimeout

  } catch (error) {
    document.getElementById("message").innerText =
      "Error assigning task.";
  }
});