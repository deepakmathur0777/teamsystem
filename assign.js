import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyD3exFsBPPO6tCl5PgURMzgzGmg9nRhhCo",
  authDomain: "hirelens-studio.firebaseapp.com",
  projectId: "hirelens-studio"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= PROJECT ================= */

const params = new URLSearchParams(window.location.search);
const projectId = params.get("project");

if (!projectId) {
  window.location.href = "main.html";
}

let currentUser = null;
let currentUserRole = null;
let projectMembers = {};

/* ================= AUTH + ADMIN CHECK ================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  const projectSnap = await getDoc(doc(db, "projects", projectId));

  if (!projectSnap.exists()) {
    window.location.href = "main.html";
    return;
  }

  const projectData = projectSnap.data();
  projectMembers = projectData.members || {};

  if (!projectMembers[currentUser.uid]) {
    window.location.href = "main.html";
    return;
  }

  currentUserRole = projectMembers[currentUser.uid].role;

  if (currentUserRole !== "admin") {
    alert("Only Admin can assign tasks");
    window.location.href = `dashboard.html?project=${projectId}`;
    return;
  }

  populateDropdown(projectMembers);
});

/* ================= POPULATE DROPDOWN ================= */

function populateDropdown(members) {

  const dropdown = document.getElementById("userDropdown");
  dropdown.innerHTML = "";

  Object.entries(members).forEach(([uid, memberData]) => {

    const option = document.createElement("option");
    option.value = uid;

    option.textContent =
      uid === currentUser.uid
        ? memberData.name + " (You)"
        : memberData.name;

    dropdown.appendChild(option);
  });
}

/* ================= ADD SUBTASK ================= */

window.addSubTask = function () {

  const container = document.getElementById("subTasksContainer");

  const row = document.createElement("div");
  row.className = "subtask-row";

  row.innerHTML = `
    <input type="text" placeholder="Sub target title" class="subInput">
    <button type="button" class="remove-sub" onclick="this.parentElement.remove()">✖</button>
  `;

  container.appendChild(row);
};

/* ================= FORM SUBMIT ================= */

document.getElementById("assignForm")
.addEventListener("submit", async (e) => {

  e.preventDefault();

  if (!currentUser || currentUserRole !== "admin") {
    alert("Unauthorized action");
    return;
  }

  const title = document.getElementById("title").value.trim();
  const assignedTo = document.getElementById("userDropdown").value;
  const deadline = document.getElementById("deadline").value;
  const priority = document.getElementById("priority").value;

  if (!title || !assignedTo || !deadline) {
    alert("Please fill all required fields");
    return;
  }

  /* ===== Collect Subtasks ===== */

  const subInputs = document.querySelectorAll(".subInput");
  const subTasks = [];

  subInputs.forEach(input => {
    if (input.value.trim()) {
      subTasks.push({
        title: input.value.trim(),
        completed: false
      });
    }
  });

  try {

    const assignedMember = projectMembers[assignedTo];

    await addDoc(
      collection(db, "projects", projectId, "tasks"),
      {
        title,
        assignedTo,
        assignedToName: assignedMember.name,
        deadline,
        priority,
        subTasks,
        status: "pending",
        createdAt: serverTimestamp()
      }
    );

    /* ===== Trigger Lightweight Refresh ===== */

    await updateDoc(
      doc(db, "projects", projectId),
      { lastUpdated: serverTimestamp() }
    );

    document.getElementById("message").innerText =
      "✅ Target assigned successfully";

    e.target.reset();
    document.getElementById("subTasksContainer").innerHTML = "";

  } catch (error) {

    console.error(error);
    document.getElementById("message").innerText =
      "❌ Failed to assign task";
  }
});
