document.addEventListener("DOMContentLoaded", () => {
  const projectId = new URLSearchParams(window.location.search).get("id");
  if (!projectId) return console.error("Project ID mancante");

  let currentProjectData = null;
  let currentPopupAction = null;

  const editBtn = document.getElementById("edit-project-btn");

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

  const reopenBtn = document.getElementById("reopen-btn");
  const approveBtn = document.getElementById("approve-btn");
  const reportBtn = document.getElementById("report-btn");

  const popupOverlay = document.getElementById("ts-popup-overlay");
  const popupTitle = document.getElementById("ts-popup-title");
  const popupUserList = document.getElementById("ts-popup-user-list");
  const popupNoteContainer = document.getElementById("ts-popup-note-container");
  const popupNote = document.getElementById("ts-popup-note");
  const popupConfirm = document.getElementById("ts-popup-confirm");
  const popupCancel = document.getElementById("ts-popup-cancel");

  const months = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const weekdays = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
  const CELL_WIDTH = "80px";

  let today = new Date();
  let month = today.getMonth();
  let year = today.getFullYear();

  function getAcademicYear(month, year) {
    return month >= 9 ? `${year}/${String(year+1).slice(-2)}` : `${year-1}/${String(year).slice(-2)}`;
  }

  function updateDisplay() {
    currentPeriod.textContent = `${months[month]} ${year}`;
  }

  function daysInMonth(m, y) { return new Date(y, m+1, 0).getDate(); }
  function isWeekend(date) { return date.getDay() === 0 || date.getDay() === 6; }

  function decimalToHHMM(decimalHours) {
    if (!decimalHours) return "";
    const totalMinutes = Math.round(Number(decimalHours) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }

  function toggleNoDataMessage(projectName, showMessage) {
    const tableContainer = document.querySelector(".timesheet-container");
    const buttonsContainer = document.querySelector(".button-container");
    let messageContainer = document.getElementById("no-data-message");

    if (showMessage) {
      tableContainer?.classList.add("hidden");
      buttonsContainer?.classList.add("hidden");

      if (!messageContainer) {
        messageContainer = document.createElement("div");
        messageContainer.id = "no-data-message";
        messageContainer.style.textAlign = "center";
        messageContainer.style.margin = "30px 0";
        messageContainer.style.fontSize = "1.2em";
        messageContainer.style.color = "#555";
        document.querySelector("main")?.prepend(messageContainer);
      }

      messageContainer.textContent =
        `Ancora non sono state inviate ore per il progetto "${projectName}" in questo mese.`;
    } else {
      tableContainer?.classList.remove("hidden");
      buttonsContainer?.classList.remove("hidden");
      messageContainer?.remove();
    }
  }

  async function loadProjectData() {
    const academicYear = getAcademicYear(month, year);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/overview?month=${month+1}&academicYear=${academicYear}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!data.success) return console.error(data.message);

      currentProjectData = data.project;

      const hasMembers = data.project.members.length > 0;
      const hasWP = data.project.workpackages.some(wp => wp.members.length > 0);

      if (!hasMembers && !hasWP) {
        toggleNoDataMessage(data.project.name, true);
        return;
      }

      toggleNoDataMessage(data.project.name, false);
      projectTitle.textContent = data.project.name;
      renderProjectsTable(data.project);

    } catch (err) {
      console.error("Errore fetch:", err);
    }
  }

  function renderProjectsTable(project) {
    fixedBody.innerHTML = "";
    daysHeader.innerHTML = "";
    daysBody.innerHTML = "";
    const numDays = daysInMonth(month, year);

    const headerRow = document.createElement("tr");
    for (let d = 1; d <= numDays; d++) {
      const th = document.createElement("th");
      const date = new Date(year, month, d);
      th.innerHTML =
        `<div class="weekday">${weekdays[date.getDay()]}</div>
         <div class="day-number">${d}</div>`;
      th.style.width = CELL_WIDTH;
      headerRow.appendChild(th);
    }

    ["Tot.ore mensile","Budget ore","Ore Resiude","Stato"].forEach(t => {
      const th = document.createElement("th");
      th.textContent = t;
      th.classList.add("highlight-column","summary-header");
      headerRow.appendChild(th);
    });

    daysHeader.appendChild(headerRow);

    if (project.members.length > 0) {
      renderActivityRow(project.name, project.members, false, project.budget, project.remaining);
    }

    project.workpackages.forEach(wp => {
      if (wp.members.length > 0) {
        renderActivityRow(`${wp.code} – ${wp.description}`, wp.members, true, wp.budget, wp.remaining);
      }
    });
  }

  function renderActivityRow(label, members, isWp, totalBudget, residue) {
    const indent = isWp ? 30 : 10;

    const trFixed = document.createElement("tr");
    trFixed.classList.add(isWp ? "wp-summary-row" : "sub-row-fixed");
    trFixed.innerHTML = `<td style="padding-left:${indent}px">${label}</td>`;
    fixedBody.appendChild(trFixed);

    const trDays = document.createElement("tr");
    trDays.classList.add(isWp ? "wp-summary-row" : "sub-row-days");

    const totalsByDay = {};
    let totalUsed = 0;

    members.forEach(m => {
      Object.entries(m.days || {}).forEach(([dateStr,h]) => {
        const day = new Date(dateStr).getDate();
        totalsByDay[day] = (totalsByDay[day] || 0) + Number(h);
        totalUsed += Number(h);
      });
    });

    for (let d=1; d<=daysInMonth(month, year); d++) {
      const td = document.createElement("td");
      td.classList.add("day-cell");
      td.textContent = totalsByDay[d] ? decimalToHHMM(totalsByDay[d]) : "";
      if(isWeekend(new Date(year, month, d))) td.classList.add("holiday-cell");
      trDays.appendChild(td);
    }

    [totalUsed, totalBudget, residue].forEach(v => {
      const td = document.createElement("td");
      td.classList.add("highlight-column","total-cell");
      td.textContent = decimalToHHMM(v);
      trDays.appendChild(td);
    });

    const tdStatus = document.createElement("td");
    tdStatus.classList.add("highlight-column","total-cell");
    tdStatus.textContent = "-";
    trDays.appendChild(tdStatus);

    daysBody.appendChild(trDays);

    members.forEach(m => renderMemberRow(m, isWp));
  }

  function renderMemberRow(user, isWp) {
    const indent = isWp ? 50 : 30;

    const trFixed = document.createElement("tr");
    trFixed.classList.add("member-row-fixed");
    trFixed.innerHTML = `<td style="padding-left:${indent}px">👤 ${user.name}</td>`;
    fixedBody.appendChild(trFixed);

    const trDays = document.createElement("tr");
    trDays.classList.add("member-row-days");

    let totalUsed = 0;
    for (let d=1; d<=daysInMonth(month, year); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const h = Number(user.days?.[dateStr] || 0);
      if(h) totalUsed += h;
      const td = document.createElement("td");
      td.textContent = h ? decimalToHHMM(h) : "";
      if(isWeekend(new Date(year, month, d))) td.classList.add("holiday-cell");
      trDays.appendChild(td);
    }

    [totalUsed, user.budget, user.remaining].forEach(v => {
      const td = document.createElement("td");
      td.classList.add("highlight-column","total-cell");
      td.textContent = decimalToHHMM(v);
      trDays.appendChild(td);
    });

    const tdStatus = document.createElement("td");
    tdStatus.classList.add("highlight-column","total-cell");
    tdStatus.textContent = user.status || "-";
    trDays.appendChild(tdStatus);

    daysBody.appendChild(trDays);
  }

  // ===================== POPUP =====================
  reopenBtn?.addEventListener("click", () => openTimesheetPopup("REOPEN"));
  approveBtn?.addEventListener("click", () => openTimesheetPopup("APPROVE"));
  reportBtn?.addEventListener("click", () => openTimesheetPopup("REPORT"));

  function openTimesheetPopup(action) {
    if (!currentProjectData) return;

    currentPopupAction = action;

    popupTitle.textContent =
      action === "REOPEN" ? "Riapri timesheet" :
      action === "APPROVE" ? "Approva timesheet" :
      "Rendiconta timesheet";

    popupNoteContainer.classList.toggle("ts-hidden", action !== "REOPEN");
    popupNote.value = "";

    populatePopupUsers();
    popupOverlay.classList.remove("ts-hidden");
  }
function populatePopupUsers() {
  popupUserList.innerHTML = "";

  const usersMap = new Map();

  currentProjectData.members.forEach(u => usersMap.set(u.user_id, u));
  currentProjectData.workpackages.forEach(wp =>
    wp.members.forEach(u => usersMap.set(u.user_id, u))
  );

  console.log("Utenti da mostrare nel popup:", Array.from(usersMap.values()));

  Array.from(usersMap.values()).forEach(u => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>
        <input type="checkbox" value="${Number(u.user_id)}">
        ${u.name}
      </label>
    `;
    popupUserList.appendChild(div);
  });

  const allCheckboxes = [...popupUserList.querySelectorAll("input")];
  console.log("Checkbox inseriti nel popup:", allCheckboxes.map(cb => cb.value));
}
  popupCancel?.addEventListener("click", closeTimesheetPopup);
  popupOverlay?.addEventListener("click", e => {
    if (e.target === popupOverlay) closeTimesheetPopup();
  });

  function closeTimesheetPopup() {
    popupOverlay.classList.add("ts-hidden");
    popupUserList.innerHTML = "";
    currentPopupAction = null;
  }

  popupConfirm?.addEventListener("click", async () => {
     console.log("popupUserList:", popupUserList);
  const selectedUsers = [...popupUserList.querySelectorAll("input:checked")]
  .map(cb => parseInt(cb.value, 10))
  .filter(n => !isNaN(n));
   console.log("Utenti selezionati:", selectedUsers);
  if (!selectedUsers.length) return alert("Seleziona almeno un utente.");

  let action = null;
  switch(currentPopupAction) {
    case "APPROVE": action = "approvato"; break;
    case "REPORT": action = "rendicontato"; break;
    case "REOPEN": action = "riaperto"; break;
  }

  try {
    const academicYear = getAcademicYear(month, year);

    const res = await fetch(`/api/projects/${projectId}/change_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        action,
        userIds: selectedUsers,
        note: action === "riaperto" ? popupNote.value : null,
        month: month + 1,
        academicYear
      })
    });


    const data = await res.json();

    if (!data.success && !data.skipped) {
      return alert(data.message || "Operazione fallita");
    }

    // ----- Gestione utenti saltati -----
    if (Array.isArray(data.skipped) && data.skipped.length > 0) {
      const skippedMessage = data.skipped.map(s => {
        // Trova il nome dell'utente
        let userName = s.userName || s.userId;
        currentProjectData.members.forEach(u => {
          if (u.user_id === s.userId) userName = u.name;
        });
        currentProjectData.workpackages.forEach(wp => {
          wp.members.forEach(u => {
            if (u.user_id === s.userId) userName = u.name;
          });
        });

        // Trova il nome del progetto
        let projectName = s.projectName || s.projectId;
        if (currentProjectData.id === s.projectId) {
          projectName = currentProjectData.name;
        } else {
          currentProjectData.workpackages.forEach(wp => {
            if (wp.id === s.projectId) projectName = `${wp.code} – ${wp.description}`;
          });
        }

        return `👤 ${userName}\n ${projectName}\nStato corrente: ${s.currentStatus}\nAzione: ${s.action}\nMotivo: ${s.reason}`;
      }).join("\n\n");

      alert(`Alcune operazioni non sono andate a buon fine:\n\n${skippedMessage}`);
    }

    // ----- Messaggio di successo -----
    if (data.updatedCount > 0) {
      alert(`Stati aggiornati correttamente`);
    }

    closeTimesheetPopup();
    loadProjectData(); // ricarica la tabella con i nuovi stati

  } catch (err) {
    console.error("Errore aggiornamento stato:", err);
    alert("Errore nella comunicazione con il server.");
  }

});

  // ===================== NAVIGAZIONE =====================
  function populateYears() {
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    for(let y=currentYear-5; y<=currentYear+5; y++){
      const option = document.createElement("option");
      option.value = y;
      option.textContent = y;
      if(y===year) option.selected = true;
      yearSelect.appendChild(option);
    }
  }

  prevBtn.addEventListener("click",()=>{month--;if(month<0){month=11;year--;}updateDisplay();loadProjectData();});
  nextBtn.addEventListener("click",()=>{month++;if(month>11){month=0;year++;}updateDisplay();loadProjectData();});
  calendarBtn?.addEventListener("click",()=>{calendarPopup.classList.toggle("hidden");populateYears();monthSelect.value=month;yearSelect.value=year;});
  goBtn?.addEventListener("click",()=>{month=parseInt(monthSelect.value);year=parseInt(yearSelect.value);updateDisplay();calendarPopup.classList.add("hidden");loadProjectData();});

  editBtn?.addEventListener("click", () => {
    window.location.href = `gestione_progetti.html?id=${projectId}`;
  });

  updateDisplay();
  loadProjectData();
});
