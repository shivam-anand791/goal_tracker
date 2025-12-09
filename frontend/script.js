// ---------------- CONFIG & STATE ----------------

const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = "token";

// Get JWT token from localStorage
function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Helper function for authenticated API calls
async function authFetch(endpoint, options = {}) {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "auth.html";
  }

  return response;
}

// -------- UI helpers --------
function showLoading(visible) {
  const ov = document.getElementById("loadingOverlay");
  if (!ov) return;
  ov.setAttribute("aria-hidden", visible ? "false" : "true");
}

function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Debounced autosave: reads #saveStatus element dynamically
const debouncedSave = debounce(async () => {
  const saveStatus = document.getElementById("saveStatus");
  if (saveStatus) saveStatus.textContent = "Saving...";
  try {
    await saveState();
    if (saveStatus) {
      saveStatus.textContent = "Saved";
      setTimeout(() => (saveStatus.textContent = ""), 1000);
    }
  } catch (err) {
    console.error("debouncedSave failed", err);
    if (saveStatus) saveStatus.textContent = "Save failed";
  }
}, 800);


let state = {
  monthName: "November",
  monthLength: 30,
  habits: [
    "Wake up at 05:00",
    "Gym",
    "Reading / Learning",
    "Day Planning",
    "Budget Tracking",
    "Project Work",
    "No Alcohol",
    "Social Media Detox"
  ].map((name) => ({
    id: createId(),
    name,
    goal: 30,
    checks: Array(30).fill(false)
  }))
};

// ---------------- INIT ----------------

document.addEventListener("DOMContentLoaded", async () => {
  // Load server state first so UI renders persisted data
  try {
    showLoading(true);
    await loadState();
  } finally {
    showLoading(false);
  }
  initControls();
  renderAll();
  initLogout();
});

// ---------------- CORE RENDER ----------------

function renderAll() {
  renderHeaderInputs();
  renderHabitTable();
  renderAnalysisTable();
  recalcAll();
}

// month name & length inputs
function renderHeaderInputs() {
  const monthInput = document.getElementById("monthNameInput");
  const lengthSelect = document.getElementById("monthLengthSelect");

  monthInput.value = state.monthName;
  lengthSelect.value = String(state.monthLength);
}

// Habit table (header + body + footer)
function renderHabitTable() {
  const table = document.getElementById("habitTable");
  const theadRow = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");
  const tfoot = table.querySelector("tfoot");

  // header
  theadRow.innerHTML = "";

  const habitHeader = document.createElement("th");
  habitHeader.textContent = "Habit";
  theadRow.appendChild(habitHeader);

  for (let day = 1; day <= state.monthLength; day++) {
    const th = document.createElement("th");
    th.textContent = day;
    theadRow.appendChild(th);
  }

  // body
  tbody.innerHTML = "";
  state.habits.forEach((habit) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    const nameWrapper = document.createElement("div");
    nameWrapper.className = "habit-name-cell";

    const nameSpan = document.createElement("span");
    nameSpan.className = "habit-name";
    nameSpan.textContent = habit.name;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "habit-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editHabitName(habit.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn";
    delBtn.textContent = "Del";
    delBtn.addEventListener("click", () => deleteHabit(habit.id));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);

    nameWrapper.appendChild(nameSpan);
    nameWrapper.appendChild(actionsDiv);
    nameTd.appendChild(nameWrapper);
    tr.appendChild(nameTd);

    for (let day = 0; day < state.monthLength; day++) {
      const td = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!habit.checks[day];
      cb.dataset.habitId = habit.id;
      cb.dataset.dayIndex = String(day);
      cb.addEventListener("change", onCheckboxChange);
      td.appendChild(cb);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });

  // footer: daily done + daily progress
  tfoot.innerHTML = "";

  const doneRow = document.createElement("tr");
  const doneLabel = document.createElement("td");
  doneLabel.textContent = "Done";
  doneRow.appendChild(doneLabel);

  for (let day = 0; day < state.monthLength; day++) {
    const td = document.createElement("td");
    td.className = "daily-done";
    td.dataset.dayIndex = String(day);
    doneRow.appendChild(td);
  }

  const progRow = document.createElement("tr");
  const progLabel = document.createElement("td");
  progLabel.textContent = "Progress %";
  progRow.appendChild(progLabel);

  for (let day = 0; day < state.monthLength; day++) {
    const td = document.createElement("td");
    td.className = "daily-progress";
    td.dataset.dayIndex = String(day);
    progRow.appendChild(td);
  }

  tfoot.appendChild(doneRow);
  tfoot.appendChild(progRow);
}

