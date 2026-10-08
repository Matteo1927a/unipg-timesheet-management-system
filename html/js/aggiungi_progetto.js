document.addEventListener("DOMContentLoaded", () => {
  const wpContainer = document.getElementById("resp_amm-wp-container");
  const addWpBtn = document.getElementById("resp_amm-add-wp-btn");
  const projectForm = document.getElementById("resp_amm-project-form");

  /* ===============================
     BANNER
  =============================== */
  const bannerInput = document.getElementById("project-banner");
  let selectedBanner = null;

  bannerInput.addEventListener("change", (e) => {
    selectedBanner = e.target.files[0] || null;
  });

  /* ===============================
     AGGIUNTA WP
  =============================== */
  addWpBtn.addEventListener("click", () => {
    const projectStart = document.getElementById("project-start").value;
    const projectEnd = document.getElementById("project-end").value;

    const wpDiv = document.createElement("div");
    wpDiv.classList.add("resp_amm-wp-block");

    wpDiv.innerHTML = `
      <div class="resp_amm-wp-grid">
        <label>Codice WP <span style="color:red">*</span></label>
        <input type="text" class="resp_amm-wp-code" required placeholder="Es: WP1" />

        <label>Descrizione WP</label>
        <input type="text" class="resp_amm-wp-description" placeholder="Es: Sviluppo infrastruttura digitale" />

        <label>Ore WP</label>
        <input type="number" class="resp_amm-wp-hour" placeholder="Es: 200" min="0"/>

        <label>Data Inizio Validità <span style="color:red">*</span></label>
        <input type="date" class="resp_amm-wp-start" required value="${projectStart}" />

        <label>Data Fine Validità <span style="color:red">*</span></label>
        <input type="date" class="resp_amm-wp-end" required value="${projectEnd}" />
      </div>
      <button type="button" class="resp_amm-btn-remove-wp">Rimuovi WP</button>
    `;

    wpDiv.querySelector(".resp_amm-btn-remove-wp").addEventListener("click", () => {
      if (confirm("Sei sicuro di voler rimuovere questo WP?")) wpDiv.remove();
    });

    wpContainer.appendChild(wpDiv);
  });

  /* ===============================
     BLOCCO NUMERI NEGATIVI
  =============================== */
  document.addEventListener("input", (e) => {
    if (e.target.type === "number" && e.target.value < 0) {
      e.target.value = 0;
    }
  });

  /* ===============================
     INVIO FORM
  =============================== */
  projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      /* ---- CAMPI OBBLIGATORI ---- */
      const requiredFields = [
        "project-acronym",
        "project-cup",
        "project-start",
        "project-end"
      ];

      for (let id of requiredFields) {
        if (!document.getElementById(id).value.trim()) {
          throw new Error(`Il campo obbligatorio "${id}" non può essere vuoto.`);
        }
      }

      /* ---- VALIDAZIONE CUP ---- */
      const cup = document.getElementById("project-cup").value.trim();
      const cupRegex = /^[A-Z0-9]+$/i;
      if (!cupRegex.test(cup)) {
        throw new Error("Il CUP deve contenere solo lettere e numeri.");
      }

      /* ---- VALIDAZIONE DATE PROGETTO ---- */
      const start = new Date(document.getElementById("project-start").value);
      const end = new Date(document.getElementById("project-end").value);
      if (start > end) {
        throw new Error("La data di inizio deve precedere la data di fine progetto.");
      }

      /* ===============================
         FORM DATA
      =============================== */
      const formData = new FormData();

      formData.append("name", document.getElementById("project-title").value.trim());
      formData.append("acronym", document.getElementById("project-acronym").value.trim());
      formData.append("cup_code", cup);
      formData.append("project_code", document.getElementById("project-code").value.trim());
      formData.append("entity_name", document.getElementById("project-organization").value.trim());
      formData.append("funding_entity", document.getElementById("project-funder").value.trim());
      formData.append("start_date", document.getElementById("project-start").value);
      formData.append("end_date", document.getElementById("project-end").value);

      const totalHours = document.getElementById("project-tot_hour").value;
      if (totalHours) {
        formData.append("total_hours", totalHours);
      }

      if (selectedBanner) {
        formData.append("banner", selectedBanner);
      }

      /* ===============================
         WP
      =============================== */
      const workpackages = [];
      let totaleWP = 0;

      wpContainer.querySelectorAll(".resp_amm-wp-block").forEach((wp, idx) => {
        const codice = wp.querySelector(".resp_amm-wp-code").value.trim();
        const descrizione = wp.querySelector(".resp_amm-wp-description").value.trim();
        const ore = parseInt(wp.querySelector(".resp_amm-wp-hour").value, 10) || 0;
        const wpStart = new Date(wp.querySelector(".resp_amm-wp-start").value);
        const wpEnd = new Date(wp.querySelector(".resp_amm-wp-end").value);

        if (!codice) {
          throw new Error(`Il codice WP #${idx + 1} è obbligatorio.`);
        }

        if (wpStart < start || wpEnd > end) {
          throw new Error(`Le date del WP #${idx + 1} devono rientrare nel periodo del progetto.`);
        }

        totaleWP += ore;

        workpackages.push({
          code: codice,
          description: descrizione,
          total_hours: ore,
          start_date: wp.querySelector(".resp_amm-wp-start").value,
          end_date: wp.querySelector(".resp_amm-wp-end").value
        });
      });

      if (totalHours && totaleWP > totalHours) {
        throw new Error("La somma delle ore dei WP supera il totale ore del progetto.");
      }

      formData.append("workpackages", JSON.stringify(workpackages));

      /* ===============================
         FETCH
      =============================== */
      const response = await fetch("/api/projects", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Errore durante la creazione del progetto.");
      }

      alert("Progetto creato con successo!");
      projectForm.reset();
      wpContainer.innerHTML = "";
      selectedBanner = null;

    } catch (err) {
      alert(err.message);
    }
  });
});
