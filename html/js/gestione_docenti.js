document.addEventListener('DOMContentLoaded', async () => {
 
let allDocenti = [];
let selectedUserId = null;

function formatHoursDecimalToHours(decimalHours) {
  if (decimalHours === null || decimalHours === undefined) return '';
  
  const hours = Math.floor(decimalHours); // prendi solo la parte intera
  return `${hours}`;
}




function setupEventListeners() {
  // Chiusura popup
  document.getElementById('limits-close-btn').addEventListener('click', closeLimitsModal);
  document.getElementById('limits-cancel-btn').addEventListener('click', closeLimitsModal);
  document.getElementById('limits-modal-overlay').addEventListener('click', closeLimitsModal);

  // Filtro testuale
  document.getElementById('search-input').addEventListener('input', filterDocenti);

  // Click sui pulsanti Modifica in tabella
  document.getElementById('teacher-table-body').addEventListener('click', e => {
    const btn = e.target.closest('.action-btn.edit');
    if (!btn) return;

    const userId = btn.dataset.userId;
    const row = btn.closest('tr');

    const firstName = row.children[0].textContent;
    const lastName = row.children[1].textContent;

    openLimitsModal(userId, `${firstName} ${lastName}`);
  });

  // Cambio anno nel popup
  document.getElementById('modal-academic-year').addEventListener('change', e => {
    if (!selectedUserId) return;
    loadLimitsForYear(selectedUserId, e.target.value);
  });
}

/* =========================
   Fetch lista completa docenti
========================= */
async function loadDocenti() {
  try {
    const res = await fetch('/api/didattica/docenti', { credentials: 'include' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Errore nel recupero docenti');

    allDocenti = data.docenti;
    renderTable(allDocenti);
  } catch (err) {
    console.error(err);
    alert('Errore nel recupero dei docenti');
  }
}

/* =========================
   Render tabella docenti
========================= */
function renderTable(docenti) {
  const tbody = document.getElementById('teacher-table-body');
  tbody.innerHTML = '';

  docenti.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.first_name}</td>
      <td>${d.last_name}</td>
      <td>${d.email}</td>
      <td>${d.docente_code ?? '—'}</td>
      <td>${d.fiscal_code ?? '—'}</td>
      <td>
        <span class="status ${d.is_active ? 'active' : 'inactive'}">
          ${d.is_active ? 'Attivo' : 'Inattivo'}
        </span>
      </td>
      <td>
        <button class="action-btn edit" data-user-id="${d.id}">Configura</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================
   Filtro docenti per ricerca
========================= */
function filterDocenti() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const filtered = allDocenti.filter(d =>
    d.first_name.toLowerCase().includes(query) ||
    d.last_name.toLowerCase().includes(query) ||
    (d.docente_code ?? '').toLowerCase().includes(query) ||
    (d.fiscal_code ?? '').toLowerCase().includes(query)
  );
  renderTable(filtered);
}

/* =========================
   Apertura popup limiti
========================= */
async function openLimitsModal(userId, docenteName) {
  selectedUserId = userId;

  // Nome docente
  document.getElementById('modal-docente-name').value = docenteName;

  const maxTeachingInput = document.getElementById('modal-max-teaching-hours');
  const maxTotalInput = document.getElementById('modal-max-total-hours');
  const academicYearSelect = document.getElementById('modal-academic-year');

  maxTeachingInput.value = '';
  maxTotalInput.value = '';

  populateAcademicYears(academicYearSelect, 5); // genera ultimi 5 anni accademici

  // Mostra popup
  document.getElementById('limits-modal-overlay').classList.remove('hidden');
  document.getElementById('limits-modal').classList.remove('hidden');

  // Carica limiti per l'anno selezionato (primo della select)
  if (academicYearSelect.value) {
    loadLimitsForYear(userId, academicYearSelect.value);
  }
}

/* =========================
   Fetch limiti per docente e anno
========================= */
async function loadLimitsForYear(userId, academicYear) {
  try {
    const res = await fetch(`/api/didattica/docente/${userId}/limits?academic_year=${encodeURIComponent(academicYear)}`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Errore nel recupero dei limiti');

    const maxTeachingInput = document.getElementById('modal-max-teaching-hours');
    const maxTotalInput = document.getElementById('modal-max-total-hours');

    if (data.limits.length > 0) {
    maxTeachingInput.value = formatHoursDecimalToHours(data.limits[0].max_teaching_hours);
maxTotalInput.value = formatHoursDecimalToHours(data.limits[0].max_total_hours);

    } else {
      maxTeachingInput.value = '';
      maxTotalInput.value = '';
    }
  } catch (err) {
    console.error(err);
    alert('Errore nel recupero dei limiti del docente per l\'anno selezionato');
  }
}

/* =========================
   Gestione submit popup limiti
========================= */
document.getElementById('limits-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!selectedUserId) return;

  const academicYear = document.getElementById('modal-academic-year').value;
  const maxTeaching = parseInt(document.getElementById('modal-max-teaching-hours').value, 10);
  const maxTotal = parseInt(document.getElementById('modal-max-total-hours').value, 10);

  try {
    const res = await fetch(`/api/didattica/docente/${selectedUserId}/limits`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academic_year: academicYear,
        max_teaching_hours: maxTeaching,
        max_total_hours: maxTotal
      })
    });

    const data = await res.json();

    if (!data.success) {
      if (data.errors) {
        // Mostra errori di validazione nel popup
        alert(data.errors.map(err => err.msg).join('\n'));
      } else {
        alert(data.message || 'Errore durante il salvataggio dei limiti');
      }
      return;
    }

     alert('Limiti aggionrati con successo!');

    // Chiudi popup
    closeLimitsModal();

    // Aggiorna la tabella
    await loadDocenti();

  } catch (err) {
    console.error(err);
    alert('Errore durante la richiesta al server');
  }
});


/* =========================
   Chiusura popup limiti
========================= */
function closeLimitsModal() {
  document.getElementById('limits-modal-overlay').classList.add('hidden');
  document.getElementById('limits-modal').classList.add('hidden');
  selectedUserId = null;
}

/* =========================
   Genera anni accademici nel select
========================= */
function populateAcademicYears(selectElement, pastYears = 5, futureYears = 5) {
  selectElement.innerHTML = ''; // pulisce la select
  const existingYears = [];

  const today = new Date();
  let currentYear = today.getFullYear();
  // Se siamo prima di ottobre, l'anno accademico corrente inizia l'anno precedente
  if (today.getMonth() < 9) currentYear -= 1;

  // Genera anni dal passato al futuro
  for (let i = pastYears; i >= -futureYears; i--) {
    const startYear = currentYear - i;
    const endYear = (startYear + 1).toString().slice(-2);
    const yearText = `${startYear}/${endYear}`;

    if (!existingYears.includes(yearText)) {
      const opt = document.createElement('option');
      opt.value = yearText;
      opt.textContent = yearText;
      selectElement.appendChild(opt);
      existingYears.push(yearText);
    }
  }

  // Seleziona il primo anno attuale
  const currentYearText = `${currentYear}/${(currentYear + 1).toString().slice(-2)}`;
  selectElement.value = currentYearText;
}

 setupEventListeners();
  await loadDocenti(); 

});