// Analysis table on the right
function renderAnalysisTable() {
  const tbody = document.querySelector("#analysisTable tbody");
  tbody.innerHTML = "";

  state.habits.forEach((habit) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = habit.name;

    const goalTd = document.createElement("td");
    const goalInput = document.createElement("input");
    goalInput.type = "number";
    goalInput.min = "0";
    goalInput.max = String(state.monthLength);
    goalInput.value = String(habit.goal);
    goalInput.className = "goal-input";
    goalInput.dataset.habitId = habit.id;
    goalInput.addEventListener("change", onGoalChange);
    goalTd.appendChild(goalInput);

    const actualTd = document.createElement("td");
    actualTd.className = "habit-actual";
    actualTd.dataset.habitId = habit.id;
    actualTd.textContent = "0";

    const progressTd = document.createElement("td");
    const barBg = document.createElement("div");
    barBg.className = "bar-bg";
    const barFill = document.createElement("div");
    barFill.className = "bar-fill";
    barFill.dataset.habitId = habit.id;
    barBg.appendChild(barFill);
    progressTd.appendChild(barBg);

    tr.appendChild(nameTd);
    tr.appendChild(goalTd);
    tr.appendChild(actualTd);
    tr.appendChild(progressTd);

    tbody.appendChild(tr);
  });
}

// ---------------- CALCULATIONS ----------------

function recalcAll() {
  const totalHabits = state.habits.length;
  const totalDays = state.monthLength;

  let totalDone = 0;
  const dayDone = new Array(totalDays).fill(0);

  state.habits.forEach((habit) => {
    habit.checks.forEach((val, day) => {
      if (val) {
        totalDone++;
        dayDone[day]++;
      }
    });
  });

  // header summary
  document.getElementById("numHabits").textContent = String(totalHabits);
  document.getElementById("completedHabits").textContent = String(totalDone);

  const totalPossible = totalHabits * totalDays;
  const overallPercent =
    totalPossible === 0 ? 0 : (totalDone / totalPossible) * 100;
  document.getElementById("overallProgress").textContent =
    overallPercent.toFixed(1) + "%";

  // daily rows
  document.querySelectorAll(".daily-done").forEach((td) => {
    const dayIndex = Number(td.dataset.dayIndex);
    td.textContent = String(dayDone[dayIndex] || 0);
  });

  document.querySelectorAll(".daily-progress").forEach((td) => {
    const dayIndex = Number(td.dataset.dayIndex);
    const percent =
      totalHabits === 0 ? 0 : (dayDone[dayIndex] / totalHabits) * 100;
    td.textContent = percent.toFixed(0) + "%";
  });

  // per-habit analysis
  updateAnalysis();
}

function updateAnalysis() {
  const totalDays = state.monthLength;

  state.habits.forEach((habit) => {
    const actual = habit.checks.filter(Boolean).length;

    const actualCell = document.querySelector(
      `.habit-actual[data-habit-id="${habit.id}"]`
    );
    if (actualCell) actualCell.textContent = String(actual);

    const bar = document.querySelector(
      `.bar-fill[data-habit-id="${habit.id}"]`
    );
    if (bar) {
      const denominator = habit.goal > 0 ? habit.goal : totalDays || 1;
      const percent = Math.min(100, (actual / denominator) * 100);
      bar.style.width = percent.toFixed(1) + "%";
    }
  });
}

// ---------------- EVENT HANDLERS ----------------

function onCheckboxChange(e) {
  const cb = e.target;
  const habitId = cb.dataset.habitId;
  const dayIndex = Number(cb.dataset.dayIndex);

  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;

  habit.checks[dayIndex] = cb.checked;
  debouncedSave();
  recalcAll();
}

function onGoalChange(e) {
  const input = e.target;
  const habitId = input.dataset.habitId;
  let value = Number(input.value);
  if (Number.isNaN(value) || value < 0) value = 0;
  if (value > state.monthLength) value = state.monthLength;
  input.value = String(value);

  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;

  habit.goal = value;
  debouncedSave();
  recalcAll();
}

function editHabitName(habitId) {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;

  const newName = prompt("Edit habit name:", habit.name);
  if (newName === null) return; // cancelled
  const trimmed = newName.trim();
  if (!trimmed) return;

  habit.name = trimmed;
  debouncedSave();
  renderAll();
}

