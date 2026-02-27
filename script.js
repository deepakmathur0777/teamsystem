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

let currentUser;
let currentUserRole;
let progressChart = null;
let weeklyChart = null;
let lastLoadedTimestamp = null;

/* ================= AUTH ================= */

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
  const members = projectData.members || {};

  if (!members[currentUser.uid]) {
    window.location.href = "main.html";
    return;
  }

  currentUserRole = members[currentUser.uid].role;

  /* ===== HEADER ===== */

  document.querySelector(".hero h2").innerText =
    "Team Transparency Dashboard - " + projectData.name;

  /* ===== PERSONAL LINK ===== */

  const personalBtn = document.getElementById("personalBtn");
  if (personalBtn) {
    personalBtn.href = `personal.html?project=${projectId}`;
  }

  /* ===== ASSIGN LINK (ADMIN ONLY) ===== */

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
  await loadTasks();
  listenForUpdates();
});

/* ================= LIGHTWEIGHT LISTENER ================= */

function listenForUpdates() {

  onSnapshot(doc(db, "projects", projectId), (docSnap) => {

    const updated = docSnap.data()?.lastUpdated?.toMillis?.();

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

  const snapshot = await getDocs(
    collection(db, "projects", projectId, "tasks")
  );

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
    const createdAt = data.createdAt?.toDate?.();
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
        <td>${data.assignedToName || "—"}</td>
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

/* ================= STATS ================= */

function updateStats(total, completed, pending, overdue) {

  const completionRate =
    total ? Math.round((completed / total) * 100) : 0;

  const efficiencyRate =
    (completed + pending)
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

  const container = document.getElementById("memberStats");
  container.innerHTML = "";

  Object.values(members).forEach(member => {

    container.innerHTML += `
      <div class="member-card" onclick="toggleMember(this)">
        <strong>${member.name}</strong>
        <span class="badge ${member.role === "admin" ? "completed" : "pending"}">
          ${member.role}
        </span>
        <div class="member-tasks">
          Role: ${member.role}
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
        datasets: [{ data: [completed, pending] }]
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