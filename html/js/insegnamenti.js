document.addEventListener('DOMContentLoaded', async () => {

  let allTeachings = [];
  let selectedTeachingId = null;

  function formatHoursDecimalToHours(decimalHours) {
  if (decimalHours === null || decimalHours === undefined) return '';

  const hours = Math.floor(decimalHours); // prende solo la parte intera
  return `${hours}`; // ritorna come stringa
}

 
  function setupEventListeners() {
    // chiusura modal
    document
      .getElementById('teaching-close-btn')
      .addEventListener('click', closeTeachingsModal);

    document
      .getElementById('teaching-cancel-btn')
      .addEventListener('click', closeTeachingsModal);

    document
      .getElementById('teaching-modal-overlay')
      .addEventListener('click', closeTeachingsModal);

    // submit form
    document
      .getElementById('teaching-form')
      .addEventListener('submit', submitTeachingBudget);

    // click su bottone modifica
    document
      .getElementById('teachings-table-body')
      .addEventListener('click', e => {
        const btn = e.target.closest('.action-btn.edit');
        if (!btn) return;

        const teachingId = btn.dataset.id;
        const row = btn.closest('tr');

        const name = row.children[0].textContent;
        const code = row.children[1].textContent;
        const budget = row.children[2].dataset.value || '';

        openTeachingsModal(teachingId, name, code, budget);
      });

        document.getElementById('search-input')
    .addEventListener('input', filterTeachings);
  }

  /* =========================
     Caricamento insegnamenti
  ======================== */
  async function loadTeachings() {
    try {
      const res = await fetch('/api/didattica/insegnamenti', {
        credentials: 'include'
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message);

      allTeachings = data.teachings;
      renderTeachingsTable(allTeachings);
    } catch (err) {
      console.error(err);
      alert('Errore nel caricamento degli insegnamenti');
    }
  }

  /* =========================
     Render tabella
  ======================== */
  function renderTeachingsTable(teachings) {
    const tbody = document.getElementById('teachings-table-body');
    tbody.innerHTML = '';

    teachings.forEach(t => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${t.name}</td>
        <td>${t.code}</td>
      <td data-value="${t.budget_hour ?? ''}">
  ${formatHoursDecimalToHours(t.budget_hour) || '—'}
</td>
        <td>
          <button
            class="action-btn edit"
            data-id="${t.id}"
          >
            Configura
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  /* =========================
     Apertura modal
  ======================== */
  function openTeachingsModal(id, name, code, budget) {
    selectedTeachingId = id;

    document.getElementById('modal-teaching-name').value = name;
    document.getElementById('modal-teaching-code').value = code;
    document.getElementById('modal-budget-hour').value = formatHoursDecimalToHours(budget);

    document
      .getElementById('teaching-modal-overlay')
      .classList.remove('hidden');

    document
      .getElementById('teaching-modal')
      .classList.remove('hidden');
  }

  /* =========================
     Chiusura modal
  ======================== */
  function closeTeachingsModal() {
    document
      .getElementById('teaching-modal-overlay')
      .classList.add('hidden');

    document
      .getElementById('teaching-modal')
      .classList.add('hidden');

    selectedTeachingId = null;
  }

  /* =========================
   Filtro insegnamenti per ricerca
========================= */
function filterTeachings() {
  const query = document.getElementById('search-input').value.toLowerCase();

  const filtered = allTeachings.filter(t =>
    t.name.toLowerCase().includes(query) ||  // cerca nel nome
    t.code.toLowerCase().includes(query)     // cerca nel codice
  );

  renderTeachingsTable(filtered);
}

  /* =========================
     Submit budget ore
  ======================== */
  async function submitTeachingBudget(e) {
    e.preventDefault();
    if (!selectedTeachingId) return;

    const budgetInput = document.getElementById('modal-budget-hour');
    const budgetHour = parseInt(budgetInput.value, 10);

    if (Number.isNaN(budgetHour) || budgetHour < 0) {
      alert('Inserisci un numero di ore valido');
      return;
    }

    try {
      const res = await fetch(
        `/api/didattica/insegnamenti/${selectedTeachingId}/budget`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budget_hour: budgetHour })
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error('Errore server:', text);
        alert('Errore durante il salvataggio');
        return;
      }

      const data = await res.json();

      if (!data.success) {
        alert(data.errors?.map(e => e.msg).join('\n') || data.message);
        return;
      }

          alert('Budget modifcato con successo!');

      closeTeachingsModal();
      await loadTeachings();

    } catch (err) {
      console.error(err);
      alert('Errore di comunicazione con il server');
    }
  }

  setupEventListeners();
  await loadTeachings();

});