function deleteHabit(habitId) {
  if (!confirm("Delete this habit? Progress for it will be lost.")) return;
  state.habits = state.habits.filter((h) => h.id !== habitId);
  debouncedSave();
  renderAll();
}

// ---------------- CONTROLS ----------------

function initControls() {
  // add habit
  const form = document.getElementById("addHabitForm");
  const input = document.getElementById("newHabitName");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;

    const newHabit = {
      id: createId(),
      name,
      goal: state.monthLength, // default: every day
      checks: Array(state.monthLength).fill(false)
    };
    state.habits.push(newHabit);
    input.value = "";
    debouncedSave();
    renderAll();
  });

  // month name
  const monthInput = document.getElementById("monthNameInput");
  monthInput.addEventListener("change", () => {
    const name = monthInput.value.trim();
    state.monthName = name || "My Month";
    debouncedSave();
    renderHeaderInputs(); // to re-normalise value
  });

  // month length
  const lengthSelect = document.getElementById("monthLengthSelect");
  lengthSelect.addEventListener("change", () => {
    const newLength = Number(lengthSelect.value);
    if (!newLength) return;
    adjustMonthLength(newLength);
    debouncedSave();
    renderAll();
  });

  // new month (clear checks but keep habits & goals)
  document.getElementById("newMonthBtn").addEventListener("click", () => {
    if (!confirm("Start a new month? All checkboxes will be cleared.")) return;
    state.habits.forEach((h) => {
      h.checks = Array(state.monthLength).fill(false);
    });
    debouncedSave();
    renderAll();
  });

  // reset all (persist reset to server)
  document.getElementById("resetAllBtn").addEventListener("click", async () => {
    const ok = confirm(
      "Reset everything? This will DELETE all habits and progress both locally and on the server. This action cannot be undone. Do you want to continue?"
    );
    if (!ok) return;

    // reset local state
    state = {
      monthName: "New Month",
      monthLength: 30,
      habits: []
    };

    // persist empty month to server
    try {
      await saveState();
    } catch (err) {
      console.error("Failed to persist reset to server:", err);
    }

    renderAll();
  });

  // manual save button
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        saveBtn.disabled = true;
        if (saveStatus) saveStatus.textContent = "Saving...";
        await saveState();
        if (saveStatus) {
          saveStatus.textContent = "Saved";
          setTimeout(() => {
            saveStatus.textContent = "";
          }, 1500);
        }
      } catch (err) {
        console.error("Manual save failed:", err);
        if (saveStatus) saveStatus.textContent = "Save failed";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
}

function adjustMonthLength(newLength) {
  const oldLength = state.monthLength;
  state.monthLength = newLength;

  state.habits.forEach((habit) => {
    const checks = habit.checks.slice(0, newLength);
    while (checks.length < newLength) {
      checks.push(false);
    }
    habit.checks = checks;
    if (habit.goal > newLength) habit.goal = newLength;
  });
}

// -------- LOGOUT --------

function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "auth.html";
      }
    });
  }
}

// ---------------- STORAGE ----------------

async function saveState() {
  try {
    const payload = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      monthLength: state.monthLength,
      title: state.monthName,
      habits: state.habits.map((h) => ({
        name: h.name,
        goal: h.goal,
        checks: h.checks
      }))
    };

    const res = await authFetch(`/months/save`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    // optional: check response
    if (res && !res.ok) {
      console.warn("Failed to save state to server", await res.text());
    }
  } catch (err) {
    console.error("saveState error:", err);
  }
}


async function loadState() {
  try {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const res = await authFetch(`/months/${year}/${month}`);
    if (!res) return; // authFetch may redirect

    if (!res.ok) {
      // no data or error; keep local defaults
      return;
    }

    const data = await res.json();
    if (!data) return;

    // Map server document to client state shape
    state.monthName = data.title || state.monthName;
    state.monthLength = data.monthLength || state.monthLength;
    state.habits = (data.habits || []).map((h) => ({
      id: h._id || createId(),
      name: h.name || "",
      goal: h.goal || state.monthLength,
      checks: Array.isArray(h.checks) ? h.checks.slice(0, state.monthLength).concat(Array(Math.max(0, state.monthLength - (h.checks || []).length)).fill(false)) : Array(state.monthLength).fill(false)
    }));
  } catch (err) {
    console.error("loadState error:", err);
  }
}


// ---------------- UTIL ----------------

function createId() {
  // simple id generator
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}
