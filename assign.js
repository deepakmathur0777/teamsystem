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

/* ================= FIREBASE CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyD3exFsBPPO6tCl5PgURMzgzGmg9nRhhCo",
  authDomain: "hirelens-studio.firebaseapp.com",
  projectId: "hirelens-studio"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= PROJECT CONTEXT ================= */

const params = new URLSearchParams(window.location.search);
const projectId = params.get("project");

if (!projectId) {
  alert("No project selected");
  window.location.href = "main.html";
}

let currentUser = null;
let currentUserRole = null;

/* ================= AUTH + ADMIN CHECK ================= */

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  const projectRef = doc(db, "projects", projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) {
    alert("Project not found");
    window.location.href = "main.html";
    return;
  }

  const projectData = projectSnap.data();
  const members = projectData.members || {};

  if (!members[currentUser.uid]) {
    alert("Access denied");
    window.location.href = "main.html";
    return;
  }

  currentUserRole = members[currentUser.uid];

  if (currentUserRole !== "admin") {
    alert("Only Admin can assign tasks");
    window.location.href = `dashboard.html?project=${projectId}`;
    return;
  }

  populateDropdown(members);

  console.log("Admin verified for this project");
});

/* ================= POPULATE DROPDOWN ================= */

function populateDropdown(members) {

  const dropdown = document.getElementById("userDropdown");
  dropdown.innerHTML = "";

  Object.keys(members).forEach(uid => {

    const option = document.createElement("option");
    option.value = uid;

    option.textContent =
      uid === currentUser.uid
        ? uid + " (You)"
        : uid;

    dropdown.appendChild(option);
  });

}

/* ================= SUB TASK UI ================= */

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

    // 🔥 Create Main Task
    await addDoc(
      collection(db, "projects", projectId, "tasks"),
      {
        title,
        assignedTo,
        deadline,
        priority,
        subTasks,
        status: "pending",
        createdAt: serverTimestamp()
      }
    );

    // 🔥 Trigger lightweight dashboard refresh
    await updateDoc(
      doc(db, "projects", projectId),
      {
        lastUpdated: serverTimestamp()
      }
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