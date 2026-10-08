document.addEventListener("DOMContentLoaded", () => {

    const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  if (!projectId) {
    alert("ID progetto non specificato nella URL");
    return;
  }


// --------------------------
// PER VISUALIZZAZIONE (frontend) DD/MM/YYYY
// --------------------------
function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  // estrai direttamente anno, mese, giorno dalla stringa
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
// --------------------------
// PER INVIO AL BACKEND (YYYY-MM-DD)
// --------------------------
function toISODateString(dateStrOrObj) {
  if (!dateStrOrObj) return null;

  if (dateStrOrObj instanceof Date) {
    const y = dateStrOrObj.getFullYear();
    const m = String(dateStrOrObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateStrOrObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof dateStrOrObj === "string" && dateStrOrObj.includes("/")) {
    const [day, month, year] = dateStrOrObj.split("/");
    return `${year}-${month}-${day}`;
  }

  // se è già ISO, prendi solo YYYY-MM-DD
  return dateStrOrObj.slice(0, 10);
}


// Parsing locale solo per confronti interni
function parseDateLocal(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
  return new Date(year, month-0 -1, day);
}

function formatHours(value) {
  if (value === null || value === undefined || value === "") return "0:00";


  const num = parseFloat(String(value).replace(",", "."));
  if (isNaN(num)) return "0:00";

  const hours = Math.floor(num);
  const minutes = Math.round((num - hours) * 60);

  // formatta sempre con 2 cifre per minuti
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function setAnagraficaReadonly(isReadonly) {
  ["res-name", "res-surname", "res-cf"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.readOnly = isReadonly;
  });
}


  let project = {};
let anagrafica = [];
let ruoliDisponibili = [];
let pendingCustomRole = null;

  

async function fetchRuoli() {
  try {
    const res = await fetch('/api/projects/project_roles', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Errore caricamento ruoli");

    ruoliDisponibili = data.roles;
    console.log("Ruoli caricati:", ruoliDisponibili);
  } catch (err) {
    console.error("Errore fetch ruoli:", err);
    alert("Impossibile caricare i ruoli dal server.");
  }
}
(async () => {
  await fetchRuoli();
  await fetchProjectDetails(projectId);
})();

function getRoleLabel(resource) {
  if (resource.role_id) {
    const role = ruoliDisponibili.find(r => r.id === resource.role_id);
    return role ? role.name : "Ruolo sconosciuto";
  }
  return resource.role_name || "Nessun ruolo";
}



async function fetchProjectDetails(projectId) {
  try {
    const res = await fetch(`/api/projects/${projectId}`, {
  credentials: 'include'
});
    const data = await res.json();

    console.log("Dati API grezzi:", data);

    if (!data.success) {
      alert("Errore nel recupero del progetto: " + (data.message || "dati non disponibili"));
      return;
    }

    const proj = data.project;
    console.log("Project raw:", proj);

project = {
  id: proj.id,
  titolo: proj.name,
  acronimo: proj.acronym,
  codice: proj.project_code || "",
  cup: proj.cup_code || "",
  oreTotali: parseFloat(proj.total_hours) || 0,
  dataInizio: proj.start_date,
  dataFine: proj.end_date,
  stato: proj.status || "",

risorse: (proj.risorse || []).map(r => ({
  id: r.assignment_id,
   assignmentId: r.assignment_id,
  userId: r.user_id,
  nome: r.first_name,
  cognome: r.last_name,
  codiceFiscale: r.fiscal_code,

  role_id: r.role_id ?? null,
  role_name: r.role_name ?? null,

  orePreviste: parseFloat(r.assigned_hours) || 0,
  dataInizio: r.start_date,
  dataFine: r.end_date,

  wpAssignments: (r.wpAssignments || []).map(wp => {
    const wpInfo = (proj.workpackages || []).find(w => w.id === wp.workpackage_id) || {};
    return {
      id: wp.workpackage_id,
      codice: wpInfo.code || "",
      descrizione: wpInfo.description || "",
      ore: parseFloat(wp.assigned_hours) || 0,
      startDate: wp.start_date,
      endDate: wp.end_date
    };
  })
})),

  wp: (proj.workpackages || []).map(wp => ({
    id: wp.id,
    codice: wp.code,
    descrizione: wp.description,
    ore: parseFloat(wp.total_hours) || 0,
    start_date: wp.start_date,
    end_date: wp.end_date,
    periodo: `${formatDateForDisplay(wp.start_date)} - ${formatDateForDisplay(wp.end_date)}`
  }))
};

    console.log("Project mapped:", project);
   

    // Aggiorna l’anagrafica locale con le risorse del progetto
  anagrafica = project.risorse.map(r => ({
  id: r.id,
  nome: r.nome,
  cognome: r.cognome,
  codiceFiscale: r.codiceFiscale,
  role_id: r.role_id,
  role_name: r.role_name
}));

    // Render
    renderProjectInfo();
    renderResources();
    renderWP();

  } catch (err) {
    console.error("Errore fetch progetto:", err);
    alert("Errore di rete nel recupero dati progetto");
  }
}
 

  //SEZIONE DATI PROGETTO
  
  const projectInfo = document.getElementById("project-info");
  const editBtn = document.getElementById("edit-project-btn");
  const saveBtn = document.getElementById("save-project-btn");
  const cancelBtn = document.getElementById("cancel-project-btn");

  let editing = false;
  let originalData = {};

 function calcolaStatoProgetto() {
  const oggi = new Date();
  const start = new Date(toISODateString(project.dataInizio));
  const end = new Date(toISODateString(project.dataFine));

  if (oggi < start) return "aperto"; 
  if (oggi > end && project.stato !== "rendicontato") return "chiuso";
  return project.stato || "aperto";
}

function renderProjectInfo() {
  if (!projectInfo) return;

  const statoAttuale = calcolaStatoProgetto();

  projectInfo.innerHTML = `
    <div><strong>Titolo:</strong> ${project.titolo}</div>
    <div><strong>Acronimo:</strong> ${project.acronimo}</div>
    <div><strong>Codice:</strong> ${project.codice}</div>
    <div><strong>CUP:</strong> ${project.cup}</div>
    <div><strong>Totale Ore:</strong> ${project.oreTotali}</div>
    <div><strong>Periodo:</strong> ${formatDateForDisplay(project.dataInizio)} → ${formatDateForDisplay(project.dataFine)}</div>
    <div><strong>Stato:</strong> <span id="project-status">${statoAttuale}</span></div>
  `;

  project.stato = statoAttuale;
}

function switchToEditMode() {
  editing = true;
  originalData = { ...project };

  projectInfo.innerHTML = `
    <div><strong>Titolo:</strong> <input id="edit-title" value="${project.titolo}"></div>
    <div><strong>Acronimo:</strong> <input id="edit-acronym" value="${project.acronimo}"></div>
    <div><strong>Codice:</strong> <input id="edit-code" value="${project.codice}"></div>
    <div><strong>CUP:</strong> <input id="edit-cup" value="${project.cup}"></div>

    <div><strong>Totale Ore:</strong>
      <input type="number" id="edit-hours" value="${project.oreTotali}" min="0">
    </div>

    <div><strong>Periodo:</strong>
      <input type="date" id="edit-start" value="${project.dataInizio}">
      →
      <input type="date" id="edit-end" value="${project.dataFine}">
    </div>

    <div><strong>Stato:</strong>
      <select id="edit-status">
        <option value="aperto" ${project.stato === "aperto" ? "selected" : ""}>Aperto</option>
        <option value="chiuso" ${project.stato === "chiuso" ? "selected" : ""}>Chiuso</option>
        <option value="rendicontato" ${project.stato === "rendicontato" ? "selected" : ""}>Rendicontato</option>
      </select>
    </div>
  `;
  editBtn?.classList.add("hidden");
  saveBtn?.classList.remove("hidden");
  cancelBtn?.classList.remove("hidden");
}

  function switchToViewMode() {
    editing = false;
    renderProjectInfo();
    editBtn?.classList.remove("hidden");
    saveBtn?.classList.add("hidden");
    cancelBtn?.classList.add("hidden");
  }

  editBtn?.addEventListener("click", switchToEditMode);
saveBtn?.addEventListener("click", () => {
  project.titolo = document.getElementById("edit-title").value.trim();
  project.acronimo = document.getElementById("edit-acronym").value.trim();
  project.codice = document.getElementById("edit-code").value.trim();
  project.cup = document.getElementById("edit-cup").value.trim();
  project.oreTotali = parseFloat(document.getElementById("edit-hours").value) || 0;
project.dataInizio = document.getElementById("edit-start").value;
project.dataFine   = document.getElementById("edit-end").value;

  project.stato = document.getElementById("edit-status").value;

  switchToViewMode(); // aggiorna solo la vista
});
  cancelBtn?.addEventListener("click", () => {
    Object.assign(project, originalData);
    switchToViewMode();
  });


async function saveProjectInfoToBackend() {
  
  const payload = {
    name: project.titolo,
    acronym: project.acronimo,
    project_code: project.codice,
    cup_code: project.cup,
    total_hours: project.oreTotali,
    start_date: toISODateString(project.dataInizio), 
    end_date: toISODateString(project.dataFine),
    status: project.stato
  };

  try {
  const res = await fetch(`/api/projects/${project.id}-projects`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  credentials: "include"   
});

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Errore salvataggio progetto");
    }

   
    return data;
  } catch (err) {
    console.error("Errore salvataggio progetto:", err);
    alert("Errore salvataggio progetto: " + err.message);
  }
}

  //RISORSE
  const resTable = document.querySelector("#project-resources tbody");
  const addResBtn = document.getElementById("add-resource-btn");
  const modal = document.getElementById("add-resource-modal");
  const saveResBtn = document.getElementById("save-res-btn");
  const cancelResBtn = document.getElementById("cancel-res-btn");
  const anagraficaModal = document.getElementById("anagrafica-modal");
  const anagraficaTable = document.querySelector("#anagrafica-table tbody");
  const searchResource = document.getElementById("search-resource");
  const closeAnagraficaBtn = document.getElementById("close-anagrafica-btn");
  const newResourceBtn = document.getElementById("new-resource-btn");

  let editingResourceIndex = null;
  

function populateRoleSelect(selectedRoleId = null, customRoleName = null) {
  const roleSelect = document.getElementById("res-role");
  if (!roleSelect) return;

  roleSelect.innerHTML = "";


  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleziona un ruolo";
  placeholder.disabled = true;
  placeholder.selected = true;
  roleSelect.appendChild(placeholder);


  ruoliDisponibili.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    roleSelect.appendChild(opt);
  });

  
  const optAltro = document.createElement("option");
  optAltro.value = "altro";
  optAltro.textContent = "Altro...";
  roleSelect.appendChild(optAltro);

  
  if (selectedRoleId) {
    roleSelect.value = selectedRoleId;
    placeholder.selected = false;
  } 
  else if (customRoleName) {
    const optCustom = document.createElement("option");
    optCustom.value = "altro";
    optCustom.textContent = customRoleName;

    roleSelect.insertBefore(optCustom, optAltro);
    roleSelect.value = "altro";
    placeholder.selected = false;
  }
 
}


