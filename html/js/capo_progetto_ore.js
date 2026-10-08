document.addEventListener("DOMContentLoaded", () => {
  const projectId = new URLSearchParams(window.location.search).get("id");
  if (!projectId) {
    console.error("Project ID mancante");
    return;
  }

  const projectTitle = document.getElementById("project-title");
  const fixedBody = document.getElementById("fixed-body");
  const daysHeader = document.getElementById("days-header");
  const daysBody = document.getElementById("days-body");
  const currentPeriod = document.getElementById("current-period");

  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const calendarBtn = document.getElementById("calendar-btn");
  const calendarPopup = document.getElementById("calendar-popup");
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const goBtn = document.getElementById("go-btn");

  const months = [
    "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
  ];
  const weekdays = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
  const CELL_WIDTH = "80px";

  let today = new Date();
  let month = today.getMonth();
  let year = today.getFullYear();

  /* ============================================================
     UTILITIES
  ============================================================ */

  function getAcademicYear(month, year) {
    return month >= 9
      ? `${year}/${String(year + 1).slice(-2)}`
      : `${year - 1}/${String(year).slice(-2)}`;
  }

  function updateDisplay() {
    currentPeriod.textContent = `${months[month]} ${year}`;
  }

  function daysInMonth(m, y) {
    return new Date(y, m + 1, 0).getDate();
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function decimalToHHMM(decimalHours) {
    if (decimalHours == null) return "";
    const totalMinutes = Math.round(Number(decimalHours) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  function toggleNoDataMessage(projectName, showMessage) {
  const tableContainer = document.querySelector(".timesheet-container");
  let messageContainer = document.getElementById("no-data-message");

  if (showMessage) {
    tableContainer?.classList.add("hidden");

    if (!messageContainer) {
      messageContainer = document.createElement("div");
      messageContainer.id = "no-data-message";
      messageContainer.style.textAlign = "center";
      messageContainer.style.margin = "30px 0";
      messageContainer.style.fontSize = "1.2em";
      messageContainer.style.color = "#555";
      document.querySelector("main")?.prepend(messageContainer);
    }

    messageContainer.textContent = `Ancora non sono state inviate ore per il progetto "${projectName}" in questo mese.`;
  } else {
    tableContainer?.classList.remove("hidden");
    messageContainer?.remove();
  }
}


  /* ============================================================
     FETCH BACKEND
  ============================================================ */

async function loadProjectData() {
  const academicYear = getAcademicYear(month, year);
  try {
    const res = await fetch(`/api/projects/${projectId}/overview_capo_progetto?month=${month+1}&academicYear=${academicYear}`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return console.error(data.message);

    // Controllo se ci sono ore inviate
    const hasMembers = data.project.members.length > 0;
    const hasWP = data.project.workpackages.some(wp => wp.members.length > 0);

    if (!hasMembers && !hasWP) {
      toggleNoDataMessage(data.project.name, true);
      return;
    }

    // Se ci sono dati → nascondi messaggio e mostra tabella
    toggleNoDataMessage(data.project.name, false);

    projectTitle.textContent = data.project.name;
    renderProjectsTable(data.project);

  } catch (err) {
    console.error("Errore fetch:", err);
  }
}

  /* ============================================================
     RENDER TABELLA
  ============================================================ */

  function renderProjectsTable(project) {
    fixedBody.innerHTML = "";
    daysHeader.innerHTML = "";
    daysBody.innerHTML = "";

    const numDays = daysInMonth(month, year);

    /* ---------- HEADER GIORNI ---------- */
    const headerRow = document.createElement("tr");

    for (let d = 1; d <= numDays; d++) {
      const th = document.createElement("th");
      const date = new Date(year, month, d);
      th.innerHTML = `
        <div class="weekday">${weekdays[date.getDay()]}</div>
        <div class="day-number">${d}</div>
      `;
      th.style.width = CELL_WIDTH;
      headerRow.appendChild(th);
    }

    ["Tot. ore mensile", "Budget ore", "Ore residue", "Stato"].forEach(label => {
  const th = document.createElement("th");
  th.textContent = label;
  th.classList.add("highlight-column", "summary-header");
  headerRow.appendChild(th);
});

    daysHeader.appendChild(headerRow);

    /* ---------- PROGETTO ---------- */
    if (project.members?.length > 0) {
      renderActivityRow(
        project.name,
        project.members,
        false,
        project.budget,
        project.remaining
      );
    }

    /* ---------- WORKPACKAGES ---------- */
    project.workpackages?.forEach(wp => {
      if (wp.members?.length > 0) {
        renderActivityRow(
          `${wp.code} – ${wp.description}`,
          wp.members,
          true,
          wp.budget,
          wp.remaining
        );
      }
    });
  }

  /* ============================================================
     RIGA PROGETTO / WP
  ============================================================ */

  function renderActivityRow(label, members, isWp, totalBudget, residue) {
    const indent = isWp ? 30 : 10;

    /* --- COLONNA SINISTRA --- */
    const trFixed = document.createElement("tr");
    trFixed.classList.add(isWp ? "wp-summary-row" : "sub-row-fixed");
    trFixed.innerHTML = `<td style="padding-left:${indent}px">${label}</td>`;
    fixedBody.appendChild(trFixed);

    /* --- COLONNA GIORNI --- */
    const trDays = document.createElement("tr");
    trDays.classList.add(isWp ? "wp-summary-row" : "sub-row-days");

    const totalsByDay = {};
    let totalUsed = 0;

    members.forEach(m => {
      Object.entries(m.days || {}).forEach(([dateStr, h]) => {
        const day = new Date(dateStr).getDate();
        totalsByDay[day] = (totalsByDay[day] || 0) + Number(h);
        totalUsed += Number(h);
      });
    });

    for (let d = 1; d <= daysInMonth(month, year); d++) {
      const td = document.createElement("td");
      td.classList.add("day-cell");
      td.textContent = totalsByDay[d] ? decimalToHHMM(totalsByDay[d]) : "";
      if (isWeekend(new Date(year, month, d))) td.classList.add("holiday-cell");
      trDays.appendChild(td);
    }

    [totalUsed, totalBudget, residue].forEach(v => {
      const td = document.createElement("td");
      td.classList.add("highlight-column", "total-cell");
      td.textContent = decimalToHHMM(v);
      trDays.appendChild(td);
    });

      // Stato: qui mettiamo "-" per progetto e WP
    const tdStatus = document.createElement("td");
    tdStatus.classList.add("highlight-column","total-cell");
    tdStatus.textContent = "-";
    trDays.appendChild(tdStatus);

    daysBody.appendChild(trDays);

    /* --- RIGHE UTENTE --- */
    members.forEach(m => renderMemberRow(m, isWp));
  }

  /* ============================================================
     RIGA UTENTE
  ============================================================ */

  function renderMemberRow(user, isWp) {
    const indent = isWp ? 50 : 30;

    const trFixed = document.createElement("tr");
    trFixed.classList.add("member-row-fixed");
    trFixed.innerHTML = `<td style="padding-left:${indent}px">👤 ${user.name}</td>`;
    fixedBody.appendChild(trFixed);

    const trDays = document.createElement("tr");
    trDays.classList.add("member-row-days");

    let totalUsed = 0;

    for (let d = 1; d <= daysInMonth(month, year); d++) {
      const td = document.createElement("td");
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const h = Number(user.days?.[dateStr] || 0);
      if (h) totalUsed += h;
      td.textContent = h ? decimalToHHMM(h) : "";
      if (isWeekend(new Date(year, month, d))) td.classList.add("holiday-cell");
      trDays.appendChild(td);
    }

    [totalUsed, user.budget, user.remaining].forEach(v => {
      const td = document.createElement("td");
      td.classList.add("highlight-column", "total-cell");
      td.textContent = decimalToHHMM(v);
      trDays.appendChild(td);
    });
    // Stato utente
const tdStatus = document.createElement("td");
tdStatus.classList.add("highlight-column","total-cell"); 
tdStatus.textContent = user.status || "-";
trDays.appendChild(tdStatus);

    daysBody.appendChild(trDays);
  }

  /* ============================================================
     NAVIGATORE PERIODO
  ============================================================ */

  function populateYears() {
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === year) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  prevBtn.addEventListener("click", () => {
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    updateDisplay();
    loadProjectData();
  });

  nextBtn.addEventListener("click", () => {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    updateDisplay();
    loadProjectData();
  });

  calendarBtn?.addEventListener("click", () => {
    calendarPopup.classList.toggle("hidden");
    populateYears();
    monthSelect.value = month;
    yearSelect.value = year;
  });

  goBtn?.addEventListener("click", () => {
    month = Number(monthSelect.value);
    year = Number(yearSelect.value);
    calendarPopup.classList.add("hidden");
    updateDisplay();
    loadProjectData();
  });

  /* ============================================================
     INIT
  ============================================================ */

  updateDisplay();
  loadProjectData();
});