document.addEventListener('DOMContentLoaded', () => {
  loadProjects();

  // ===============================
  // Listener sul bottone "Genera report"
  // ===============================
  const generateBtn = document.getElementById('generateProjectReportBtn');
document.getElementById('generateProjectReportBtn').addEventListener('click', async () => {
  const projectSelect = document.getElementById('project');
  const userSelect = document.getElementById('user');
  const monthSelect = document.getElementById('month');
  const yearSelect = document.getElementById('year');

  const projectId = projectSelect.value;
  const userId = userSelect.value;
  const month = monthSelect.value;
  const year = yearSelect.value;

  if (!projectId || !userId || !month || !year) {
    alert('Seleziona tutti i filtri prima di generare il report.');
    return;
  }

  try {
    const res = await fetch(`/api/report_projects/${projectId}/generate_report?userId=${userId}&month=${month}&year=${year}`);
    
    if (!res.ok) {
      
      const error = await res.json();
      alert(error.message); 
      return;
    }

    // Se tutto ok scarica file
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${userSelect.options[userSelect.selectedIndex].text}_${month}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error('Errore generazione report:', err);
    alert('Errore imprevisto durante la generazione del report.');
  }
});

});

/* =======================
   CARICAMENTO PROGETTI
======================= */
async function loadProjects() {
  try {
    const res = await fetch('/api/report_projects/filters');
    if (!res.ok) throw new Error(`Errore: ${res.status}`);

    const projects = await res.json();
    const projectSelect = document.getElementById('project');
    const userSelect = document.getElementById('user');
    const yearSelect = document.getElementById('year');

    // Reset select utenti e anni
    userSelect.disabled = true;
    userSelect.innerHTML = '<option value="">Seleziona utente</option>';

    yearSelect.innerHTML = '<option value="">Seleziona anno</option>';

    // Popola select progetti
    projectSelect.innerHTML = '<option value="">Seleziona progetto</option>';
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;

      // Salvare le date come data attributes
      option.dataset.startDate = project.start_date;
      option.dataset.endDate = project.end_date;

      projectSelect.appendChild(option);
    });

    console.log('Select progetti popolata con successo');

    // Setta listener per cambio progetto
    projectSelect.addEventListener('change', () => {
      const selectedProjectId = projectSelect.value;
      const selectedOption = projectSelect.options[projectSelect.selectedIndex];

      // Reset select utenti e anni
      userSelect.disabled = true;
      userSelect.innerHTML = '<option value="">Seleziona utente</option>';
      yearSelect.innerHTML = '<option value="">Seleziona anno</option>';

      if (selectedProjectId) {
        // Popola utenti assegnati
        loadUsersByProject(selectedProjectId);

        // Popola anni in base al progetto
        const startDate = selectedOption.dataset.startDate;
        const endDate = selectedOption.dataset.endDate;
        populateYearSelect(startDate, endDate);
      }
    });

  } catch (err) {
    console.error('Errore caricamento progetti:', err);
  }
}

/* =======================
   CARICAMENTO UTENTI PER PROGETTO
======================= */
async function loadUsersByProject(projectId) {
  try {
    const res = await fetch(`/api/report_projects/${projectId}/users`);
    if (!res.ok) throw new Error(`Errore: ${res.status}`);

    const users = await res.json();
    const userSelect = document.getElementById('user');

    // Abilita select utenti
    userSelect.disabled = false;
    userSelect.innerHTML = '<option value="">Seleziona utente</option>';

    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.last_name} ${user.first_name}`;
      userSelect.appendChild(option);
    });

    console.log(`Select utenti popolata per progetto ${projectId}`);

  } catch (err) {
    console.error('Errore caricamento utenti:', err);
  }
}

/* =======================
   POPOLAMENTO ANNI
======================= */
function populateYearSelect(startDate, endDate) {
  const yearSelect = document.getElementById('year');
  yearSelect.innerHTML = '<option value="">Seleziona anno</option>';

  const startYear = new Date(startDate).getFullYear();
  const endYear = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}