function renderResources() {
  if (!resTable) return;
  resTable.innerHTML = "";

  project.risorse.forEach((r, index) => {
    const assignedWP = (r.wpAssignments || [])
      .map(a => `${a.codice} (${a.ore}h)`)
      .join(", ") || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${r.cognome || ""}</td>
      <td>${r.codiceFiscale || "-"}</td>
      <td>${getRoleLabel(r)}</td>
      <td>${r.orePreviste}</td>
      <td>${formatDateForDisplay(r.dataInizio)} → ${formatDateForDisplay(r.dataFine)}</td>
      <td>${assignedWP}</td>
      <td class="action-buttons">
        <button class="btn-secondary btn-sm" data-index="${index}" data-action="assign">Assegna/Gestisci WP</button>
        <button class="btn-secondary btn-sm" data-index="${index}" data-action="edit">Modifica</button>
        <button class="btn-secondary btn-sm" data-index="${index}" data-action="remove">Rimuovi</button>
      </td>`;
    resTable.appendChild(tr);
  });
}


async function openEditResourceModal(index) {
  const res = project.risorse[index];
  if (!res) return;

  editingResourceIndex = index;
  setAnagraficaReadonly(true);

  document.getElementById("res-name").value = res.nome;
  document.getElementById("res-surname").value = res.cognome;
  document.getElementById("res-cf").value = res.codiceFiscale || "";

  await fetchRuoli();
  populateRoleSelect(res.role_id, res.role_name);

  document.getElementById("res-hours").value = res.orePreviste;
  document.getElementById("res-start").value = toISODateString(res.dataInizio);
  document.getElementById("res-end").value = toISODateString(res.dataFine);

  modal?.classList.remove("hidden");
}


// ---------- gestione cambio ruolo ----------
document.getElementById("res-role").addEventListener("change", e => {
  if (e.target.value !== "altro") {
    pendingCustomRole = null;
    return;
  }

  const nome = prompt("Inserisci il nuovo ruolo:");
  if (!nome || !nome.trim()) {
    e.target.value = "";
    return;
  }

  pendingCustomRole = nome.trim();

  // Inserisci ruolo temporaneo nella select
  const opt = document.createElement("option");
  opt.value = "custom";
  opt.textContent = pendingCustomRole;
  opt.selected = true;

  // prima di "Altro..."
  e.target.insertBefore(opt, e.target.lastElementChild);
});





  cancelResBtn?.addEventListener("click", () => modal?.classList.add("hidden"));
async function resolveRoleFromSelect() {
  const roleSelect = document.getElementById("res-role");
  const value = roleSelect.value;

  // ruolo esistente
  if (value !== "custom") {
    return {
      roleId: parseInt(value, 10),
      roleName: null
    };
  }

  // ruolo nuovo → salva a DB
  const res = await fetch("/api/projects/project-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: pendingCustomRole })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Errore creazione ruolo");
  }

  // aggiorna cache frontend
  ruoliDisponibili.push(data.role);
  pendingCustomRole = null;

  return {
    roleId: data.role.id,
    roleName: null
  };
}





function createOrUpdateResourceLocal({ name, surname, codiceFiscale, roleId, roleName, hours, start, end, saveToAnagrafica }) {
  const isEdit = editingResourceIndex !== null;

  const progettoStart = new Date(toISODateString(project.dataInizio));
  const progettoEnd = new Date(toISODateString(project.dataFine));

  const startISO = start ? toISODateString(start) : toISODateString(project.dataInizio);
  const endISO = end ? toISODateString(end) : toISODateString(project.dataFine);

  const resStart = new Date(startISO);
  const resEnd = new Date(endISO);

  // ---------- Validazioni principali ----------
  if (!name || !surname || (!roleId && !roleName) || !hours || !codiceFiscale) 
    throw new Error("Compila i campi Nome, Cognome, Ruolo, ed ore previste");

  if (hours <= 0) throw new Error("Le ore assegnate devono essere maggiori di 0");
  if (!/^[A-Z0-9]{16}$/.test(codiceFiscale)) throw new Error("Il codice fiscale deve contenere 16 caratteri alfanumerici.");
  if (resStart < progettoStart || resEnd > progettoEnd) throw new Error("Le date devono rientrare nel periodo del progetto.");
  if (resEnd < resStart) throw new Error("La data di fine non può essere precedente a quella di inizio.");

  // ---------- LOG per debug ----------
  console.log("editingResourceIndex:", editingResourceIndex);
  console.log("ore inserite:", hours);

  // ---------- Controllo ore totali progetto ----------
  // somma ore delle altre risorse ignorando quella in modifica
  const oreTotaliAltreRisorse = project.risorse.reduce((sum, r, i) => 
    i === editingResourceIndex ? sum : sum + (r.orePreviste || 0)
  , 0);

  console.log("Ore totali delle altre risorse:", oreTotaliAltreRisorse);
  console.log("Totale ore progetto se salvata:", oreTotaliAltreRisorse + hours);

  if (oreTotaliAltreRisorse + hours > project.oreTotali) {
    throw new Error(`Le ore totali assegnate alle risorse superano il budget del progetto (${project.oreTotali})`);
  }

  // ---------- Sovrapposizione periodi ----------
  function periodsOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
  }

  for (let i = 0; i < project.risorse.length; i++) {
    const r = project.risorse[i];

    // Controlla solo stessa persona
    if (r.codiceFiscale !== codiceFiscale) continue;

    // Ignora la risorsa in modifica
    if (isEdit && r.id === project.risorse[editingResourceIndex].id) continue;

    const existingStart = new Date(toISODateString(r.dataInizio || project.dataInizio));
    const existingEnd   = new Date(toISODateString(r.dataFine || project.dataFine));
    const existingRole  = getRoleLabel(r).toLowerCase();
    const newRole       = (roleName || "").toLowerCase();

    if (periodsOverlap(existingStart, existingEnd, resStart, resEnd)) {
      if (existingRole === newRole) {
        throw new Error(`La risorsa ${r.nome} ${r.cognome} con ruolo "${roleName}" ha già un periodo che si sovrappone.`);
      } else {
        throw new Error(`La risorsa ${r.nome} ${r.cognome} ha già un incarico che si sovrappone a questo periodo, anche se con ruolo diverso.`);
      }
    }
  }

  // ---------- Recupera o crea oggetto risorsa ----------
  const res = isEdit
    ? project.risorse[editingResourceIndex]
    : {
        id: Date.now(),
        assignmentId: null,
        userId: null,
        wpAssignments: [] // nuova risorsa parte senza WP
      };

  // ---------- Aggiorna campi ----------
  res.nome = name;
  res.cognome = surname;
  res.codiceFiscale = codiceFiscale;
  res.role_id = roleId || null;
  res.role_name = roleId ? null : roleName;
  res.orePreviste = hours;
  res.dataInizio = toISODateString(resStart);
  res.dataFine = toISODateString(resEnd);
  res.isUpdated = true;
  res.isNew = !isEdit;

  // ---------- Aggiorna userId se presente nell'anagrafica ----------
  const existsInAnagrafica = anagrafica.find(r => r.fiscal_code === codiceFiscale || r.codiceFiscale === codiceFiscale);
  res.userId = isEdit ? res.userId : (existsInAnagrafica ? existsInAnagrafica.id : null);

  // ---------- Aggiungi nuova risorsa se necessario ----------
  if (!isEdit) {
    project.risorse.push(res);

    if (saveToAnagrafica && !anagrafica.some(r => r.fiscal_code === codiceFiscale)) {
      anagrafica.push({
        id: anagrafica.length + 1,
        first_name: name,
        last_name: surname,
        fiscal_code: codiceFiscale,
        role_name: res.role_name
      });
    }
  }

  // ---------- Reset index e render ----------
  editingResourceIndex = null;
  renderResources();
}



saveResBtn?.addEventListener("click", async () => {
  try {

 
    const { roleId, roleName } = await resolveRoleFromSelect();

    createOrUpdateResourceLocal({
      name: document.getElementById("res-name").value.trim(),
      surname: document.getElementById("res-surname").value.trim(),
      codiceFiscale: document.getElementById("res-cf").value.trim().toUpperCase(),
      roleId,
      roleName,
      hours: parseInt(document.getElementById("res-hours").value.trim(), 10),
      start: document.getElementById("res-start").value.trim(),
      end: document.getElementById("res-end").value.trim(),
      saveToAnagrafica: document.getElementById("save-to-anagrafica").checked
    });

    modal?.classList.add("hidden");
    document.querySelector("#add-resource-modal h3").textContent = "Aggiungi Risorsa";
    document.querySelector(".checkbox-row")?.classList.remove("hidden");

  } catch (err) {
    alert(err.message);
  }
});



async function saveResourcesToBackend(project) {
 
  for (const r of project.risorse) {

    console.log("Risorse da salvare:");
project.risorse.forEach(r => {
  console.log(r.nome, r.role_id, r.role_name, r.orePreviste, r.assignmentId, r.isUpdated, r.isNew);
});
    const payload = {
      user_id: r.userId,
      role_id: r.role_id,
role_name: r.role_id ? null : r.role_name,
      assigned_hours: r.orePreviste,
      start_date: r.dataInizio,
      end_date: r.dataFine
    };

    try {
      if (r.isNew) {
        const res = await fetch(`/api/projects/${project.id}/resources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        });
        const data = await res.json();
        if (!data.success) throw new Error(`Errore salvataggio risorsa ${r.nome}`);
        r.assignmentId = data.assignmentId;
        r.isNew = false;
      } else if (r.isUpdated && r.assignmentId) {
        const res = await fetch(`/api/projects/${project.id}/resources/${r.assignmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        });
        const data = await res.json();
        if (!data.success) throw new Error(`Errore aggiornamento risorsa ${r.nome}`);
        r.isUpdated = false;
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }
}



 resTable?.addEventListener("click", (e) => {
  const index = e.target.dataset.index;
  if (!index) return;

  if (e.target.dataset.action === "remove") {
    const conferma = confirm("Sei sicuro di voler rimuovere questa risorsa dal progetto?");
    if (conferma) {
      project.risorse.splice(index, 1);
      renderResources();
      alert("Risorsa rimossa dal progetto.");
    } else {
      console.log("Rimozione annullata.");
    }
  } 
  else if (e.target.dataset.action === "edit") {
    openEditResourceModal(index);
  } 
  else if (e.target.dataset.action === "assign") {
    openAssignWPModal(index);
  }
});

  // LOGICA ANAGRAFICA


// Funzione per recuperare gli utenti dal backend
async function fetchAnagrafica() {
  try {
    const res = await fetch('/api/projects/anagrafica', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include' 
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Errore caricamento anagrafica");
    anagrafica = data.users || [];
    renderAnagrafica();
  } catch (err) {
    console.error("Errore fetch anagrafica:", err);
    alert("Impossibile caricare l'anagrafica dal server.");
  }
}

 function renderAnagrafica(filter = "") {
  if (!anagraficaTable) return;


  anagraficaTable.innerHTML = "";

  const lowerFilter = filter.toLowerCase();

  anagrafica
    .filter(r => 
      r.first_name.toLowerCase().includes(lowerFilter) ||
      r.last_name.toLowerCase().includes(lowerFilter) ||
      r.fiscal_code.toLowerCase().includes(lowerFilter)
    )
    .forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.first_name}</td>
        <td>${r.last_name}</td>
        <td>${r.fiscal_code}</td>
        <td><button class="btn-primary btn-sm" data-id="${r.id}" data-action="select">Seleziona</button></td>`;
      anagraficaTable.appendChild(tr);
    });
}
  searchResource?.addEventListener("input", e => renderAnagrafica(e.target.value));
  closeAnagraficaBtn?.addEventListener("click", () => anagraficaModal?.classList.add("hidden"));
 addResBtn?.addEventListener("click", () => {
  anagraficaModal?.classList.remove("hidden");
  
  fetchAnagrafica(); // carica dati reali
});
anagraficaTable?.addEventListener("click", async e => {
  if (e.target.dataset.action === "select") {

    //  nuova assegnazione
    editingResourceIndex = null;

    const id = parseInt(e.target.dataset.id);
    const selected = anagrafica.find(r => r.id === id);
    if (!selected) return;

    //  Campi anagrafici
    document.getElementById("res-name").value = selected.first_name;
    document.getElementById("res-surname").value = selected.last_name;
    document.getElementById("res-cf").value = selected.fiscal_code || "";

    //  PULIZIA campi progetto
    document.getElementById("res-hours").value = "";
    document.getElementById("res-start").value = "";
    document.getElementById("res-end").value = "";

    //  Blocca solo anagrafica
    setAnagraficaReadonly(true);

   
    document.querySelector(".checkbox-row")?.classList.add("hidden");
    document.querySelector("#add-resource-modal h3").textContent = "Aggiungi Risorsa";

    //  Ruoli sempre inizializzati
    await fetchRuoli();
    populateRoleSelect();

    anagraficaModal?.classList.add("hidden");
    modal?.classList.remove("hidden");
  }
});
newResourceBtn?.addEventListener("click", () => {
  (async () => {  
    editingResourceIndex = null;
    anagraficaModal?.classList.add("hidden");

    ["res-name","res-surname","res-hours","res-start","res-end","res-cf"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    setAnagraficaReadonly(false);

   await fetchRuoli();
  populateRoleSelect();

    document.querySelector(".checkbox-row")?.classList.remove("hidden");
    document.querySelector("#add-resource-modal h3").textContent = "Aggiungi Risorsa";
    modal?.classList.remove("hidden");
  })();
});

// ==========================
// WORK PACKAGES - FRONTEND
// ==========================
const wpTable = document.querySelector("#wp-table tbody");
const wpModal = document.getElementById("wp-modal");
const saveWPBtn = document.getElementById("save-wp-btn");
const cancelWPBtn = document.getElementById("cancel-wp-btn");
const addWPBtn = document.getElementById("add-wp-btn");

let editingWPIndex = null;

// --------------------------
// HELPERS DATE
// --------------------------
function parseDateLocal(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// --------------------------
// RENDER WP TABLE
// --------------------------
function renderWP() {
  if (!wpTable) return;
  wpTable.innerHTML = "";

  project.wp.forEach((wp, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wp.codice}</td>
      <td>${wp.descrizione}</td>
      <td>${wp.ore}</td>
     <td>${formatDateForDisplay(wp.start_date)} - ${formatDateForDisplay(wp.end_date)}</td>
      <td>
        <button class="btn-secondary btn-sm" data-index="${index}" data-action="edit-wp">Modifica</button>
        <button class="btn-secondary btn-sm" data-index="${index}" data-action="remove-wp">Rimuovi</button>
      </td>`;
    wpTable.appendChild(tr);
  });
}

// --------------------------
// OPEN MODAL
// --------------------------
addWPBtn?.addEventListener("click", () => {
  editingWPIndex = null;
  ["wp-code-input","wp-desc-input","wp-hours-input","wp-start-input","wp-end-input"].forEach(id => 
    document.getElementById(id).value = ""
  );
  document.getElementById("wp-modal-title").textContent = "Aggiungi Work Package";
  wpModal?.classList.remove("hidden");
});



function openEditWPModal(index) {
  const wp = project.wp[index];
  if (!wp) return;
  editingWPIndex = index;

  document.getElementById("wp-code-input").value = wp.codice;
  document.getElementById("wp-desc-input").value = wp.descrizione;
  document.getElementById("wp-hours-input").value = wp.ore;
 document.getElementById("wp-start-input").value = wp.start_date || "";
document.getElementById("wp-end-input").value = wp.end_date || "";

  document.getElementById("wp-modal-title").textContent = "Modifica Work Package";
  wpModal?.classList.remove("hidden");
}

// --------------------------
// TABLE BUTTONS
// --------------------------
wpTable?.addEventListener("click", e => {
  const index = e.target.dataset.index;
  if (!index) return;

  if (e.target.dataset.action === "edit-wp") {
    openEditWPModal(index);
  } 
  else if (e.target.dataset.action === "remove-wp") {
    if (confirm("Sei sicuro di voler eliminare questo WP?")) {
      project.wp.splice(index, 1);
      renderWP();
      renderResources();
      alert("WP eliminato correttamente.");
    }
  }
});

// --------------------------
// SAVE WP LOCAL
// --------------------------
saveWPBtn?.addEventListener("click", () => {
  const codice = document.getElementById("wp-code-input").value.trim();
  const desc = document.getElementById("wp-desc-input").value.trim();
  const oreInput = document.getElementById("wp-hours-input").value.trim();
  const start = document.getElementById("wp-start-input").value.trim();
  const end = document.getElementById("wp-end-input").value.trim();

  const newOre = parseFloat(oreInput);
  if (!codice || !desc || isNaN(newOre) || newOre <= 0) {
    alert("Compila codice, descrizione e ore (>0).");
    return;
  }

  // Controllo date
  const wpStartDate = parseDateLocal(start || project.dataInizio);
  const wpEndDate   = parseDateLocal(end || project.dataFine);
  const projStart   = parseDateLocal(project.dataInizio);
  const projEnd     = parseDateLocal(project.dataFine);

  if (wpEndDate < wpStartDate || wpStartDate < projStart || wpEndDate > projEnd) {
    alert(`Le date del WP devono rientrare nel periodo del progetto (${formatDateForDisplay(project.dataInizio)} - ${formatDateForDisplay(project.dataFine)}).`);
    return;
  }

  //  Calcolo corretto: array separato senza WP in modifica
  const wpAltri = project.wp.filter(wp => editingWPIndex === null || wp.id !== project.wp[editingWPIndex].id);

  const oreTotaliAltriWP = wpAltri.reduce((sum, wp) => sum + Number(wp.ore || 0), 0);

  if (oreTotaliAltriWP + newOre > project.oreTotali) {
    alert(`Le ore totali dei WP (${oreTotaliAltriWP + newOre}) superano il budget del progetto (${project.oreTotali}).`);
    return;
  }

  // Sovrascrive completamente le ore e i dati del WP
const wpData = {
  id: editingWPIndex !== null ? project.wp[editingWPIndex].id : null, //  null per WP nuovo
  codice,
  descrizione: desc,
  ore: newOre,
  start_date: toISODateString(wpStartDate),
  end_date: toISODateString(wpEndDate)
};

  if (editingWPIndex !== null) {
    project.wp[editingWPIndex] = wpData;
    editingWPIndex = null;
  } else {
    project.wp.push(wpData);
  }

  renderWP();
  wpModal?.classList.add("hidden");
});


// --------------------------
// CANCEL WP MODAL
// --------------------------
cancelWPBtn?.addEventListener("click", () => {
  wpModal?.classList.add("hidden");
  editingWPIndex = null;
});

  // funzione per aggiugere e modifcare i wp di un progetto
async function saveWPToBackend(wp) {
  const payload = {
    code: wp.codice,
    description: wp.descrizione,
    total_hours: wp.ore,
    start_date: wp.start_date,
    end_date: wp.end_date
  };

  if (wp.id) {
    console.log("WP esistente → PUT", payload);
    const res = await fetch(`/api/projects/${projectId}/workpackages/${wp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Risposta PUT:", data);
    if (!data.success) throw new Error(`Errore aggiornamento WP ${wp.codice}`);
    return data;
  } else {
    console.log("WP nuovo → POST", payload);
    const res = await fetch(`/api/projects/${projectId}/workpackages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Risposta POST:", data);
    if (data.success && data.workpackageId) wp.id = data.workpackageId; 
    else throw new Error(`Errore creazione WP ${wp.codice}`);
    return data;
  }
}


  //ASSEGNAZIONE WP ALLA RISORSA
  const assignWPModal = document.getElementById("assign-wp-modal");
  const assignWPTable = document.querySelector("#assign-wp-table tbody");
  const saveAssignWPBtn = document.getElementById("save-assign-wp-btn");
  const closeAssignWPBtn = document.getElementById("close-assign-wp-btn");

  let currentResourceIndex = null;

function openAssignWPModal(index) {
  currentResourceIndex = index;
  const res = project.risorse[index];
  if (!res) return;

  document.getElementById("assign-wp-resource-name").textContent =
    `${res.nome} ${res.cognome} (${getRoleLabel(res)})`;

  assignWPTable.innerHTML = "";

  project.wp.forEach(wp => {
    const existing = res.wpAssignments?.find(a =>
  (a.id && a.id === wp.id) ||
  (!wp.id && a.codice === wp.codice)
);

    const ore = existing ? existing.ore : "";
    const checked = existing ? "checked" : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wp.codice}</td>
      <td>${wp.descrizione}</td>
      <td>
        <input
          type="number"
          class="input-field wp-ore"
          data-wp-id="${wp.id}"
          value="${ore}"
          min="1"
        >
      </td>
      <td>
        <input
          type="checkbox"
          class="wp-check"
          data-wp-id="${wp.id}"
          ${checked}
        >
      </td>
    `;

    assignWPTable.appendChild(tr);
  });

  assignWPModal.classList.remove("hidden");
}
    

  closeAssignWPBtn?.addEventListener("click", () => assignWPModal.classList.add("hidden"));

saveAssignWPBtn?.addEventListener("click", () => {
  const res = project.risorse[currentResourceIndex];
  if (!res) return;

  const newAssignments = [];
  let invalid = false;

  const allRows = document.querySelectorAll("#assign-wp-table tbody tr");

  allRows.forEach(row => {
    const chk = row.querySelector(".wp-check");
    const oreInput = row.querySelector(".wp-ore");

    if (!chk || !oreInput) return;

    const wpId = Number(chk.dataset.wpId);
    const wp = project.wp.find(w => w.id === wpId);
    const ore = parseInt(oreInput.value || 0, 10);

    //  ore negative
    if (ore < 0) {
      alert(`Ore negative non consentite per WP ${wp.codice}`);
      invalid = true;
      return;
    }

    //  checkbox selezionata ma ore non valide
    if (chk.checked && (isNaN(ore) || ore <= 0)) {
      alert(`Inserisci ore valide (>0) per WP ${wp.codice}`);
      invalid = true;
      return;
    }

    //  ore senza checkbox
    if (!chk.checked && ore > 0) {
      alert(`Se inserisci ore per ${wp.codice}, devi selezionare il WP`);
      invalid = true;
      return;
    }

    //  assegnazione valida
    if (chk.checked) {
      newAssignments.push({
        id: wp.id || null, 
        codice: wp.codice,
        ore
      });
    }
  });

  if (invalid) return;

  // ===============================
//  CONTROLLO ORE WP vs ORE RISORSA
// ===============================
const oreTotaliWPPerRisorsa = newAssignments.reduce(
  (sum, a) => sum + Number(a.ore || 0),
  0
);

console.log("Ore assegnate alla risorsa (progetto):", res.orePreviste);
console.log("Ore totali WP per risorsa:", oreTotaliWPPerRisorsa);

if (oreTotaliWPPerRisorsa > res.orePreviste) {
  alert(
    `Le ore totali assegnate ai WP (${oreTotaliWPPerRisorsa}) ` +
    `superano le ore assegnate alla risorsa nel progetto (${res.orePreviste}).`
  );
  return;
}

  newAssignments.forEach(a => {
  const wp = project.wp.find(w => w.id === a.id || w.codice === a.codice);
  if (!wp) return;

  let somma = a.ore;

  project.risorse.forEach(r => {
    if (r === res) return;
    r.wpAssignments?.forEach(x => {
      if (
        (x.id && x.id === wp.id) ||
        (!wp.id && x.codice === wp.codice)
      ) {
        somma += x.ore;
      }
    });
  });

  if (somma > wp.ore) {
    alert(
      `Le ore assegnate al WP ${wp.codice} (${somma}) ` +
      `superano le ore disponibili (${wp.ore})`
    );
    invalid = true;
  }
});

  res.wpAssignments = newAssignments;

  if (invalid) return;


  assignWPModal.classList.add("hidden");
  renderResources();
  renderWP();
});



async function saveWPAssignments(projectId, resource) {
  const payload = {
    wpAssignments: resource.wpAssignments || []
  };

const res = await fetch(
  `/api/projects/${projectId}/resources/${resource.userId}/wp`,
  {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"   
  }
);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Errore salvataggio WP risorsa");
  }
}

// Copia per permettere annullamento modifiche
let originalProject = JSON.parse(JSON.stringify(project));

// Salva tutte le modifiche del progetto
document.getElementById("save-all-btn")?.addEventListener("click", async () => {
  if (!confirm("Vuoi salvare tutte le modifiche apportate al progetto?")) return;

  try {
    // 1 Salva dati progetto
    await saveProjectInfoToBackend();

    //  Salva / aggiorna WorkPackages
    for (const wp of project.wp) {
      const result = await saveWPToBackend(wp);
        console.log("Salvato WP:", wp.codice, result);
      if (!result.success) {
        throw new Error(`Errore salvataggio WP: ${wp.codice}`);
      }
    }

    //  Salva risorse (assegnazione progetto)
    await saveResourcesToBackend(project);

    //  Salva assegnazioni WP → risorsa
    for (const res of project.risorse) {
    
      const assignmentsPayload = res.wpAssignments && res.wpAssignments.length > 0
        ? res.wpAssignments
        : [];

      await saveWPAssignments(project.id, {
        ...res,
        wpAssignments: assignmentsPayload
      });
    }

    // Aggiorna copia originale
    originalProject = JSON.parse(JSON.stringify(project));
    alert("Modifiche salvate con successo!");

    renderResources();
    renderWP();

  } catch (err) {
    console.error(err);
    alert("Errore nel salvataggio. Le modifiche NON sono state applicate.");

    // Ripristina stato precedente
    project = JSON.parse(JSON.stringify(originalProject));
    renderProjectInfo();
    renderResources();
    renderWP();
  }
});


// Annulla tutte le modifiche non salvate
document.getElementById("cancel-all-btn")?.addEventListener("click", () => {
  if (!confirm("Vuoi annullare tutte le modifiche non ancora salvate?")) return;

  project = JSON.parse(JSON.stringify(originalProject)); // ripristina versione originale
  renderResources();
  renderWP();
  alert(" Modifiche annullate.");
});

  //INIZIALIZZAZIONE
  //renderProjectInfo();
  //renderResources();
  //renderWP();

});