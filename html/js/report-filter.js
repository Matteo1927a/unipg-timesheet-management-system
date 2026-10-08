document.addEventListener('DOMContentLoaded', () => {

  const academicYearSelect = document.getElementById('academicYear');
  const teachingSelect = document.getElementById('teaching');
  const submitBtn = document.getElementById('openReportBtn');
  const semesterSelect = document.getElementById('semester');

  // Controllo sicurezza
  if (!academicYearSelect || !teachingSelect || !semesterSelect) {
    console.error('Elemento select non trovato!');
    return; 
  }

  // Stato iniziale
  academicYearSelect.disabled = true;
  teachingSelect.disabled = true;
  submitBtn.disabled = true;

  /**
   * Abilita/disabilita pulsante in base alle select
   */
  function updateSubmitState() {
    submitBtn.disabled = !(academicYearSelect.value && semesterSelect.value && teachingSelect.value);
  }

  /**
   * Reset select insegnamenti
   */
  function resetTeachingSelect() {
    if (!academicYearSelect.value) {
      teachingSelect.innerHTML = '<option value="">Seleziona un anno accademico</option>';
    } else if (!semesterSelect.value) {
      teachingSelect.innerHTML = '<option value="">Seleziona un semestre o corso annuale</option>';
    } else {
      teachingSelect.innerHTML = '<option value="">Seleziona insegnamento</option>';
    }
    teachingSelect.disabled = true;
    updateSubmitState();
  }

  /**
   * Carica anni accademici dai timesheet dell'utente
   */
  async function loadAcademicYears() {
    academicYearSelect.disabled = true;
    academicYearSelect.innerHTML = '<option value="">Caricamento anni accademici...</option>';

    try {
      const response = await fetch('/api/report/academic-years', { credentials: 'include' });
      if (!response.ok) throw new Error('Errore HTTP');

      const data = await response.json();
      if (!data.success || !Array.isArray(data.academic_years)) throw new Error('Formato risposta non valido');

      const years = data.academic_years;
      academicYearSelect.innerHTML = '<option value="">Seleziona anno accademico</option>';

      if (years.length === 0) {
        academicYearSelect.innerHTML = '<option value="">Nessun anno disponibile</option>';
        return;
      }

      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        academicYearSelect.appendChild(option);
      });

      academicYearSelect.disabled = false;

    } catch (error) {
      console.error('Errore caricamento anni accademici:', error);
      academicYearSelect.innerHTML = '<option value="">Errore caricamento anni</option>';
    }
  }

  /**
   * Carica insegnamenti per anno accademico e semestre selezionato
   */
  async function loadTeachingsByYearAndSemester(year, semester) {
    resetTeachingSelect();

    if (!year || !semester) return;

    teachingSelect.innerHTML = '<option value="">Caricamento insegnamenti...</option>';

    try {
      const url = new URL('/api/report/teachings', window.location.origin);
      url.searchParams.append('academic_year', year);

      // Solo se semestre != 0 (annuale) 
      if (semester !== '0') url.searchParams.append('semester', semester);

      const res = await fetch(url.toString(), { credentials: 'include' });
      const data = await res.json();

      teachingSelect.innerHTML = '<option value="">Seleziona insegnamento</option>';

      if (!data.success || !Array.isArray(data.teachings)) throw new Error(data.message || 'Errore caricamento insegnamenti');

      if (data.teachings.length === 0) {
        teachingSelect.innerHTML = '<option value="">Nessun insegnamento disponibile</option>';
        return;
      }

      data.teachings.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.name;
        teachingSelect.appendChild(option);
      });

      teachingSelect.disabled = false;

    } catch (err) {
      console.error('Errore caricamento insegnamenti:', err);
      teachingSelect.innerHTML = '<option value="">Errore caricamento insegnamenti</option>';
    }
  }

  
  academicYearSelect.addEventListener('change', () => {
    semesterSelect.value = '';
    resetTeachingSelect();
    updateSubmitState();
  });

  semesterSelect.addEventListener('change', () => {
    const year = academicYearSelect.value;
    const semester = semesterSelect.value;
    if (year && semester) {
      loadTeachingsByYearAndSemester(year, semester);
    } else {
      resetTeachingSelect();
    }
    updateSubmitState();
  });

  teachingSelect.addEventListener('change', updateSubmitState);

  submitBtn.addEventListener('click', () => {
    const academicYear = academicYearSelect.value;
    const teachingId = teachingSelect.value;
    const semester = semesterSelect.value;

    if (!academicYear || !teachingId || !semester) return;

    const params = new URLSearchParams({
      year: academicYear,
      teaching_id: teachingId,
      semester
    });

    window.location.href = `/registri_report.html?${params.toString()}`;
  });

  // --- Avvio ---
  loadAcademicYears();

});
