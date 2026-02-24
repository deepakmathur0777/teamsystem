/* ================= FIREBASE IMPORTS ================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= FIREBASE CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "hirelens-studio.firebaseapp.com",
  projectId: "hirelens-studio",
  storageBucket: "hirelens-studio.firebasestorage.app",
  messagingSenderId: "274271462149",
  appId: "1:274271462149:web:6df015d15a7c908a900d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= AUTH CHECK ================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await checkAdmin(user);
});

/* ================= ADMIN CHECK (EMAIL LOCKED) ================= */

async function checkAdmin(user) {

  const email = user.email?.trim().toLowerCase();

  const q = query(
    collection(db, "users"),
    where("email", "==", email)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    alert("User not found in database");
    window.location.href = "personal.html";
    return;
  }

  const data = snap.docs[0].data();

  if (!data.role || data.role.toLowerCase() !== "admin") {
    alert("Access Denied: Admin Only");
    window.location.href = "personal.html";
    return;
  }

  console.log("Admin verified:", email);
  loadAdminData();
}

/* ================= LOAD ADMIN DATA ================= */

async function loadAdminData() {

  const usersSnap = await getDocs(collection(db, "users"));
  const tasksSnap = await getDocs(collection(db, "tasks"));

  const members = {};
  const now = new Date();

  let totalOverdue = 0;
  let dueToday = 0;
  let longPending = 0;

  /* ===== INIT MEMBERS ===== */

  usersSnap.forEach(doc => {
    const u = doc.data();

    if (u.role && u.role.toLowerCase() === "member") {
      members[u.email.toLowerCase()] = {
        name: u.name,
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        onTime: 0,
        late: 0,
        totalDelay: 0,
        delayCount: 0
      };
    }
  });

  /* ===== PROCESS TASKS ===== */

  tasksSnap.forEach(doc => {

    const t = doc.data();
    const deadline = t.deadline?.toDate?.();
    if (!deadline) return;

    const assignedEmail = t.assignedToEmail?.toLowerCase();
    const member = members[assignedEmail];
    if (!member) return;

    member.total++;

    const isToday =
      deadline.toDateString() === now.toDateString();

    if (isToday) dueToday++;

    if (t.status === "completed") {

      member.completed++;

      if (t.completedAt) {

        const done =
          t.completedAt.toDate
            ? t.completedAt.toDate()
            : new Date(t.completedAt);

        if (done <= deadline) {
          member.onTime++;
        } else {
          member.late++;

          const delay =
            (done - deadline) / (1000 * 60 * 60 * 24);

          member.totalDelay += delay;
          member.delayCount++;
        }
      }

    } else {

      member.pending++;

      if (deadline < now) {
        member.overdue++;
        totalOverdue++;

        const days =
          (now - deadline) / (1000 * 60 * 60 * 24);

        if (days > 5) longPending++;
      }
    }
  });

  renderAdmin(members, totalOverdue, dueToday, longPending);
}

/* ================= RENDER DASHBOARD ================= */

function renderAdmin(members, totalOverdue, dueToday, longPending) {

  const container = document.getElementById("memberOverview");
  container.innerHTML = "";

  const list = Object.values(members);

  /* ===== LEADERBOARD ===== */

  const top =
    [...list]
      .sort((a, b) =>
        (b.completed / b.total || 0) -
        (a.completed / a.total || 0)
      )
      .slice(0, 3);

  console.log("Top Performers:", top);

  /* ===== MEMBER CARDS ===== */

  list.forEach(m => {

    const rate =
      m.total
        ? ((m.completed / m.total) * 100).toFixed(1)
        : 0;

    const avgDelay =
      m.delayCount
        ? (m.totalDelay / m.delayCount).toFixed(1)
        : 0;

    container.innerHTML += `
      <div class="member-card">
        <h3>${m.name}</h3>

        <p>Total: ${m.total}</p>
        <p>Completed: ${m.completed}</p>
        <p>✔ On Time: ${m.onTime}</p>
        <p>⏰ Late: ${m.late}</p>
        <p>Pending: ${m.pending}</p>
        <p>Overdue: ${m.overdue}</p>

        <p>Completion: ${rate}%</p>
        <p>Avg Delay: ${avgDelay} days</p>
      </div>
    `;
  });

  /* ===== TOP STATS ===== */

  document.getElementById("totalMembers").innerText =
    list.length;

  document.getElementById("totalOverdue").innerText =
    totalOverdue;

  document.getElementById("lowPerformers").innerText =
    list.filter(m =>
      m.total && m.completed / m.total < 0.6
    ).length;

  console.log("Due Today:", dueToday);
  console.log("Long Pending:", longPending);
}
