import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* CONFIG */

const firebaseConfig = {
  apiKey: "AIzaSyD3exFsBPPO6tCl5PgURMzgzGmg9nRhhCo",
  authDomain: "hirelens-studio.firebaseapp.com",
  projectId: "hirelens-studio"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const params = new URLSearchParams(window.location.search);
const projectId = params.get("project");

if (!projectId) {
  window.location.href = "main.html";
}

let currentUser;
let membersData = {};

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

  membersData = projectSnap.data().members || {};

  if (!membersData[currentUser.uid] ||
      membersData[currentUser.uid].role !== "admin") {
    alert("Admin access only");
    window.location.href = `dashboard.html?project=${projectId}`;
    return;
  }

  loadMembers();
  loadTasks();
});

/* ================= MEMBER MANAGEMENT ================= */

function getAdminCount() {
  return Object.values(membersData)
    .filter(m => m.role === "admin").length;
}

function loadMembers() {

  const container = document.getElementById("membersContainer");
  container.innerHTML = "";

  Object.entries(membersData).forEach(([uid, data]) => {

    container.innerHTML += `
      <div style="margin-bottom:10px;">
        <strong>${data.name}</strong> (${data.role})
        ${uid !== currentUser.uid ? `
          <button onclick="changeRole('${uid}','admin')">Promote</button>
          <button onclick="changeRole('${uid}','member')">Demote</button>
          <button onclick="removeMember('${uid}')">Remove</button>
        ` : "(You)"}
      </div>
    `;
  });
}

window.changeRole = async function(uid, newRole){

  if (membersData[uid].role === "admin" &&
      newRole === "member" &&
      getAdminCount() === 1) {
    alert("Cannot demote the last admin.");
    return;
  }

  membersData[uid].role = newRole;

  await updateDoc(doc(db,"projects",projectId),{
    members: membersData,
    lastUpdated: serverTimestamp()
  });

  loadMembers();
};

window.removeMember = async function(uid){

  if (membersData[uid].role === "admin" &&
      getAdminCount() === 1) {
    alert("Cannot remove the last admin.");
    return;
  }

  delete membersData[uid];

  await updateDoc(doc(db,"projects",projectId),{
    members: membersData,
    lastUpdated: serverTimestamp()
  });

  loadMembers();
};

/* ================= TASK MANAGEMENT ================= */

async function loadTasks(){

  const snapshot = await getDocs(
    collection(db,"projects",projectId,"tasks")
  );

  const container = document.getElementById("tasksContainer");
  container.innerHTML = "";

  snapshot.forEach(docSnap => {

    const data = docSnap.data();

    container.innerHTML += `
      <tr>
        <td>
          <input value="${data.title}"
            onchange="editTask('${docSnap.id}','title',this.value)">
        </td>

        <td>
          <select onchange="changeAssignee('${docSnap.id}',this.value)">
            ${generateAssigneeOptions(data.assignedTo)}
          </select>
        </td>

        <td>
          <select onchange="editTask('${docSnap.id}','priority',this.value)">
            ${generatePriorityOptions(data.priority)}
          </select>
        </td>

        <td>
          <input type="date"
            value="${data.deadline || ''}"
            onchange="editTask('${docSnap.id}','deadline',this.value)">
        </td>

        <td>
          <button onclick="deleteTask('${docSnap.id}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}

function generateAssigneeOptions(selectedUid) {
  let options = "";
  Object.entries(membersData).forEach(([uid,data])=>{
    options += `
      <option value="${uid}"
        ${uid === selectedUid ? "selected" : ""}>
        ${data.name}
      </option>
    `;
  });
  return options;
}

function generatePriorityOptions(selectedPriority){
  const priorities = ["low","medium","high"];
  return priorities.map(p=>`
    <option value="${p}"
      ${p === selectedPriority ? "selected" : ""}>
      ${p}
    </option>
  `).join("");
}

window.editTask = async function(taskId, field, value){

  await updateDoc(
    doc(db,"projects",projectId,"tasks",taskId),
    { [field]: value }
  );

  await updateDoc(
    doc(db,"projects",projectId),
    { lastUpdated: serverTimestamp() }
  );
};

window.changeAssignee = async function(taskId, newUid){

  const newName = membersData[newUid].name;

  await updateDoc(
    doc(db,"projects",projectId,"tasks",taskId),
    {
      assignedTo: newUid,
      assignedToName: newName
    }
  );

  await updateDoc(
    doc(db,"projects",projectId),
    { lastUpdated: serverTimestamp() }
  );
};

window.deleteTask = async function(taskId){

  await deleteDoc(
    doc(db,"projects",projectId,"tasks",taskId)
  );

  await updateDoc(
    doc(db,"projects",projectId),
    { lastUpdated: serverTimestamp() }
  );

  loadTasks();
};
