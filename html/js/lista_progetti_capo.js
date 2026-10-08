document.addEventListener("DOMContentLoaded", () => {

  const tbody = document.getElementById("projlist-tbody");
  const searchInput = document.getElementById("projlist-search-input");

  // Funzione per formattare le date (YYYY-MM-DD -> DD/MM/YYYY)
  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Recupera i progetti dal backend
  async function fetchProjects() {
    try {
      const response = await fetch("/api/projects/lista_progetti_capo_progetto", { credentials: "include" });
      const data = await response.json();

      if (!data.success) {
        console.error("Errore caricamento progetti:", data.message);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777;">Errore caricamento progetti.</td></tr>`;
        return [];
      }

      // Mapping DB ->frontend
      return data.projects.map(p => ({
        id: p.id,
        name: p.name || "-",
        acronym: p.acronym || "-",
        cup: p.cup_code || "-",
        code: p.project_code || "-",
        period: `${formatDate(p.start_date)} - ${formatDate(p.end_date)}`,
        status: p.status || "-"
      }));

    } catch (err) {
      console.error("Errore caricamento progetti:", err);
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777;">Errore caricamento progetti.</td></tr>`;
      return [];
    }
  }

  // Rendering tabella
  function renderProjects(projects) {
    tbody.innerHTML = "";
    const searchValue = searchInput.value.toLowerCase();

    const filtered = projects.filter(p =>
      p.name.toLowerCase().includes(searchValue)
    );

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Nessun progetto trovato.";
      td.style.textAlign = "center";
      td.style.color = "#777";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach(proj => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="projlist-name">
          <a href="capo_progetto_ore.html?id=${proj.id}">${proj.name}</a>
        </td>
        <td>${proj.acronym}</td>
        <td>${proj.cup}</td>
        <td>${proj.code}</td>
        <td>${proj.period}</td>
        <td><span class="projlist-status ${proj.status}">${proj.status}</span></td>
      `;

      tbody.appendChild(tr);
    });
  }

  let projects = [];

  // Inizializzazione
  (async () => {
    projects = await fetchProjects();
    renderProjects(projects);
  })();

  // Ricerca live
  searchInput.addEventListener("input", () => renderProjects(projects));

});