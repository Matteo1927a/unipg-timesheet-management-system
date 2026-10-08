document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const academicYear = urlParams.get('year');
  const teacherTeachingId = urlParams.get('teaching_id');
  const semester = urlParams.get('semester') || '0'; // 0 = annuale

  const annoSpan = document.getElementById('anno-accademico');
  const nomeDocenteSpan = document.getElementById('nome-docente');
  const codiceDocenteSpan = document.getElementById('codice-docente');
  const nomeLezioneSpan = document.getElementById('nome-lezione');
  const codiceLezioneSpan = document.getElementById('codice-insegnamento');
  const semestreSpan = document.getElementById('semestre');

  const registroBody = document.getElementById('registroBody');
  const btnExport = document.getElementById('btnExport');

  // ================= Helpers =================

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

 function formatTime(timeStr) {
  if (!timeStr) return '-';

  const [hour, minute] = timeStr.split(':');

  // Se è 00:00 oppure 00:00:00 → mostra trattino
  if (hour === '00' && minute === '00') {
    return '-';
  }

  return `${hour}:${minute}`;
}

  function formatAcademicHours(hours) {
    if (hours == null) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  }

  // ================= Carica info insegnamento =================

  async function loadTeachingInfo() {
    try {
      const res = await fetch(`/api/report/teaching-info?id=${teacherTeachingId}`, {
        credentials: 'include'
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const t = data.teaching;

      annoSpan.textContent = academicYear;
      nomeDocenteSpan.textContent = t.teacher_name;
      codiceDocenteSpan.textContent = t.teacher_code;
      nomeLezioneSpan.textContent = t.name;
          codiceLezioneSpan.textContent = `[${t.code}]`; 
      semestreSpan.textContent =
        semester === '0'
          ? 'Annuale'
          : semester === '1'
          ? 'Primo Semestre'
          : 'Secondo Semestre';

    } catch (err) {
      console.error('Errore caricamento info insegnamento:', err);
    }
  }

  // ================= Carica registro =================

  async function loadRegistro() {
    registroBody.innerHTML = '<tr><td colspan="7">Caricamento...</td></tr>';

    try {
      const params = new URLSearchParams({
        academic_year: academicYear,
        teacher_teaching_id: teacherTeachingId,
        semester
      });

      const res = await fetch(`/api/report/registro?${params.toString()}`, {
        credentials: 'include'
      });

      const data = await res.json();
      registroBody.innerHTML = '';

      if (!data.success || !Array.isArray(data.entries)) {
        throw new Error(data.message);
      }

      if (data.entries.length === 0) {
        registroBody.innerHTML =
          '<tr><td colspan="7">Nessuna entry presente</td></tr>';
        return;
      }

      data.entries.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDate(e.date)}</td>
          <td>${formatTime(e.start_time)}</td>
          <td>${formatTime(e.end_time)}</td>
          <td>${formatAcademicHours(e.academic_hours)}</td>
          <td>${e.activity_type || '-'}</td>
          <td>${e.title || '-'}</td>
          <td>${e.description || '-'}</td>
        `;
        registroBody.appendChild(tr);
      });

    } catch (err) {
      console.error('Errore caricamento registro:', err);
      registroBody.innerHTML =
        '<tr><td colspan="7">Errore caricamento registro</td></tr>';
    }
  }

  // ================= NUOVO EXPORT (via backend template) =================

  btnExport.addEventListener('click', async () => {
    try {
      btnExport.disabled = true;
      btnExport.textContent = 'Generazione...';

      const params = new URLSearchParams({
        academic_year: academicYear,
        teacher_teaching_id: teacherTeachingId,
        semester
      });

      const response = await fetch(
        `/api/report/generate?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Errore generazione registro');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const filename = `Registro_${academicYear}_${nomeLezioneSpan.textContent}.xlsx`;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Errore export registro:', err);
      alert('Errore durante la generazione del registro');
    } finally {
      btnExport.disabled = false;
      btnExport.textContent = 'Esporta Excel';
    }
  });

  // ================= Avvio =================

  if (academicYear && teacherTeachingId) {
    loadTeachingInfo();
    loadRegistro();
  } else {
    console.error('Parametri mancanti nella query string');
  }
});