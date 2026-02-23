import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   FIREBASE CONFIG
=============================== */
const firebaseConfig = {
  apiKey: "AIzaSyD3exFsBPPO6tCl5PgURMzgzGmg9nRhhCo",
  authDomain: "hirelens-studio.firebaseapp.com",
  projectId: "hirelens-studio",
  storageBucket: "hirelens-studio.firebasestorage.app",
  messagingSenderId: "274271462149",
  appId: "1:274271462149:web:6df015d15a7c908a900d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ===============================
   VARIABLES
=============================== */
let showTodayOnly = false;
let allTasks = [];
let mainChartInstance = null;
let weeklyChartInstance = null;


/* ===============================
   HELPERS
=============================== */
function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/* ===============================
   MAIN DASHBOARD
=============================== */
function renderDashboard() {

  const table = document.getElementById("taskTable");
  table.innerHTML = "";

  let total = 0;
  let completed = 0;
  let pending = 0;
  let overdue = 0;
  let memberData = {};
  let weeklyData = {};
  const now = new Date();

  const filtered = showTodayOnly
    ? allTasks.filter(t =>
        t.deadline?.toDate() && isToday(t.deadline.toDate())
      )
    : allTasks;

  filtered.forEach(task => {

    const deadline = task.deadline?.toDate();
    if (!deadline) return;

    total++;

    if (!memberData[task.assignedTo])
      memberData[task.assignedTo] = { total: 0, completed: 0 };

    memberData[task.assignedTo].total++;

    if (task.status === "completed") {
      completed++;
      memberData[task.assignedTo].completed++;

      const label = deadline.toLocaleDateString();
      weeklyData[label] = (weeklyData[label] || 0) + 1;

    } else {
      pending++;
      if (deadline < now) overdue++;
    }

    table.innerHTML += `
      <tr class="${deadline < now && task.status !== "completed" ? "overdue" : ""}">
        <td>${task.title || "-"}</td>
        <td>${task.assignedTo || "-"}</td>
        <td>${task.status || "-"}</td>
        <td>${deadline.toLocaleDateString()}</td>
      </tr>
    `;
  });

  const completionRate = total
    ? ((completed / total) * 100).toFixed(1)
    : 0;

  const efficiency = total
    ? (((completed - overdue) / total) * 100).toFixed(1)
    : 0;

  document.getElementById("totalTasks").innerText = total;
  document.getElementById("completedTasks").innerText = completed;
  document.getElementById("pendingTasks").innerText = pending;
  document.getElementById("overdueTasks").innerText = overdue;
  document.getElementById("completionRate").innerText = completionRate + "%";
  document.getElementById("efficiencyRate").innerText = efficiency + "%";
  document.getElementById("progressBar").style.width = completionRate + "%";

  renderMembers(memberData);
  updateCharts(completed, pending, weeklyData);
}

/* ===============================
   MEMBERS
=============================== */
function renderMembers(data) {
  const container = document.getElementById("memberStats");
  container.innerHTML = "";

  Object.keys(data).forEach(member => {

    const m = data[member];

    container.innerHTML += `
      <div class="member-card" onclick="toggleMember(this)">
        <strong>${member}</strong>
        (${m.completed}/${m.total})
        <div class="member-tasks">
          ${
            allTasks
              .filter(t => t.assignedTo === member)
              .map(t => `
                <div>
                  ${t.title}
                  <span class="badge ${t.status}">
                    ${t.status}
                  </span>
                </div>
              `).join("")
          }
        </div>
      </div>
    `;
  });
}

/* ===============================
   CHARTS
=============================== */
function updateCharts(completed, pending, weeklyData) {

  if (mainChartInstance) mainChartInstance.destroy();
  mainChartInstance = new Chart(
    document.getElementById("progressChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [{ data: [completed, pending] }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    }
  );

  if (weeklyChartInstance) weeklyChartInstance.destroy();
  weeklyChartInstance = new Chart(
    document.getElementById("weeklyChart"),
    {
      type: "line",
      data: {
        labels: Object.keys(weeklyData),
        datasets: [{
          label: "Completed",
          data: Object.values(weeklyData),
          tension: 0.3
        }]
      },
      options: { maintainAspectRatio: false }
    }
  );
}

/* ===============================
   FIRESTORE LISTENER
=============================== */
const q = query(collection(db, "tasks"), orderBy("deadline"));

onSnapshot(q, snapshot => {

  allTasks = [];
  snapshot.forEach(doc => allTasks.push(doc.data()));

  renderDashboard();

  // ⭐ IMPORTANT → hide loader
  document.getElementById("loader").style.display = "none";
  document.getElementById("dashboardContent").classList.remove("hidden");

}, error => {
  console.error("Firestore error:", error);
  document.getElementById("loader").innerText =
    "Error loading data. Check console.";
});