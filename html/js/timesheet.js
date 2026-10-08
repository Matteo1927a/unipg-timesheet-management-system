document.addEventListener("DOMContentLoaded", () => {
  //ELEMENTI DOM

  const currentPeriod = document.getElementById("current-period");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const calendarBtn = document.getElementById("calendar-btn");
  const calendarPopup = document.getElementById("calendar-popup");
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  const goBtn = document.getElementById("go-btn");

  const fixedBody = document.getElementById("fixed-body");
  const daysHeader = document.getElementById("days-header");
  const daysBody = document.getElementById("days-body");

  //VARIABILI GLOBALI
  let today = new Date();
  let month = today.getMonth();
  let year = today.getFullYear();
  let userDataReal = {};
  let dailyNotes = {};
  let alertsSent = {};
  let PROJECT_STATUSES = {};
  let PROJECT_NOTES={};
  let CURRENT_TIMESHEET_ID = null;
  let CURRENT_TIMESHEET_STATUS = null;

 

  const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  //HELPERS
  function updateDisplay() { currentPeriod.textContent = `${months[month]} ${year}`; }
  function daysInMonth(m, y) { return new Date(y, m + 1, 0).getDate(); }
  function isWeekend(date) { return date.getDay() === 0 || date.getDay() === 6; }

  function timeToMinutes(str) {
    if (!str) return 0;
    const m = str.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  function formatHours(value) {
    if (value == null || value === '') return '';   
    if (typeof value === 'string') value = parseFloat(value);
    if (isNaN(value)) return '';
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`; 
  }
function getCellLockInfo({ type, projectId }) {
  // Blocchi per project / WP
  if ((type === 'wp' || type === 'project') && projectId) {
    const status = PROJECT_STATUSES[projectId];
    if (['inviato', 'approvato', 'rendicontato'].includes(status)) {
      return {
        locked: true,
        reason: 'project',
        status,
        message: `Questo progetto è ${status}: non puoi modificare le ore.`
      };
    }
  }

  //  Blocchi per attività ordinarie se il timesheet globale è approvato o rendicontato
  if (['teaching', 'diary', 'institutional'].includes(type)) {
    if (['approvato', 'rendicontato'].includes(CURRENT_TIMESHEET_STATUS)) {
      return {
        locked: true,
        reason: 'ordinary',
        status: CURRENT_TIMESHEET_STATUS,
        message: `Il timesheet è ${CURRENT_TIMESHEET_STATUS}: non puoi modificare questa attività.`
      };
    }
  }

  return { locked: false };
}

  function renderTimesheetStatus(status) {
  const statusDiv = document.querySelector('.timesheet-status');
  if (!statusDiv) return;

  
  statusDiv.innerHTML = `<strong>Stato timesheet:</strong> ${capitalize(status)}`;
}

// Popola gli stati dei progetti
function mapProjectStatuses(projects) {
  PROJECT_STATUSES = {};
  projects.forEach(proj => {
    PROJECT_STATUSES[proj.project_id] = proj.status; 
  });
  console.log("PROJECT_STATUSES:", PROJECT_STATUSES);
}

// Popola le note di riapertura
function mapProjectNotes(projects) {
  PROJECT_NOTES = {};
  projects.forEach(proj => {
    PROJECT_NOTES[proj.project_id] = proj.reopening_note || null; // null se non c'è nota
  });
  console.log("PROJECT_NOTES:", PROJECT_NOTES);
}

function showReopenNoteTooltip(iconEl, noteText) {
  let tooltip = document.getElementById('global-reopen-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'global-reopen-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.background = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '6px 10px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '0.85em';
    tooltip.style.whiteSpace = 'pre-wrap';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    tooltip.style.zIndex = 99999;
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transition = 'opacity 0.2s';
    tooltip.style.opacity = 0;
    document.body.appendChild(tooltip);
  }

  tooltip.textContent = noteText;

  const rect = iconEl.getBoundingClientRect();
  tooltip.style.top = `${rect.top + window.scrollY}px`;
  tooltip.style.left = `${rect.right + 8 + window.scrollX}px`;
  tooltip.style.opacity = 1;

  iconEl.addEventListener('mouseleave', () => {
    tooltip.style.opacity = 0;
  }, { once: true });
}

function hideReopenNoteTooltip() {
  const tooltip = document.getElementById('global-reopen-tooltip');
  if (tooltip) tooltip.style.opacity = 0;
}

// Utility per rendere la prima lettera maiuscola
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

  // Recupera o crea il timesheet per un determinato mese/anno
async function getOrCreateTimesheet(month, year) {
  try {
    const res = await fetch(`/api/timesheet/${year}/${month}`, {
      credentials: 'include'
    });

    if (!res.ok) throw new Error("Errore nel recupero del timesheet");

    const data = await res.json();
    console.log("Timesheet pronto:", data);

    // aggiorna lo stato globale
    CURRENT_TIMESHEET_STATUS = data.status; 

    renderTimesheetStatus(data.status);

    return data;
  } catch (err) {
    console.error("Errore getOrCreateTimesheet:", err);
    return null;
  }
}

  // ----------------------------
  // FUNZIONE PER CARICARE LE ATTIVITÀ DAL BACKEND
  // ----------------------------
  async function loadActivities(month, year) {
    try {
      const res = await fetch(`/api/timesheet/${year}/${month}/activities`, {
        credentials: "include" 
      });

          if (!res.ok) {
      const text = await res.text();
      console.error("Errore server activities:", text);
      throw new Error(`Errore caricamento attività: ${res.status}`);
    }

      const data = await res.json();
      console.log("Activities:", data.activities);

      return data.activities; 
    } catch (err) {
      console.error("Errore loadActivities:", err);
      return [];
    }
  }

  async function loadEntries(timesheetId) {
    try {
      const res = await fetch(`/api/timesheet/${timesheetId}/entries`, {
        credentials: 'include'
      });
         if (!res.ok) {
      const text = await res.text(); 
      console.error(`Errore server entries per timesheet ${timesheetId}:`, text);
      throw new Error(`Errore caricamento entries: ${res.status}`);
    }
      const data = await res.json();
      console.log("Entries:", data.entries);
      return data.entries;
    } catch (err) {
      console.error("Errore loadEntries:", err);
      return [];
    }
  }

  function isValidTime(str) {
    // Formato hh:mm  
    return /^([01]?\d|2[0-3]):[0-5]\d$/.test(str);
  }


  //CREAZIONE INPUT ORARIO
  function createHourInput() {
    const input = document.createElement('input');
    input.type = "text";
    input.classList.add("time-input");
    input.maxLength = 5;
    input.autocomplete = "off";

    // INPUT: permetti solo numeri e :
    input.addEventListener("input", () => {

      const before = input.value;
      input.value = before.replace(/[^0-9:]/g, "");

      
      const parts = input.value.split(":");
      if (parts.length > 2) {
        input.value = parts.slice(0, 2).join(":");
      }

     
      if (input.value === "") {
        input.dataset.ore = "";
        updateTotals();
        return;
      }

      //  aggiorna totali solo se formato valido
      if (isValidTime(input.value)) {
        input.dataset.ore = input.value;
        updateTotals();
      }
    });

   
    input.addEventListener("blur", () => {
      const val = input.value.trim();

    
      if (val === "") {
        input.dataset.ore = "";
        updateTotals();
        return;
      }

    
      if (!isValidTime(val)) {
        alert("Formato orario non valido. Usa hh:mm (es. 08:30)");
        input.value = input.dataset.original || "";
        updateTotals();
        return;
      }

      
      input.dataset.original = val;
      input.dataset.ore = val;
      updateTotals();
    });

    return input;
  }

  //FUNZIONI PER NOTE E ALERT
  function addNoteIcon(day, noteText) {
    /*const cell = document.getElementById(`total-day-${day}`);
    if (!cell) return;
    let icon = cell.querySelector('.note-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.classList.add('material-icons', 'note-icon');
      icon.textContent = 'sticky_note_2';
      cell.appendChild(icon);
    }

    icon.onmouseenter = () => showNoteBox(icon, noteText);
    icon.onmouseleave = () => {
      const box = document.getElementById('note-box-global');
      if (box) box.remove();
    };*/
    return;
  }

  function removeNoteIcon(day) {
    /*const cell = document.getElementById(`total-day-${day}`);
    if (!cell) return;
    const icon = cell.querySelector('.note-icon');
    if (icon) icon.remove();*/
    return;
  }

  /*function showNoteBox(icon, noteText) {
    let existing = document.getElementById('note-box-global');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'note-box-global';
    box.classList.add('note-box');
    box.innerHTML = `<b>Contenuto nota:</b> <i>${noteText}</i>`;
    document.body.appendChild(box);

    const rect = icon.getBoundingClientRect();
    box.style.top = rect.bottom + window.scrollY + 6 + 'px';
    box.style.left = rect.left + window.scrollX + rect.width / 2 + 'px';
    box.style.transform = 'translateX(-50%)';

    icon.onmouseleave = () => box.remove();
  }*/

  function createDailyAlert(day) {
    /*if (alertsSent[day] || document.getElementById(`alert-day-${day}`)) return;

    const alertDiv = document.createElement('div');
    alertDiv.classList.add('daily-alert');
    alertDiv.id = `alert-day-${day}`;
    alertDiv.innerHTML = `
      <div class="alert-title">Superamento 8 ore per il giorno ${day}</div>
      <textarea placeholder="Inserisci nota di giustificazione...">${dailyNotes[day] || ''}</textarea>
      <div class="alert-buttons">
        <button class="cancel-note">Annulla</button>
        <button class="send-note">Invia</button>
      </div>
    `;

    document.body.appendChild(alertDiv);

    const textarea = alertDiv.querySelector('textarea');
    const cancelBtn = alertDiv.querySelector('.cancel-note');
    const sendBtn = alertDiv.querySelector('.send-note');

    const totalCell = document.getElementById(`total-day-${day}`);
    if (totalCell) {
      const [h, m] = totalCell.textContent.split(':').map(Number);
      cancelBtn.disabled = !(h < 8 || (h === 8 && m === 0));
    }

    cancelBtn.addEventListener('click', () => {
      const tc = document.getElementById(`total-day-${day}`);
      if (!tc) return;
      const [h, m] = tc.textContent.split(':').map(Number);
      if (h < 8 || (h === 8 && m === 0)) {
        delete dailyNotes[day];
        alertsSent[day] = false;
        removeNoteIcon(day);
        alertDiv.remove();
      } else {
        alert('Non puoi annullare la nota finché le ore giornaliere superano le 8 ore!');
      }
    });

    sendBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text === '') { alert('Inserisci una nota prima di inviare!'); return; }
      dailyNotes[day] = text;
      alertsSent[day] = true;
      addNoteIcon(day, text);
      alertDiv.remove();
    });*/
    return;
  }
    

  //POPUP LEZIONE
  const lezionePopup = document.createElement('div');
  lezionePopup.classList.add('lezione-popup-overlay');
  lezionePopup.innerHTML = `
  <div class="lezione-popup">
    <div class="lezione-popup-header">
      <span id="lezione-popup-titolo"></span>
    </div>
    <div class="lezione-popup-body">
      <label><b>Data:</b></label>
      <div id="lezione-popup-data" class="lezione-popup-data"></div>

      <label>Ora inizio:</label>
      <input type="time" id="lezione-ora-inizio">

      <label>Ora fine:</label>
      <input type="time" id="lezione-ora-fine">

       <label>Ore accademiche <span style="color:red">*</span>:</label>
      <input type="number" id="lezione-ore-accademiche" min="1" step="1" placeholder="es. 2" required>

     <label>Tipo di attività:</label>
<select id="lezione-tipo-attivita">
  <option value="lezione">Lezione</option>
  <option value="Lezione pratica">Lezione pratica</option>
  <option value="Integrativa curriculare">Integrativa curriculare</option>
  <option value="Attività didattica a distanza*">Attività didattica a distanza</option>
  <option value="Lezione tecnico-pratica">Lezione tecnico-pratica</option>
  <option value="Equivalente alla ufficiale">Equivalente alla ufficiale</option>
</select>

      <label>Titolo:</label>
      <input type="text" id="lezione-titolo" list="titolo-lezione" placeholder:"Seleziona o scrivi...">
        <datalist id="titolo-lezione">
        <option value="intro corso"></option>
         <option value="basi di reti e sicurezza"></option>
         </datalist>

      <label>Descrizione:</label>
      <textarea id="lezione-argomento" placeholder="Descrivi l'argomento..."></textarea>

      <a> Campi obbligatori <span style="color:red">*</span> </a>

      <div class="lezione-buttons">
        <button class="lezione-annulla" id="lezione-annulla">Annulla</button>
        <button class="lezione-salva" id="lezione-salva">Salva</button>
        <button class="lezione-cancella" id="lezione-cancella" style="background:red;color:white;">Cancella lezione</button>
      </div>
    </div>
  </div>
`;
  document.body.appendChild(lezionePopup);

  let cellaLezioneCorrente = null;

  //APERTURA E CHIUSURA
  function apriLezionePopup(nome, data) {

    
    document.getElementById('lezione-popup-titolo').textContent = nome;
    document.getElementById('lezione-popup-data').textContent = data;

    // reset campi
    document.getElementById('lezione-ore-accademiche').value = '';
    document.getElementById('lezione-ora-inizio').value = '';
    document.getElementById('lezione-ora-fine').value = '';
    document.getElementById('lezione-tipo-attivita').value = 'Lezione';
    document.getElementById('lezione-argomento').value = '';

    lezionePopup.style.display = 'flex';
  }

  function chiudiLezionePopup() {
    lezionePopup.style.display = 'none';
  }

  document.getElementById('lezione-annulla').addEventListener('click', chiudiLezionePopup);
  lezionePopup.addEventListener('click', e => {
    if (e.target === lezionePopup) chiudiLezionePopup();
  });

  
document.getElementById('lezione-cancella').addEventListener('click', () => {
  if (!cellaLezioneCorrente) return;

  // Svuota i dati della cella
  cellaLezioneCorrente.textContent = '';
  cellaLezioneCorrente.dataset.ore = '';
  cellaLezioneCorrente.dataset.oreAccademiche = '';
  cellaLezioneCorrente.dataset.tipo = '';
  cellaLezioneCorrente.dataset.titolo = '';
  cellaLezioneCorrente.dataset.descrizione = '';
  cellaLezioneCorrente.dataset.oraInizio = '';
  cellaLezioneCorrente.dataset.oraFine = '';
  
  // Flag temporaneo per indicare cancellazione
  cellaLezioneCorrente.dataset.pendingDelete = 'true';
  delete cellaLezioneCorrente.dataset.delete; 

  updateTotals();
  chiudiLezionePopup();
});

// Quando l'utente modifica ore o altri campi
document.getElementById('lezione-salva').addEventListener('click', () => {
  const oreAccademiche = document.getElementById('lezione-ore-accademiche').value.trim();
  const oreNum = parseInt(oreAccademiche, 10);

  if (!oreAccademiche || isNaN(oreNum) || oreNum <= 0) {
    alert('Inserisci un numero di ore valido.');
    return;
  }

  // Se l'utente reinserisce ore dopo aver cliccato "Cancella"
  if (cellaLezioneCorrente.dataset.pendingDelete) {
    delete cellaLezioneCorrente.dataset.pendingDelete; // annulla delete temporaneo
  }

  // Salvataggio dati nella cella
  cellaLezioneCorrente.textContent = `${oreNum}:00`;
  cellaLezioneCorrente.dataset.ore = `${oreNum}:00`;
  cellaLezioneCorrente.dataset.oreAccademiche = oreNum;
  cellaLezioneCorrente.dataset.tipo = document.getElementById('lezione-tipo-attivita').value;
  cellaLezioneCorrente.dataset.titolo = document.getElementById('lezione-titolo').value.trim();
  cellaLezioneCorrente.dataset.descrizione = document.getElementById('lezione-argomento').value.trim();
  cellaLezioneCorrente.dataset.oraInizio = document.getElementById('lezione-ora-inizio').value;
  cellaLezioneCorrente.dataset.oraFine = document.getElementById('lezione-ora-fine').value;

  updateTotals();
  chiudiLezionePopup();
});

 


// Trasforma activities dal backend in struttura simile a userData
function transformActivities(activities, entries) {
  const data = {};

  // Struttura iniziale dei due blocchi principali
  data["Attività ordinaria"] = { budget: 0, sub: {} };
  data["Progetti"] = { budget: 0, sub: {} };

  // ---------------------------
  // COSTRUZIONE STRUTTURA DA ACTIVITIES
  // ---------------------------
  activities.forEach(act => {
    const assigned = parseFloat(act.assigned_hours) || 0;

    // --- Attività ordinaria: Registri e Diario ---
    if (act.activity_type === "teaching" || act.activity_type === "diary") {
      const subKey = act.activity_type === "teaching" ? "Registri" : "Diario";

      if (!data["Attività ordinaria"].sub[subKey]) {
        data["Attività ordinaria"].sub[subKey] = {
          budget: 0,
          subActivities: {},
          wp: []
        };
      }

      data["Attività ordinaria"].sub[subKey].subActivities[act.activity_name] = {
        id: act.id,
        name: act.activity_name,
        budget: assigned, // solo la sotto-attività ha budget
        remaining_hours: act.remaining_hours ?? null,
        days: {},
        activity_type: act.activity_type,

        // info statiche (non popup)
        title: act.title,
        description: act.description,
        start_time: act.start_time,
        end_time: act.end_time
      };

      // SOLO REGISTRI accumula budget
      if (act.activity_type === "teaching") {
        data["Attività ordinaria"].sub["Registri"].budget += assigned;
      }

      return;
    }

    // --- Altre Attività Istituzionali ---
    if (act.activity_type === "institutional") {
      const subKey = "Altre Attività istituzionali";

      if (!data["Attività ordinaria"].sub[subKey]) {
        data["Attività ordinaria"].sub[subKey] = {
          budget: 0,            // come Diario, nessun budget totale
          subActivities: {},
          wp: []
        };
      }

      data["Attività ordinaria"].sub[subKey].subActivities[act.activity_name] = {
        id: act.id,
        name: act.activity_name,
        budget: 0,        
        remaining_hours: act.remaining_hours ?? null, 
        days: {},
        activity_type: act.activity_type
      };

      return;
    }

    // --- Progetti (project / workpackage) ---
    if (act.activity_type === "project" || act.activity_type === "workpackage") {
      const projectName = act.project_name || act.activity_name;

      if (!data["Progetti"].sub[projectName]) {
        data["Progetti"].sub[projectName] = {  project_id: act.project_id, id: act.id, budget: 0,  remaining_hours: act.remaining_hours ?? assigned, days: {}, wp: [] };
      }

      if (act.activity_type === "workpackage") {
        data["Progetti"].sub[projectName].wp.push({
          id: act.id,
          name: act.activity_name,
          code: act.workpackage_code,
          budget: assigned,
          remaining_hours: act.remaining_hours ?? null,
          days: {},
          project_id: act.project_id
        });
      } else {
        data["Progetti"].sub[projectName].id = act.id;
        data["Progetti"].sub[projectName].budget += assigned;
        data["Progetti"].budget += assigned;
      }

      return;
    }
  });


Object.entries(data["Progetti"].sub).forEach(([projectName, project]) => {
 
  
  if (!project.wp || project.wp.length === 0) {
    project.wp = [{
      id: project.id,
      name: projectName,  
      code: null,
      budget: project.budget,
      remaining_hours: project.remaining_hours ?? null,
      days: project.days || {},
        project_id: project.project_id,
      isProject: true
    }];
  }

  
  
});

  // ---------------------------
  // POPOLAMENTO DELLE ORE DA ENTRIES
  // ---------------------------
  entries.forEach(entry => {
    const day = entry.day;
    const hrs = entry.hours || entry.academic_hours || 0;

    // --- Attività ordinaria ---
    if (entry.type === "teaching" || entry.type === "diary") {
      const subKey = entry.type === "teaching" ? "Registri" : "Diario";

      const subBlock = data["Attività ordinaria"].sub[subKey];
      if (!subBlock) return;

      for (const actName in subBlock.subActivities) {
        const act = subBlock.subActivities[actName];

        if (act.id === entry.activity_id) {

          //  ORE 
          act.days[day] = hrs;

          // META SOLO PER REGISTRI
          if (entry.type === "teaching") {
            const tipoMap = {
              'Lezione': 'lezione',
              'Lezione pratica': 'Lezione pratica',
              'Integrativa curriculare': 'Integrativa curriculare',
              'Attività a distanza': 'Attività didattica a distanza*',
              'Lezione tecnico-pratica': 'Lezione tecnico-pratica',
              'Equivalente alla ufficiale': 'Equivalente alla ufficiale',
            };
            if (!act.meta) act.meta = {};
            act.meta[day] = {
              oreAccademiche: entry.academic_hours
                ? String(parseFloat(entry.academic_hours)).replace(/\.0+$/, "")
                : "",
              tipo: tipoMap[entry.activity_type] || "Lezione",
              titolo: entry.title || "",
              descrizione: entry.description || "",
              oraInizio: entry.start_time || "",
              oraFine: entry.end_time || "",
                
            }
          }

          return;
        }
      }

      return;
    }

    // --- Altre Attività Istituzionali ---
    if (entry.type === "institutional") {
      const subBlock = data["Attività ordinaria"].sub["Altre Attività istituzionali"];
      if (!subBlock) return;

      for (const actName in subBlock.subActivities) {
        const act = subBlock.subActivities[actName];
        if (act.id === entry.activity_id) {
          act.days[day] = entry.hours || 0; 
          return;
        }
      }
    }

    // --- Progetti ---
    if (entry.type === "project") {
      for (const proj in data["Progetti"].sub) {
        if (data["Progetti"].sub[proj].id === entry.activity_id) {
          data["Progetti"].sub[proj].days[day] = hrs;

          
          return;
        }
      }
    }

    if (entry.type === "workpackage") {
      for (const proj in data["Progetti"].sub) {
        const wpList = data["Progetti"].sub[proj].wp;
        if (!wpList) continue;

        const wp = wpList.find(w => w.id === entry.activity_id);
        if (wp) {
          wp.days[day] = hrs;
          return;
        }
      }
    }
  });

  // ---------------------------
  //  FORZA BUDGET "Attività ordinaria" = 0
  // ---------------------------
  data["Attività ordinaria"].budget = null;
  data["Attività ordinaria"].remaining_hours = null;

  return data;
}





  //FUNZIONI DI RENDER
  function createDayCells({ numDays, withInput = true, isRegistro = false, existingData = {},nomeInsegnamento = '' }) {
    const tds = [];

    for (let d = 1; d <= numDays; d++) {
      const td = document.createElement('td');
      td.dataset.day = d;
      

      if (isWeekend(new Date(year, month, d))) td.classList.add('holiday-cell');

      const rawVal = existingData[d] || '';
      const displayVal = rawVal ? formatHours(rawVal) : '';

          // --- BLOCCO CELLE REGISTRI SE TIMESHEET APPROVATO/RENDICONTATO ---
    const registroLocked = isRegistro && ['approvato', 'rendicontato'].includes(CURRENT_TIMESHEET_STATUS);

 if (registroLocked) {
  td.classList.add('locked');
  td.textContent = displayVal || '-';
  td.addEventListener('click', () => {
    alert('Il timesheet è già stato approvato o rendicontato: non puoi modificare ore.');
  });
  tds.push(td);
  continue; // esce subito, non impostare più cursor
}

      if (isRegistro) {
        td.classList.add('registro-cell');
        td.style.cursor = 'pointer';

        if (displayVal) td.dataset.ore = displayVal;
        td.textContent = displayVal; // vuoto se non c'è valore
         td.dataset.nomeInsegnamento = nomeInsegnamento; 

        // metadati
        if (existingData.meta?.[d]) {
          Object.entries(existingData.meta[d]).forEach(([k, v]) => td.dataset[k] = v);
        }
          if (existingData.meta?.[d]?.insegnamento) {
    td.dataset.insegnamento = existingData.meta[d].insegnamento;
  }

     td.addEventListener('click', () => {

  const row = td.closest('tr');

  //  NON aprire il popup sulle righe di aggregazione
  if (
    !row ||
    row.dataset.type !== 'registro' ||     // solo registri
    !row.dataset.childName                 // solo lezioni reali
  ) {
    return;
  }
  

  cellaLezioneCorrente = td;

  document.getElementById('lezione-ore-accademiche').value = td.dataset.oreAccademiche || '';
  document.getElementById('lezione-ora-inizio').value = td.dataset.oraInizio || '';
  document.getElementById('lezione-ora-fine').value = td.dataset.oraFine || '';
  document.getElementById('lezione-tipo-attivita').value = td.dataset.tipo || 'Lezione';
  document.getElementById('lezione-titolo').value = td.dataset.titolo || '';
  document.getElementById('lezione-argomento').value = td.dataset.argomento || '';

  const dayDate = new Date(year, month, d);
  const formattedDate = dayDate.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

     const nome = td.dataset.nomeInsegnamento || 'Lezione';
        document.getElementById('lezione-popup-titolo').textContent = nome;
  document.getElementById('lezione-popup-data').textContent = formattedDate;

  lezionePopup.style.display = 'flex';
});

        tds.push(td);
        continue;
      }

      if (!withInput) {
        if (displayVal) td.dataset.ore = displayVal;
        td.textContent = displayVal;
        tds.push(td);
        continue;
      }

      // celle con input
      const input = createHourInput();
      input.value = displayVal;
      if (displayVal) td.dataset.ore = displayVal;
      input.dataset.original = displayVal;
      td.appendChild(input);

      tds.push(td);
    }

    return tds;


  }


  async function renderTimesheetReal() {
   const timesheetData = await getOrCreateTimesheet(month + 1, year);
 
if (!timesheetData) return alert("Impossibile creare o recuperare il timesheet");
    mapProjectStatuses(timesheetData.projects);
    mapProjectNotes(timesheetData.projects);

    const activities = await loadActivities(month + 1, year);
    const entries = await loadEntries(timesheetData.timesheetId);
    const numDays = daysInMonth(month, year);

    fixedBody.innerHTML = '';
    daysHeader.innerHTML = '';
    daysBody.innerHTML = '';

    // --- Header giorni ---
    const headerRow = document.createElement('tr');
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    for (let d = 1; d <= numDays; d++) {
      const th = document.createElement('th');
      const date = new Date(year, month, d);
      th.innerHTML = `<div class="weekday">${weekdays[date.getDay()]}</div><div class="day-number">${d}</div>`;
      headerRow.appendChild(th);
    }
    ['Previsione ore', 'Tot. ore mensili', 'Budget ore', 'Ore residue'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      th.classList.add('total-header');
      headerRow.appendChild(th);
    });
    daysHeader.appendChild(headerRow);

    // --- Trasforma le attività e associa le entries ---
    userDataReal = transformActivities(activities, entries);
  

    // --- Render attività principali e sub/WP chiusi ---
    Object.keys(userDataReal).forEach(activity => {
      const activityData = userDataReal[activity];

      // Righe principali
      renderActivity(activity, activityData, numDays);

      // Sub attività e WP già nascosti
      if (activityData.sub) {
        Object.keys(activityData.sub).forEach(subName => {
          const subData = activityData.sub[subName];
          // Renderizza la sub riga (Registri, Diario, Progetti)
          renderSubActivity(null, activity, subName, subData, { collapsed: true });

          // Se ci sono WP figli o subActivities, crea subito ma nascosti
          if (subData.subActivities) {
            Object.keys(subData.subActivities).forEach(subActName => {
              renderSubActivityRow(null, activity, subName, subData.subActivities[subActName], { collapsed: true });
            });
          }

          if (subData.wp) {
            subData.wp.forEach(wp => {
              renderSubActivityRow(null, activity, subName, wp, { collapsed: true });
            });
          }
        });
      }
    });


    // --- Riga totale giornaliera ---
    const trTotal = document.createElement('tr');
    trTotal.classList.add('total-row');
    for (let d = 1; d <= numDays; d++) {
      const td = document.createElement('td');
      td.id = `total-day-${d}`;
      td.textContent = '00:00';
      if (isWeekend(new Date(year, month, d))) td.classList.add('holiday-cell');
      trTotal.appendChild(td);
    }
    ['forecast-cell', 'monthly-total'].forEach(cls => {
      const td = document.createElement('td');
      td.classList.add(cls);
      td.textContent = '00:00';
      trTotal.appendChild(td);
    });
    ['--', '--'].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      trTotal.appendChild(td);
    });
    daysBody.appendChild(trTotal);

    // --- Mostra note già salvate ---
    Object.keys(dailyNotes).forEach(k => {
      const day = Number(k);
      if (!isNaN(day)) addNoteIcon(day, dailyNotes[day]);
    });

    // --- Popola dataset.ore e aggiungi listener per input dinamici ---
    daysBody.querySelectorAll('td').forEach(td => {
      const input = td.querySelector('input.hour-input');
      if (input) {
        td.dataset.ore = input.value.trim() || "00:00";

        // listener per aggiornare i totali al volo
        input.addEventListener('input', () => {
          td.dataset.ore = input.value.trim() || "00:00";
          updateTotals();
        });
      } else {
        td.dataset.ore = td.dataset.ore || td.textContent.trim() || "00:00";
      }
    });
    console.log("Righe principali:", fixedBody.querySelectorAll('.activity-row').length);
    console.log("Righe sub (Registri/Diario/Progetti):", fixedBody.querySelectorAll('.sub-row-fixed').length);
    console.log("Righe WP:", fixedBody.querySelectorAll('.child-row-fixed[data-type="wp"]').length);
    console.log("Righe Diario:", fixedBody.querySelectorAll('.child-row-fixed[data-type="diary"]').length);
    console.log("Righe Registri:", fixedBody.querySelectorAll('.child-row-fixed[data-type="registro"]').length);
    console.log("Righe giorni totali:", daysBody.querySelectorAll('tr').length);


    // --- Calcola subito i totali usando i dati caricati dal backend ---
    updateTotals();

CURRENT_TIMESHEET_ID = timesheetData.timesheetId;

  }


  // --- renderActivity ---
  function renderActivity(activity, data, numDays) {
    const trFixed = document.createElement('tr');
    trFixed.classList.add('activity-row');
    trFixed.dataset.activity = activity;
    trFixed.innerHTML = `<td><span class="toggle">▶</span> ${activity}</td>`;
    fixedBody.appendChild(trFixed);
  

    const trDays = document.createElement('tr');
    trDays.classList.add('activity-row-days');
    trDays.dataset.activity = activity;

    // Crea celle giornaliere vuote per la riga principale
    for (let d = 1; d <= numDays; d++) {
      const td = document.createElement('td');
      td.textContent = '';
      trDays.appendChild(td);
    }

    ['forecast-cell', 'monthly-total', 'budget-cell', 'residual-cell'].forEach(cls => {
      const td = document.createElement('td');
      td.classList.add(cls);
      td.textContent = (cls === 'budget-cell' || cls === 'residual-cell') ? data.budget ?? '--' : '00:00';
      trDays.appendChild(td);
    });

    daysBody.appendChild(trDays);

  }




 // --- renderSubActivity ---
function renderSubActivity(parentRow, activity, subName, subData, options = {}) {
  const numDays = daysInMonth(month, year);
  const trFixed = document.createElement('tr');
  trFixed.classList.add('sub-row-fixed');
  trFixed.dataset.activity = activity;
  trFixed.dataset.sub = subName;
  if (options.collapsed) trFixed.style.display = 'none';

  const hasChildren = (subData.subActivities && Object.keys(subData.subActivities).length) || (subData.wp && subData.wp.length);

  // --- Cella fissa ---
  const td = document.createElement('td');
  td.style.paddingLeft = '20px';

  const div = document.createElement('div');
  div.className = 'sub-activity-cell';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '6px';

  // Toggle se ci sono sotto-attività
  if (hasChildren) {
    const toggleSpan = document.createElement('span');
    toggleSpan.className = 'toggle';
    toggleSpan.textContent = '▶';
    div.appendChild(toggleSpan);
  }

  // Status dot
  if (activity === "Progetti" && subData.project_id) {
    const status = PROJECT_STATUSES[subData.project_id];
    if (status) {
      const statusSpan = document.createElement('span');
      statusSpan.className = `status-dot ${status}`;
      statusSpan.title = status;
      div.appendChild(statusSpan);
    }
  }

  // Nome progetto
  const nameSpan = document.createElement('span');
  nameSpan.textContent = subName;
  div.appendChild(nameSpan);

  // Nota di riapertura
// Nota di riapertura SOLO se lo stato è 'riaperto'
if (activity === "Progetti" && subData.project_id) {
  const note = PROJECT_NOTES[subData.project_id];
  const status = PROJECT_STATUSES[subData.project_id]; // recupera lo stato corrente
  if (note && status === 'riaperto') { // mostra solo se riaperto
    const noteSpan = document.createElement('span');
    noteSpan.className = 'reopen-note-icon material-icons';
    noteSpan.style.fontSize = '18px';
    noteSpan.style.color = '#f39c12';
    noteSpan.style.cursor = 'pointer';
    noteSpan.style.marginLeft = '5px';
    noteSpan.textContent = 'note';
    noteSpan.addEventListener('mouseenter', () => showReopenNoteTooltip(noteSpan, note));
    noteSpan.addEventListener('mouseleave', () => hideReopenNoteTooltip());
    div.appendChild(noteSpan);
  }
}

  td.appendChild(div);
  trFixed.appendChild(td);
  (parentRow || fixedBody).appendChild(trFixed);

  // --- Riga giorni ---
  const trDays = document.createElement('tr');
  trDays.classList.add('sub-row-days');
  trDays.dataset.activity = activity;
  trDays.dataset.sub = subName;
  if (options.collapsed) trDays.style.display = 'none';

  const isRegistro = subName === 'Registri';
  const cells = createDayCells({ numDays, withInput: !isRegistro, isRegistro });
  cells.forEach(tdCell => trDays.appendChild(tdCell));

  ['forecast-cell', 'monthly-total', 'budget-cell', 'residual-cell'].forEach(cls => {
    const tdCell = document.createElement('td');
    tdCell.classList.add(cls);
    tdCell.textContent = (cls === 'budget-cell' || cls === 'residual-cell') ? subData.budget ?? '--' : '00:00';
    trDays.appendChild(tdCell);
  });

  daysBody.appendChild(trDays);
}










  // --- renderSubActivityRow ---
function renderSubActivityRow(parentRow, activity, subName, wpData, options = {}) {
  const numDays = daysInMonth(month, year);

  let type = wpData.isProject ? 'project' : 'wp';
  if (subName === 'Diario') type = 'diary';
  else if (subName === 'Registri') type = 'registro';
  else if (subName === 'Altre Attività istituzionali') type = 'institutional';
 

  // Riga fissa (nome attività)
  const trFixed = document.createElement('tr');
  trFixed.classList.add('child-row-fixed');
  trFixed.dataset.activity = activity;
  trFixed.dataset.sub = subName;
  trFixed.dataset.childName = wpData.name;
  trFixed.dataset.type = type;
  if (options.collapsed) trFixed.style.display = 'none';

  const displayName = wpData.code ? `${wpData.name} (${wpData.code})` : wpData.name;
  trFixed.innerHTML = `<td style="padding-left:20px; font-style:arial;">${displayName}</td>`;
  (parentRow || fixedBody).appendChild(trFixed);

  // Riga delle celle giornaliere
  const trDays = document.createElement('tr');
  trDays.classList.add('child-row-days');
  trDays.dataset.activity = activity;
  trDays.dataset.sub = subName;
  trDays.dataset.childName = wpData.name;
  trDays.dataset.type = type;
  if (options.collapsed) trDays.style.display = 'none';

  const cells = createDayCells({
    numDays,
    withInput: type !== 'registro',
    isRegistro: type === 'registro',
    existingData: wpData.days,
      nomeInsegnamento: wpData.name 
  });

  cells.forEach(td => {
    const dayKey = parseInt(td.dataset.day, 10);
    const rawVal = wpData.days?.[dayKey];
    const displayVal = (rawVal != null) ? formatHours(rawVal) : '';
    td.dataset.ore = rawVal ?? '';

    
 const lockInfo = getCellLockInfo({
  type,
  projectId: wpData.project_id
});

if (lockInfo.locked) {
  td.classList.add('locked');
  td.textContent = rawVal != null ? formatHours(rawVal) : '-';
  td.style.cursor = 'not-allowed';

  td.addEventListener('click', () => {
    
    alert(lockInfo.message);
  });

  trDays.appendChild(td);
  return;
}
    // --- Registri, Diario, Attività istituzionali: blocco solo celle vuote ---
  /*if (CURRENT_TIMESHEET_STATUS === 'inviato' && !rawVal && (type === 'registro' || type === 'diary' || type === 'institutional')) {
    td.classList.add('locked');
    td.style.cursor = 'not-allowed';
    td.addEventListener('click', () => {
      alert('Il timesheet è già stato inviato: non puoi inserire ore per un nuovo giorno, puoi modificare solo ore già inserite.');
    });
    trDays.appendChild(td);
    return; // esce subito solo se la cella è vuota
  }*/

   if (type === 'registro') {
  td.textContent = displayVal;

  if (['approvato','rendicontato'].includes(CURRENT_TIMESHEET_STATUS) && !rawVal) {
    td.classList.add('locked');
    td.style.cursor = 'not-allowed'; 
  } else {
    td.style.cursor = 'pointer';
  }

      // Popola i dataset meta se presenti
      td.dataset.tipo = wpData.meta?.[dayKey]?.tipo || '';
      td.dataset.titolo = wpData.meta?.[dayKey]?.titolo || '';
      td.dataset.descrizione = wpData.meta?.[dayKey]?.descrizione || '';
      td.dataset.oreAccademiche = wpData.meta?.[dayKey]?.oreAccademiche || '';

      // Tooltip
      td.addEventListener('mouseenter', e => {
        const tipo = td.dataset.tipo?.trim() || '-';
        const titolo = td.dataset.titolo?.trim() || '-';
        const descrizione = td.dataset.descrizione?.trim() || '-';
        if (tipo === '-' && titolo === '-' && descrizione === '-') return;


        // ================= SNAPSHOT ORIGINALE (per Annulla modifiche) =================
td.dataset.originalOre = rawVal ?? '';
td.dataset.originalTipo = td.dataset.tipo || '';
td.dataset.originalTitolo = td.dataset.titolo || '';
td.dataset.originalDescrizione = td.dataset.descrizione || '';
td.dataset.originalOreAccademiche = td.dataset.oreAccademiche || '';
td.dataset.originalOraInizio = td.dataset.oraInizio || '';
td.dataset.originalOraFine = td.dataset.oraFine || '';



        let tooltip = document.querySelector('.registro-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.classList.add('registro-tooltip');
          tooltip.style.position = 'absolute';
          tooltip.style.display = 'none';
          tooltip.style.padding = '6px 10px';
          tooltip.style.background = '#333';
          tooltip.style.color = '#fff';
          tooltip.style.borderRadius = '4px';
          tooltip.style.fontSize = '12px';
          tooltip.style.pointerEvents = 'none';
          document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
          <strong>Tipo:</strong> ${tipo}<br>
          <strong>Titolo:</strong> ${titolo}<br>
          <strong>Descrizione:</strong> ${descrizione}
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = e.pageX + 15 + 'px';
        tooltip.style.top = e.pageY + 15 + 'px';
      });

      td.addEventListener('mousemove', e => {
        const tooltip = document.querySelector('.registro-tooltip');
        if (tooltip) {
          tooltip.style.left = e.pageX + 15 + 'px';
          tooltip.style.top = e.pageY + 15 + 'px';
        }
      });

      td.addEventListener('mouseleave', () => {
        const tooltip = document.querySelector('.registro-tooltip');
        if (tooltip) tooltip.style.display = 'none';
      });

      // Popup
      td.addEventListener('click', () => {

          const registroLocked = ['inviato','approvato','rendicontato'].includes(CURRENT_TIMESHEET_STATUS);

    if (registroLocked) {
        
        return; // esce senza aprire il popup
    }
        cellaLezioneCorrente = td;
        const registroNome = wpData.name || 'Lezione';
        document.getElementById('lezione-popup-titolo').textContent = registroNome;
        const dataCompleta = new Date(year, month, dayKey);
        document.getElementById('lezione-popup-data').textContent = dataCompleta.toLocaleDateString();
        document.getElementById('lezione-ore-accademiche').value = td.dataset.oreAccademiche || '';
        document.getElementById('lezione-ora-inizio').value = td.dataset.oraInizio || '';
        document.getElementById('lezione-ora-fine').value = td.dataset.oraFine || '';
        document.getElementById('lezione-tipo-attivita').value = td.dataset.tipo || 'Lezione';
        document.getElementById('lezione-titolo').value = td.dataset.titolo || '';
        document.getElementById('lezione-argomento').value = td.dataset.descrizione || '';
        lezionePopup.style.display = 'flex';
      });
    }
    else {
      // diary e istituzionali
      td.textContent = '';
      let input = td.querySelector('input.hour-input') || createHourInput();
      td.appendChild(input);
      input.value = displayVal;
      input.dataset.original = rawVal ?? '';
      if (wpData.meta?.[dayKey]) {
        Object.entries(wpData.meta[dayKey]).forEach(([k,v]) => td.dataset[k]=v);
      }
    }

    trDays.appendChild(td);
  });

  // Celle extra (budget, residuo, ecc.)
  ['forecast-cell', 'monthly-total', 'budget-cell', 'residual-cell'].forEach(cls => {
    const td = document.createElement('td');
    td.classList.add(cls);

    if (cls === 'budget-cell') {
      td.textContent = wpData.budget != null ? formatHours(wpData.budget) : '--';
    } else if (cls === 'residual-cell') {
      td.textContent = wpData.remaining_hours != null ? formatHours(wpData.remaining_hours) : '--';
    } else {
      td.textContent = '';
    }

    trDays.appendChild(td);
  });

  daysBody.appendChild(trDays);
}

document.getElementById('save-btn').addEventListener('click', async () => {
  if (!CURRENT_TIMESHEET_ID) {
    alert('Timesheet non valido');
    return;
  }

  // Conferma prima di salvare
  const proceed = confirm("Stai per salvare le ore inserite.\n\nVuoi procedere?");
  if (!proceed) return; // esce se l'utente clicca "Annulla"

  await collectAndSaveEntriesFromDOM(CURRENT_TIMESHEET_ID);
});




//---------------------

const submitBtn = document.getElementById('submit-btn');

submitBtn.addEventListener('click', async () => {
  if (!CURRENT_TIMESHEET_ID) return alert('Timesheet non disponibile');

  if (!confirm('Sei sicuro di voler inviare il timesheet? Una volta inviato, le ore progetto/WP non potranno più essere modificate e le ore di Attività ordinaria potranno essere aggiornate solamente internamente senza però mai superare il totale giornaliero inserito')) return;

  try {
    const res = await fetch(`/api/timesheet/${CURRENT_TIMESHEET_ID}/submit`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await res.json();
    if (data.success) {
      alert('Timesheet inviato correttamente');
      renderTimesheetStatus('inviato');
      disableProjectWPCells();
    } else {
      alert(`Errore invio timesheet: ${data.message || JSON.stringify(data.details)}`);
    }
  } catch (err) {
    console.error('Errore fetch submit:', err);
    alert('Errore interno durante l\'invio del timesheet');
  }
});

function disableProjectWPCells() {
  // Tutte le celle WP o Progetto
  const wpCells = daysBody.querySelectorAll('td');
  wpCells.forEach(td => {
    const type = td.closest('tr')?.dataset?.type || td.dataset?.type;
    if (type === 'wp' || type === 'project') {
      const input = td.querySelector('input, select, textarea');
      if (input) input.disabled = true;

      // Cambia stile per evidenziare
      td.classList.add('locked');
    }
  });
}

//---------------------



async function collectAndSaveEntriesFromDOM(timesheetId) {
  if (!userDataReal) {
    alert('Nessun timesheet caricato.');
    return;
  }

  const entries = [];
  const allRows = daysBody.querySelectorAll('tr.child-row-days, tr.sub-row-days');

  allRows.forEach(tr => {
    const sub = tr.dataset.sub;
    const childName = tr.dataset.childName;
    let type = tr.dataset.type;

    // Skip righe che non hanno childName (sono header o aggregazioni)
    if (!childName && type !== 'project') return;

    tr.querySelectorAll('td').forEach(td => {
      const day = parseInt(td.dataset.day, 10);
      if (!day) return;

      let hours = 0;
      if (type === 'registro') {
        hours = parseFloat(td.dataset.oreAccademiche || 0);
        type = 'teaching';
      } else if (type === 'wp') {
        type = 'workpackage';
        const input = td.querySelector('input.hour-input');
        hours = input ? parseFloat(input.value) || 0 : parseFloat(td.dataset.ore || 0);
      } else {
        const input = td.querySelector('input.hour-input');
        hours = input ? parseFloat(input.value) || 0 : parseFloat(td.dataset.ore || 0);
      }

      // Recupera activity_id
        let activity_id;
      let project_id;

      // Teaching / Diary
      if (type === 'teaching' || type === 'diary') {
        const act =
          userDataReal["Attività ordinaria"].sub[sub]?.subActivities?.[childName];
        if (act) activity_id = act.id;
      }

  // Project (senza WP)
else if (type === 'project') {
  const proj = userDataReal["Progetti"].sub[sub];

  if (proj) {
    activity_id = proj.id;          // project_assignment_id
    project_id = proj.project_id;   // project reale
  }
}

      // Workpackage
      else if (type === 'workpackage') {
        const wp =
          userDataReal["Progetti"].sub[sub]?.wp?.find(
            w => w.name === childName
          );

        if (wp) {
          activity_id = wp.id;          // wp_assignment_id
          project_id = wp.project_id;   // project reale
        }
      }

      // Altre attività istituzionali
      if (!activity_id && sub === "Altre Attività istituzionali") {
        const act =
          userDataReal["Attività ordinaria"].sub[sub]?.subActivities?.[childName];
        if (act) {
          activity_id = act.id;
          type = 'institutional';
        }
      }

      // se manca activity_id → scarto
      if (!activity_id) return;

      //  BLOCCO HARD BACKEND
      if (
        (type === 'project' || type === 'workpackage') &&
        !project_id
      ) {
        console.warn(
          'ENTRY SCARTATA: manca project_id',
          { type, sub, childName, activity_id }
        );
        return;
      }

      // =====================
      // CREAZIONE ENTRY
      // =====================
      const entry = {
        type,
        activity_id,
        day
      };

      if (project_id) {
        entry.project_id = project_id;
      }

    
    // --- GESTIONE CANCELLAZIONE E ORE ---
if (type === 'teaching') {
  const isPendingDelete = td.dataset.pendingDelete === 'true';
  
  // Se la cella è marcata come cancellazione temporanea e non ci sono ore  invia delete
  if (isPendingDelete && (!hours || hours <= 0)) {
    entry.delete = true;
    entries.push(entry);
    return; // vai alla cella successiva
  }

  // Se ci sono ore (anche dopo aver cliccato cancella) salva normalmente
  if (hours && hours > 0) {
    if (isPendingDelete) delete td.dataset.pendingDelete; // annulla delete temporaneo

    entry.academic_hours = hours;
    entry.start_time = td.dataset.oraInizio ? td.dataset.oraInizio.slice(0,5) : '00:00';
    entry.end_time = td.dataset.oraFine ? td.dataset.oraFine.slice(0,5) : '00:00';
    entry.title = td.dataset.titolo || '';
    entry.description = td.dataset.descrizione || '';
    entry.activity_type = td.dataset.tipo || 'Lezione';

    entries.push(entry);
  }

} else {
  // DIARY / INSTITUTIONAL / PROJECT / WORKPACKAGE
  if (!hours || hours <= 0) return;
  entry.hours = hours;
  entries.push(entry);
}
    });
  });

  try {
    console.log('DEBUG: Entries pronte da inviare al backend:', entries);

 const res = await fetch(`/api/timesheet/${timesheetId}/entries`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ entries }),
  credentials: 'include'  
});

    const result = await res.json();
    console.log('DEBUG: Risposta backend:', result);

    // Controlli superamento budget e limiti
    if (result.code === 'BUDGET_EXCEEDED') {
      const d = result.details;
      console.warn(' Budget superato:', d);
      alert(
        ` Budget superato!\n\n` +
        `Attività: ${d.activity_name}\n` +
        `Ore assegnate: ${d.assigned_hours}\n` +
        `Ore già usate: ${d.used_before}\n` +
        `Ore totali dopo inserimento: ${d.used_after}\n`
      );
      return;
    }

    if (result.code === 'ACADEMIC_YEAR_LIMIT_EXCEEDED') {
      const d = result.details;
      alert(
        ` Limite annuale di ore per la didattica superato!\n\n` +
        `Limite massimo ore: ${d.limit}\n` +
        `Ore già usate: ${d.used_before}\n` +
        `Ore totali dopo inserimento: ${d.used_after}\n` +
        `Ore residue: ${d.remaining_after < 0 ? 0 : d.remaining_after}`
      );
      return;
    }

    if (result.code === 'ACADEMIC_YEAR_TOTAL_LIMIT_EXCEEDED') {
      const d = result.details;
      alert(
        ` Limite annuale totale di ore superato!\n\n` +
        `Limite massimo ore: ${d.limit}\n` +
        `Ore già usate: ${d.used_before}\n` +
        `Ore totali dopo inserimento: ${d.used_after}\n` +
        `Ore residue: ${d.remaining_after < 0 ? 0 : d.remaining_after}\n` +
        `Dettaglio ore per tipo:\n` +
        Object.entries(d.breakdown || {})
          .map(([key, val]) => `  ${key}: ${val}`)
          .join('\n')
      );
      return;
    }

    if (result.code === 'ORDINARY_HOURS_DELTA') {
  const d = result.details;
  alert(
    ` Ore non valide\n\n` +
    `Giorno ${d.day}\n` +
    `Non puoi modificare il totale delle ore ordinarie di questa giornata.\n\n` +
    `Totale attuale: ${d.currentTotal}\n` +
    `Totale inserito: ${d.proposedTotal}`
  );
  return;
}

if (result.code === 'ORDINARY_HOURS_REMOVED') {
  const d = result.details;
  alert(
    ` Ore non valide\n\n` +
    `Giorno ${d.day}\n` +
    `Non puoi cancellare tutte le ore ordinarie di questa giornata.\n\n` +
    `Totale attuale: ${d.currentTotal}\n` +
    `Totale inserito: ${d.proposedTotal}`
  );
  return;
}

  if (!res.ok || !result.success) {
  console.error('Errore salvataggio:', result);
  alert('Errore nel salvataggio delle ore');
  return;
}

// Se ci sono entries bloccate
if (result.blockedEntries && result.blockedEntries.length > 0) {
  const messages = result.blockedEntries.map(be => {
    return `Attività ID ${be.activity_id} (giorno ${be.day}, tipo ${be.type}) non salvata: ${be.reason}`;
  }).join('\n');

  alert(
    `Alcune entries non sono state salvate:\n\n${messages}`
  );
}

// Entries salvate correttamente
const savedCount = entries.length - (result.blockedEntries?.length || 0);
if (savedCount > 0) {
alert("Ore salvate correttamente!");
}


  } catch (err) {
    console.error('Errore fetch/salvataggio:', err);
    alert('Errore nel salvataggio delle ore');
  }
}







  //  GESTIONE CLICK PER ESPANSIONE / COLLASSO TABELLA
  fixedBody.addEventListener('click', e => {
    const row = e.target.closest('.activity-row, .sub-row-fixed, .child-row-fixed');
    if (!row) return;

    const toggle = row.querySelector('.toggle');
    if (!toggle) return;

    const isExpanded = toggle.textContent === '▼';
    toggle.textContent = isExpanded ? '▶' : '▼';

    const activity = row.dataset.activity;
    const sub = row.dataset.sub;

    // --- Livello principale: Attività ordinaria o Progetti ---
    if (row.classList.contains('activity-row')) {
      if (isExpanded) {
        fixedBody.querySelectorAll(`.sub-row-fixed[data-activity="${activity}"]`).forEach(r => r.style.display = 'none');
        daysBody.querySelectorAll(`.sub-row-days[data-activity="${activity}"]`).forEach(r => r.style.display = 'none');
        fixedBody.querySelectorAll(`.child-row-fixed[data-activity="${activity}"]`).forEach(r => r.style.display = 'none');
        daysBody.querySelectorAll(`.child-row-days[data-activity="${activity}"]`).forEach(r => r.style.display = 'none');
        return;
      }

      const subData = userDataReal[activity]?.sub;
      if (!subData) return;

      Object.keys(subData).forEach(subName => {
        const fixedSub = fixedBody.querySelector(`.sub-row-fixed[data-activity="${activity}"][data-sub="${CSS.escape(subName)}"]`);
        const daysSub = daysBody.querySelector(`.sub-row-days[data-activity="${activity}"][data-sub="${CSS.escape(subName)}"]`);
        if (!fixedSub) renderSubActivity(row, activity, subName, subData[subName]);
        else fixedSub.style.display = 'table-row';
        if (daysSub) daysSub.style.display = 'table-row';
      });
    }

    // --- Livello 2: Sub (Registri, Diario o Progetti/WP) ---
    if (row.classList.contains('sub-row-fixed')) {
      const subData = userDataReal[activity]?.sub[sub];
      if (!subData) return;

      const childActivities = subData.subActivities || subData.wp;
      if (!childActivities) return;

      if (isExpanded) {
        fixedBody.querySelectorAll(`.child-row-fixed[data-activity="${activity}"][data-sub="${sub}"]`).forEach(r => r.style.display = 'none');
        daysBody.querySelectorAll(`.child-row-days[data-activity="${activity}"][data-sub="${sub}"]`).forEach(r => r.style.display = 'none');
        return;
      }

      // Mostra o crea le righe child
      if (subData.subActivities) {
        Object.keys(subData.subActivities).forEach(actName => {
          const act = subData.subActivities[actName];
          const fixedRow = fixedBody.querySelector(`.child-row-fixed[data-activity="${activity}"][data-sub="${sub}"][data-child-name="${CSS.escape(act.name)}"]`);
          const daysRow = daysBody.querySelector(`.child-row-days[data-activity="${activity}"][data-sub="${sub}"][data-child-name="${CSS.escape(act.name)}"]`);
          if (!fixedRow) renderSubActivityRow(row, activity, sub, act);
          else fixedRow.style.display = 'table-row';
          if (daysRow) daysRow.style.display = 'table-row';
        });
      }

      if (subData.wp) {
        subData.wp.forEach(wp => {
          const fixedRow = fixedBody.querySelector(`.child-row-fixed[data-activity="${activity}"][data-sub="${sub}"][data-child-name="${CSS.escape(wp.name)}"]`);
          const daysRow = daysBody.querySelector(`.child-row-days[data-activity="${activity}"][data-sub="${sub}"][data-child-name="${CSS.escape(wp.name)}"]`);
          if (!fixedRow) renderSubActivityRow(row, activity, sub, wp);
          else fixedRow.style.display = 'table-row';
          if (daysRow) daysRow.style.display = 'table-row';
        });
      }
    }
  });

  //ABILITA POPUP PER REGISTRI
  function abilitaPopupLezioni() {
    daysBody.addEventListener('click', e => {
      const td = e.target.closest('td');
      const tr = td?.closest('.sub-row-days');
      if (!td || !tr) return;

      const activity = tr.dataset.activity;
      const sub = tr.dataset.sub;
      const dayIndex = Array.from(td.parentNode.children).indexOf(td) + 1;

      if (activity === 'Registri' && sub) {
        cellaLezioneCorrente = td;
        const nomeLezione = sub;
        const dataSelezionata = `${String(dayIndex).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${String(year).slice(-2)}`;
        apriLezionePopup(nomeLezione, dataSelezionata);
      }
    });
  }
  abilitaPopupLezioni();

  function updateTotals() {
    const numDays = daysInMonth(month, year);

    /* ------------------ Utils ------------------ */
    const timeToMinutes = val => {
      if (!val) return 0;
      if (typeof val === "number") return val * 60;
      const m = val.match(/^(\d+):(\d{2})$/);
      if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      if (!isNaN(val)) return Math.round(parseFloat(val) * 60);
      return 0;
    };

    const minutesToTime = mins => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    /* ------------------ 0) Sync input → dataset ------------------ */
    daysBody.querySelectorAll("td").forEach(td => {
      const input = td.querySelector("input");
      if (input) td.dataset.ore = input.value.trim() || "";
      else if (!td.dataset.ore) td.dataset.ore = "";
    });

    /* ------------------ 1) RIGHE FOGLIA ------------------ */
    const leafRows = [...daysBody.querySelectorAll(".child-row-days")];

leafRows.forEach(row => {
  let total = 0;
  let daysUsed = 0;

  for (let d = 1; d <= numDays; d++) {
    const td = row.children[d - 1];
    if (!td) continue;

    const inputVal = td.querySelector("input")?.value;
    const mins = timeToMinutes(inputVal || td.dataset.ore);

    // Celle bloccate WP/Project
    if (td.classList.contains("locked")) {
      td.dataset.ore = mins > 0 ? minutesToTime(mins) : "";
      td.textContent = mins > 0 ? minutesToTime(mins) : "";
    } else if (td.classList.contains("registro-cell")) {
      td.dataset.ore = mins > 0 ? minutesToTime(mins) : "";
      if (!td.querySelector("input")) td.textContent = mins > 0 ? minutesToTime(mins) : "";
    } else {
      td.dataset.ore = minutesToTime(mins);
      if (!td.querySelector("input")) td.textContent = mins > 0 ? minutesToTime(mins) : "";
    }

    total += mins;
    if (mins > 0) daysUsed++;
  }

  row.querySelector(".monthly-total").textContent = minutesToTime(total);
  row.querySelector(".forecast-cell").textContent =
    daysUsed ? minutesToTime(Math.round((total / daysUsed) * numDays)) : "00:00";

  const budgetCell = row.querySelector(".budget-cell"); 
  const residualCell = row.querySelector(".residual-cell");
  if (residualCell && row.dataset.remainingHours != null) {
      residualCell.textContent = formatHours(parseFloat(row.dataset.remainingHours));
  }
});

    /* ------------------ 2) RIGHE CONTENITORE ------------------ */
    const containerRows = [...daysBody.querySelectorAll(".sub-row-days")];

    containerRows.forEach(row => {
      const activity = row.dataset.activity;
      const sub = row.dataset.sub;

      const children = leafRows.filter(r =>
        r.dataset.activity === activity &&
        (!sub || r.dataset.sub === sub)
      );

      if (!children.length) return;

      let total = 0;
      let daysUsed = 0;

      for (let d = 1; d <= numDays; d++) {
        let daySum = 0;

        children.forEach(child => {
          daySum += timeToMinutes(child.children[d - 1]?.dataset.ore);
        });

        const td = row.children[d - 1];
        if (td) {
          td.dataset.ore = minutesToTime(daySum);
          td.textContent = daySum ? minutesToTime(daySum) : "";
        }

        total += daySum;
        if (daySum > 0) daysUsed++;
      }

      row.querySelector(".monthly-total").textContent = minutesToTime(total);
      row.querySelector(".forecast-cell").textContent =
        daysUsed ? minutesToTime(Math.round((total / daysUsed) * numDays)) : "00:00";

      const residualCell = row.querySelector(".residual-cell");
      if (residualCell) {
        let residualSum = 0;
        children.forEach(child => {
          const rc = child.querySelector(".residual-cell");
          if (rc) residualSum += timeToMinutes(rc.textContent);
        });
        residualCell.textContent = minutesToTime(residualSum);
      }
    });

    /* ------------------ 3) RIGHE PRINCIPALI ------------------ */
    const mainRows = [...daysBody.querySelectorAll(".activity-row-days")];

    mainRows.forEach(row => {
      const activity = row.dataset.activity;
      const subs = containerRows.filter(r => r.dataset.activity === activity);

      if (!subs.length) return;

      let total = 0;
      let daysUsed = 0;

      for (let d = 1; d <= numDays; d++) {
        let daySum = 0;
        subs.forEach(sub => {
          daySum += timeToMinutes(sub.children[d - 1]?.dataset.ore);
        });

        const td = row.children[d - 1];
        if (td) {
          td.dataset.ore = minutesToTime(daySum);
          td.textContent = daySum ? minutesToTime(daySum) : "";
        }

        total += daySum;
        if (daySum > 0) daysUsed++;
      }

      row.querySelector(".monthly-total").textContent = minutesToTime(total);
      row.querySelector(".forecast-cell").textContent =
        daysUsed ? minutesToTime(Math.round((total / daysUsed) * numDays)) : "00:00";

   
  const residualCell = row.querySelector(".residual-cell");
  if (residualCell) {
    if (activity === "Attività ordinaria") {
      residualCell.textContent = "--"; 
    } else {
      let residualSum = 0;
      subs.forEach(sub => {
        const rc = sub.querySelector(".residual-cell");
        if (rc) residualSum += timeToMinutes(rc.textContent);
      });
      residualCell.textContent = minutesToTime(residualSum);
    }
  }
});

    /* ------------------ 4) TOTALI GIORNALIERI + ALERT/NOTE 8 ORE ------------------ */
    for (let d = 1; d <= numDays; d++) {
      let daily = 0;

      mainRows.forEach(r => {
        daily += timeToMinutes(r.children[d - 1]?.dataset.ore);
      });

      const td = document.getElementById(`total-day-${d}`);
      if (td) td.textContent = minutesToTime(daily);

      if (daily > 480) {
        createDailyAlert(d);
        // nota rimane se già presente
        if (dailyNotes[d]) addNoteIcon(d, dailyNotes[d]);
      } else {
        // ore <= 8: la nota scompare automaticamente
        const alertDiv = document.getElementById(`alert-day-${d}`);
        if (alertDiv) alertDiv.remove();
        alertsSent[d] = false;
        removeNoteIcon(d);
      }
    }

    /* ------------------ 5) TOTALE MENSILE COMPLESSIVO ------------------ */
    let monthTotal = 0;
    mainRows.forEach(r => {
      monthTotal += timeToMinutes(r.querySelector(".monthly-total")?.textContent);
    });

    const totalCell = daysBody.querySelector(".total-row .monthly-total");
    if (totalCell) totalCell.textContent = minutesToTime(monthTotal);
  }
  // EXPORT REGISTRO
  function abilitaExportLezioni() {
    fixedBody.addEventListener('click', e => {
      const cell = e.target.closest('.sub-row-fixed[data-activity="Registri"] td');
      if (!cell) return;
      const nomeLezione = cell.textContent.trim();
      if (!nomeLezione) return;

      // --- Estrai i dati reali dal timesheet ---
      const righeLezione = [];
      const celle = document.querySelectorAll(
        `.sub-row-days[data-activity="Registri"][data-sub="${CSS.escape(nomeLezione)}"] td`
      );

      celle.forEach((td, index) => {
        const oreAccademiche = td.dataset.oreAccademiche;
        if (!oreAccademiche) return; // solo celle con dati effettivi

        const gg = String(index + 1).padStart(2, '0');
        const mm = String(month + 1).padStart(2, '0');
        const yyyy = year;

        righeLezione.push({
          Data: `${gg}/${mm}/${yyyy}`,
          "Ora inizio": td.dataset.oraInizio || "",
          "Ora fine": td.dataset.oraFine || "",
          "Ore accademiche": td.dataset.oreAccademiche || "",
          "Tipo attività": td.dataset.tipo || "",
          "Titolo": td.dataset.titolo || "",
          "Descrizione": td.dataset.argomento || ""
        });
      });

      if (righeLezione.length === 0) {
        alert(`Nessuna lezione trovata per "${nomeLezione}" nel mese corrente.`);
        return;
      }

      // --- Calcola l’anno accademico basato sull’anno del timesheet visualizzato ---
      const annoAccademicoInizio = (month >= 8) ? year : year - 1;
      const annoAccademicoFine = String((annoAccademicoInizio + 1)).slice(-2);
      const annoAccademico = `${annoAccademicoInizio}/${annoAccademicoFine}`;

  
      localStorage.setItem("lezioneDaEsportare", nomeLezione);
      localStorage.setItem("datiLezione_" + nomeLezione, JSON.stringify(righeLezione));
      localStorage.setItem("docente", currentUser);
      localStorage.setItem("annoAccademico", annoAccademico);

      // --- Reindirizza alla nuova pagina ---
      window.location.href = "export_registro_docente.html";
    });
  }

  abilitaExportLezioni();




  // POPOLAMENTO ANNI (per popup calendario)
  function populateYears() {
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 5; const maxYear = currentYear + 5;
    yearSelect.innerHTML = '';
    for (let y = minYear; y <= maxYear; y++) { const option = document.createElement('option'); option.value = y; option.textContent = y; if (y === year) option.selected = true; yearSelect.appendChild(option); }
  }

  // NAVIGAZIONE 
  prevBtn?.addEventListener('click', async () => {
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    updateDisplay();
    await renderTimesheetReal();
  });

  nextBtn?.addEventListener('click', async () => {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    updateDisplay();
    await renderTimesheetReal();
  });

  calendarBtn?.addEventListener('click', () => {
    calendarPopup.classList.toggle('hidden');
    populateYears();
    monthSelect.value = month;
    yearSelect.value = year;
  });

  goBtn?.addEventListener('click', async () => {
    month = parseInt(monthSelect.value, 10);
    year = parseInt(yearSelect.value, 10);
    updateDisplay();
    calendarPopup.classList.add('hidden');
    await renderTimesheetReal();
  });



  // INIZIALIZZAZIONE 
  updateDisplay();
  renderTimesheetReal();


});