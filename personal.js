import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { serverTimestamp } from 
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  doc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
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

let chartInstance = null;

/* AUTH CHECK */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Get user info from "users" collection using email
    const q = query(
      collection(db, "users"),
      where("email", "==", user.email)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      document.getElementById("welcomeText").innerText =
        `Welcome, ${user.email}`;
      loadUserTasks(user.email);
      return;
    }

    const userData = snapshot.docs[0].data();

    // Show name
    document.getElementById("welcomeText").innerText =
      `Welcome, ${userData.name}`;

    loadUserTasks(userData.email);

  } catch (err) {
    console.error("Error loading user:", err);
    loadUserTasks(user.email);
  }
});

/* LOAD USER TASKS */

function loadUserTasks(userEmail) {

  const q = query(
    collection(db, "tasks"),
    where("assignedToEmail", "==", userEmail)
  );

  onSnapshot(q, (snapshot) => {

    const table = document.getElementById("taskTable");
    table.innerHTML = "";

    let total = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;

    const now = new Date();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      const deadline = data.deadline?.toDate();
      if (!deadline) return;

      total++;

      if (data.status === "completed") completed++;
      else pending++;

      if (deadline < now && data.status !== "completed")
        overdue++;

      table.innerHTML += `
        <tr class="${deadline < now && data.status !== "completed" ? "overdue" : ""}">
          <td>${data.title}</td>
          <td>${data.status}</td>
          <td>${deadline.toLocaleDateString()}</td>
          <td>
            <select onchange="updateStatus('${id}', this.value)">
              <option value="pending" ${data.status==="pending"?"selected":""}>pending</option>
              <option value="progress" ${data.status==="progress"?"selected":""}>progress</option>
              <option value="completed" ${data.status==="completed"?"selected":""}>completed</option>
            </select>
          </td>
        </tr>
      `;
    });

    const rate = total ? ((completed / total) * 100).toFixed(1) : 0;

    document.getElementById("myTotal").innerText = total;
    document.getElementById("myCompleted").innerText = completed;
    document.getElementById("myPending").innerText = pending;
    document.getElementById("myOverdue").innerText = overdue;
    document.getElementById("myCompletionRate").innerText = rate + "%";

    updateStatusText(rate);
    updateChart(completed, pending);
    revealSections();
  });
}

/* UPDATE STATUS */

window.updateStatus = async function (taskId, newStatus) {

  const taskRef = doc(db, "tasks", taskId);

  if (newStatus === "completed") {

    await updateDoc(taskRef, {
      status: newStatus,
      completedAt: serverTimestamp()
    });

  } else {

    await updateDoc(taskRef, {
      status: newStatus,
      completedAt: null         // remove if reopened
    });

  }
};

/* STATUS MESSAGE */

function updateStatusText(rate) {
  const status = document.getElementById("myStatusText");

  if (rate >= 85) {
    status.innerText = "Excellent performance 🔥";
    status.style.color = "#22c55e";
  } else if (rate >= 60) {
    status.innerText = "Good progress. Keep pushing.";
    status.style.color = "#f59e0b";
  } else {
    status.innerText = "Needs improvement.";
    status.style.color = "#ef4444";
  }
}

/* CHART */

function updateChart(completed, pending) {

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(
    document.getElementById("myChart"),
    {
      type: "doughnut",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [{
          data: [completed, pending]
        }]
      },
      options: {
        maintainAspectRatio: false,   // ⭐ IMPORTANT
        plugins: {
          legend: { position: "bottom" }
        }
      }
    }
  );
}


/* LOGOUT */

window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
};

/* REVEAL ANIMATION */

function revealSections() {
  const sections = document.querySelectorAll(".reveal-section");
  sections.forEach((section, index) => {
    setTimeout(() => {
      section.classList.add("show");
    }, index * 300);
  });
}