document.addEventListener("DOMContentLoaded", () => {
  let startYear = 2025;
  let currentAcademicYear = `${startYear}/${startYear + 1}`;

  let diario = [];
  let diarioBackup = [];

  const tbody = document.getElementById("diario-body");

  // -----------------------
  // FORMATTA ORE → H:MM
  // -----------------------
  function formatHours(value) {
    const num = Number(value) || 0;
    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  function parseHours(value) {
  if (!value) return 0;

  if (value.includes(":")) {
    const [h, m] = value.split(":").map(Number);
    return h + (m || 0) / 60;
  }

  return Number(value) || 0;
}

  // -----------------------
  // ANNO ACCADEMICO
  // -----------------------
  function updateYearDisplay() {
    const endYearShort = String(startYear + 1).slice(-2);
    currentAcademicYear = `${startYear}/${endYearShort}`;
    document.getElementById("current-academic-year").textContent = currentAcademicYear;
  }

  document.getElementById("prev-year").addEventListener("click", () => {
    startYear--;
    updateYearDisplay();
    loadDiario();
  });

  document.getElementById("next-year").addEventListener("click", () => {
    startYear++;
    updateYearDisplay();
    loadDiario();
  });

  updateYearDisplay();

  // -----------------------
  // CARICAMENTO DIARIO
  // -----------------------
  async function loadDiario() {
    tbody.innerHTML = "";

    try {
      const res = await fetch(
        `/api/diary/academic-year?academicYear=${currentAcademicYear}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!data.success) {
        alert("Errore caricamento dati");
        return;
      }

      diario = data.data;
      diarioBackup = diario.map(r => ({ annual_hours: r.annual_hours }));

      diario.forEach((r, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${r.activity_name}</td>
          <td style="text-align:center">${formatHours(r.timesheet_hours)}</td>

         <td style="text-align:center">
  <input
    type="text"
    class="annual-hours-input"
    value="${r.annual_hours > 0 ? formatHours(r.annual_hours) : ''}"
    data-index="${index}"
  />
</td>

          <td style="text-align:center" class="somma-ore">
            ${formatHours(Number(r.timesheet_hours) + Number(r.annual_hours))}
          </td>
        `;

        tbody.appendChild(tr);
      });

      const trTot = document.createElement("tr");
      trTot.innerHTML = `
        <td colspan="3" style="text-align:right;font-weight:bold">Totale complessivo:</td>
        <td id="totale-ore-generale" style="text-align:center;font-weight:bold"></td>
      `;
      tbody.appendChild(trTot);

      updateTotaleGenerale();

    } catch (err) {
      console.error("Errore fetch:", err);
      alert("Errore di comunicazione col server");
    }
  }

  // -----------------------
  // INPUT ORE ANNUALI (LIVE)
  // -----------------------
 tbody.addEventListener("input", (e) => {
  if (!e.target.classList.contains("annual-hours-input")) return;

  const index = Number(e.target.dataset.index);
  let raw = e.target.value;

 
if (!/^(\d{1,2})?(:\d{0,2})?$/.test(raw)) {
  e.target.value = raw.slice(0, -1);
  return;
}
  const newHours = raw === "" ? 0 : parseHours(raw, 10);

  // aggiorna stato
  diario[index].annual_hours = newHours;

  // aggiorna somma riga
  const tr = e.target.closest("tr");
  tr.querySelector(".somma-ore").textContent = formatHours(
    Number(diario[index].timesheet_hours) + newHours
  );


    updateTotaleGenerale();
  });

  // -----------------------
  // TOTALE GENERALE
  // -----------------------
  function updateTotaleGenerale() {
    const totale = diario.reduce(
      (sum, r) => sum + Number(r.timesheet_hours) + Number(r.annual_hours),
      0
    );
    document.getElementById("totale-ore-generale").textContent = formatHours(totale);
  }

  // -----------------------
  // ANNULLA MODIFICHE (SOLO FRONTEND)
  // -----------------------
  document.getElementById("annul-btn").addEventListener("click", () => {
    if (!diario.some((r, i) => r.annual_hours !== diarioBackup[i].annual_hours)) {
      alert("Nessuna modifica da annullare.");
      return;
    }

    if (confirm("Sei sicuro di voler annullare le modifiche?")) {
      diario.forEach((r, i) => {
        r.annual_hours = diarioBackup[i].annual_hours;

        const input = tbody.querySelector(`input[data-index="${i}"]`);
        if (input) {
         input.value = r.annual_hours > 0 ? formatHours(r.annual_hours) : '';
tr.querySelector(".somma-ore").textContent =
  formatHours(Number(r.timesheet_hours) + r.annual_hours);
        }
      });

      updateTotaleGenerale();
      alert("Modifiche annullate.");
    }
  });

  // -----------------------
  // SALVA TUTTO
  // -----------------------
  document.getElementById("save-btn").addEventListener("click", async () => {
    if (!confirm("Vuoi salvare definitivamente le modifiche al diario?")) return;

    for (let i = 0; i < diario.length; i++) {
      const newHours = diario[i].annual_hours;
      const oldHours = diarioBackup[i].annual_hours;

      if (newHours !== oldHours) {
        try {
          const res = await fetch(`/api/diary/annual-entry`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              diaryActivityId: diario[i].diary_activity_id,
              academicYear: currentAcademicYear,
              hours: newHours
            })
          });

          const data = await res.json();

          if (data.success === false && data.code === 'ACADEMIC_YEAR_LIMIT_EXCEEDED') {
            const d = data.details;
            alert(
              `Superamento limite ore didattiche per l'anno ${currentAcademicYear}!\n` +
              `Limite massimo: ${d.limit}\n` +
              `Ore già utilizzate: ${d.used_before}\n` +
              `Ore dopo inserimento: ${d.used_after}\n` +
              `Ore rimanenti: ${d.remaining_after}`
            );
            return;
          }

          if (data.success === false && data.code === 'ACADEMIC_YEAR_TOTAL_LIMIT_EXCEEDED') {
            const d = data.details;
            alert(
              ` Superamento limite ANNUALE complessivo!\n\n` +
              `Limite massimo: ${d.limit}\n` +
              `Ore già utilizzate: ${d.used_before}\n` +
              `Ore dopo inserimento: ${d.used_after}\n` +
              `Ore residue: ${d.remaining_after < 0 ? 0 : d.remaining_after}`
            );
            return;
          }

          if (!data.success) {
            alert("Errore durante il salvataggio.");
            return;
          }

        } catch (err) {
          console.error("Errore salvataggio:", err);
          alert("Errore di comunicazione col server");
          return;
        }
      }
    }

    diarioBackup = diario.map(r => ({ annual_hours: r.annual_hours }));
    alert("Salvataggio completato.");
  });

  // -----------------------
  loadDiario();
});
