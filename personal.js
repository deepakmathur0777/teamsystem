import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp
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
let myChart = null;
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
    window.location.href = "main.html";
    return;
  }

  const projectData = projectSnap.data();
  const members = projectData.members || {};

  if (!members[currentUser.uid]) {
    window.location.href = "main.html";
    return;
  }

  // Update header
  document.getElementById("welcomeText").innerText =
    "My Dashboard - " + projectData.name;

  // Link team dashboard
  const teamBtn = document.getElementById("TeamBtn");
  if (teamBtn) {
    teamBtn.href = `dashboard.html?project=${projectId}`;
  }

  await loadMyTasks();
  listenForProjectUpdates();
});

/* ================= LIGHTWEIGHT PROJECT LISTENER ================= */

function listenForProjectUpdates() {

  const projectRef = doc(db, "projects", projectId);

  onSnapshot(projectRef, (docSnap) => {

    const updated = docSnap.data()?.lastUpdated?.toMillis?.() || null;

    if (!updated) return;

    if (lastLoadedTimestamp === null) {
      lastLoadedTimestamp = updated;
      return;
    }

    if (updated !== lastLoadedTimestamp) {
      lastLoadedTimestamp = updated;
      loadMyTasks();
    }
  });
}

/* ================= LOAD USER TASKS ================= */

async function loadMyTasks() {

  const tasksRef = collection(db, "projects", projectId, "tasks");
  const q = query(tasksRef, where("assignedTo", "==", currentUser.uid));
  const snapshot = await getDocs(q);

  let total = 0;
  let completed = 0;
  let pending = 0;
  let overdue = 0;

  const container = document.getElementById("taskContainer");
  container.innerHTML = "";

  snapshot.forEach(docSnap => {

    const data = docSnap.data();
    total++;

    const status = data.status || "pending";
    const deadline = data.deadline || "—";
    const subTasks = data.subTasks || [];

    if (status === "completed") completed++;
    else pending++;

    const dueDate = data.deadline ? new Date(data.deadline) : null;
    if (dueDate && dueDate < new Date() && status !== "completed") {
      overdue++;
    }

    const completedSubs = subTasks.filter(s => s.completed).length;
    const totalSubs = subTasks.length;

    const progress = totalSubs > 0
      ? Math.round((completedSubs / totalSubs) * 100)
      : 100;

    const allSubsDone = totalSubs === 0 || completedSubs === totalSubs;

    let subHTML = "";

    subTasks.forEach((sub, index) => {
      subHTML += `
        <div class="subtask-item">
          <input type="checkbox"
            ${sub.completed ? "checked" : ""}
            onchange="toggleSubTask('${docSnap.id}', ${index})">
          ${sub.title}
        </div>
      `;
    });

    container.innerHTML += `
      <div class="task-card">
        <div class="task-header">
          <div>
            <div class="task-title">${data.title}</div>
            <div class="task-meta">Deadline: ${deadline}</div>
          </div>
          <div>${status}</div>
        </div>

        <div class="subtask-list">
          ${subHTML}
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill"
            style="width:${progress}%">
          </div>
        </div>

        <button class="complete-btn"
          onclick="markComplete('${docSnap.id}')"
          ${!allSubsDone ? "disabled" : ""}>
          Complete Main Task
        </button>
      </div>
    `;
  });

  updateStats(total, completed, pending, overdue);
}

/* ================= TOGGLE SUBTASK ================= */

window.toggleSubTask = async function (taskId, index) {

  const taskRef = doc(db, "projects", projectId, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);

  const data = taskSnap.data();
  const subTasks = data.subTasks || [];

  subTasks[index].completed = !subTasks[index].completed;

  await updateDoc(taskRef, { subTasks });

  await updateDoc(doc(db, "projects", projectId), {
    lastUpdated: serverTimestamp()
  });
};

/* ================= MAIN COMPLETE ================= */

window.markComplete = async function (taskId) {

  const taskRef = doc(db, "projects", projectId, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  const data = taskSnap.data();

  const subTasks = data.subTasks || [];

  const allDone = subTasks.every(sub => sub.completed === true);

  if (!allDone && subTasks.length > 0) {
    alert("Complete all sub tasks first!");
    return;
  }

  await updateDoc(taskRef, { status: "completed" });

  await updateDoc(doc(db, "projects", projectId), {
    lastUpdated: serverTimestamp()
  });
};

/* ================= UPDATE STATS ================= */

function updateStats(total, completed, pending, overdue) {

  const completionRate = total
    ? Math.round((completed / total) * 100)
    : 0;

  document.getElementById("myTotal").innerText = total;
  document.getElementById("myCompleted").innerText = completed;
  document.getElementById("myPending").innerText = pending;
  document.getElementById("myOverdue").innerText = overdue;

  document.getElementById("myCompletionRate").innerText =
    completionRate + "%";

  document.getElementById("myStatusText").innerText =
    completionRate >= 80
      ? "Excellent performance 🚀"
      : completionRate >= 50
      ? "Good progress 👍"
      : "Needs improvement ⚡";

  updateChart(completed, pending);
}

/* ================= UPDATE CHART ================= */

function updateChart(completed, pending) {

  if (myChart) myChart.destroy();

  myChart = new Chart(
    document.getElementById("myChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [{
          data: [completed, pending],
          backgroundColor: ["#16a34a", "#d97706"]
        }]
      }
    }
  );
}

/* ================= LOGOUT ================= */

window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};