import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
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

let currentUser;
let currentUserRole;
let progressChart = null;
let weeklyChart = null;
let lastLoadedTimestamp = null;

/* ================= AUTH CHECK ================= */

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

  /* ===== Update Header ===== */

  document.querySelector(".hero h2").innerText =
    "Team Transparency Dashboard - " + projectData.name;

  /* ===== Link Personal Page ===== */

  const personalBtn = document.getElementById("personalBtn");
  if (personalBtn) {
    personalBtn.href = `personal.html?project=${projectId}`;
  }

  /* ===== Link Assign Page (Admin Only) ===== */

  const assignBtn = document.getElementById("assignBtn");
  if (assignBtn) {
    if (currentUserRole === "admin") {
      assignBtn.href = `assign.html?project=${projectId}`;
      assignBtn.style.display = "inline-block";
    } else {
      assignBtn.style.display = "none";
    }
  }

  loadMembers(members);
  await loadTasks();   // Initial load
  listenForProjectUpdates();  // Lightweight listener
});

/* ================= LIGHTWEIGHT PROJECT LISTENER ================= */

function listenForProjectUpdates() {

  const projectRef = doc(db, "projects", projectId);

  onSnapshot(projectRef, (docSnap) => {

    const data = docSnap.data();
    const updated = data?.lastUpdated?.toMillis?.() || null;

    if (!updated) return;

    if (lastLoadedTimestamp === null) {
      lastLoadedTimestamp = updated;
      return;
    }

    if (updated !== lastLoadedTimestamp) {
      lastLoadedTimestamp = updated;
      loadTasks();
    }
  });
}

/* ================= LOAD TASKS ================= */

async function loadTasks() {

  const tasksRef = collection(db, "projects", projectId, "tasks");
  const snapshot = await getDocs(tasksRef);

  let total = 0;
  let completed = 0;
  let pending = 0;
  let overdue = 0;

  const weeklyData = [0,0,0,0,0,0,0];

  const table = document.getElementById("taskTable");
  table.innerHTML = "";

  snapshot.forEach(docSnap => {

    const data = docSnap.data();
    total++;

    const status = data.status || "pending";
    const createdAt = data.createdAt?.toDate?.() || null;
    const dueDate = data.deadline ? new Date(data.deadline) : null;

    if (status === "completed") completed++;
    else pending++;

    if (dueDate && dueDate < new Date() && status !== "completed") {
      overdue++;
    }

    if (createdAt) {
      weeklyData[createdAt.getDay()]++;
    }

    table.innerHTML += `
      <tr>
        <td>${data.title}</td>
        <td>${data.assignedTo || "—"}</td>
        <td>
          <span class="badge ${status === "completed" ? "completed" : "pending"}">
            ${status}
          </span>
        </td>
      </tr>
    `;
  });

  updateStats(total, completed, pending, overdue);
  updateCharts(completed, pending, weeklyData);
}

/* ================= UPDATE STATS ================= */

function updateStats(total, completed, pending, overdue) {

  const completionRate = total
    ? Math.round((completed / total) * 100)
    : 0;

  const efficiencyRate = (completed + pending)
    ? Math.round((completed / (completed + pending)) * 100)
    : 0;

  document.getElementById("totalTasks").innerText = total;
  document.getElementById("completedTasks").innerText = completed;
  document.getElementById("pendingTasks").innerText = pending;
  document.getElementById("overdueTasks").innerText = overdue;
  document.getElementById("completionRate").innerText = completionRate + "%";
  document.getElementById("efficiencyRate").innerText = efficiencyRate + "%";
  document.getElementById("progressBar").style.width = completionRate + "%";
}

/* ================= LOAD MEMBERS ================= */

function loadMembers(members) {

  const memberStats = document.getElementById("memberStats");
  memberStats.innerHTML = "";

  Object.entries(members).forEach(([uid, role]) => {

    memberStats.innerHTML += `
      <div class="member-card" onclick="toggleMember(this)">
        <strong>${uid}</strong>
        <span class="badge ${role === "admin" ? "completed" : "pending"}">
          ${role}
        </span>
        <div class="member-tasks">
          Role: ${role}
        </div>
      </div>
    `;
  });
}

/* ================= CHARTS ================= */

function updateCharts(completed, pending, weeklyData) {

  if (progressChart) progressChart.destroy();
  if (weeklyChart) weeklyChart.destroy();

  progressChart = new Chart(
    document.getElementById("progressChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [{
          data: [completed, pending]
        }]
      }
    }
  );

  weeklyChart = new Chart(
    document.getElementById("weeklyChart"),
    {
      type: "bar",
      data: {
        labels: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
        datasets: [{
          label: "Tasks Created",
          data: weeklyData
        }]
      }
    }
  );
}

/* ================= UTILITIES ================= */

window.toggleMember = function(el) {
  el.classList.toggle("open");
};

window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};