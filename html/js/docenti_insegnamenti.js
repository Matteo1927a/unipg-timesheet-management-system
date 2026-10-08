document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('import-assignments-form');
  const fileInput = document.getElementById('excel-file');
  const previewBtn = document.getElementById('preview-btn');
  const previewContainer = document.getElementById('preview-output');

  // FUNZIONE DI UPLOAD
  const uploadFile = async (preview = false) => {
    if (!fileInput.files.length) {
      alert('Seleziona un file Excel prima di procedere.');
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = preview 
      ? '/api/didattica/import-teacher-assignments?preview=true'
      : '/api/didattica/import-teacher-assignments';

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();

      previewContainer.innerHTML = ''; // pulisco

      if (preview) {
        if (data.preview && data.preview.length) {
          const table = document.createElement('table');
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          table.style.marginTop = '10px';

          // Intestazione
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          ['Riga', 'Docente', 'Codice Insegnamento', 'Nome Insegnamento', 'Ore previste', 'Periodo', 'Anno Offerta']
            .forEach(text => {
              const th = document.createElement('th');
              th.textContent = text;
              th.style.border = '1px solid #ccc';
              th.style.padding = '4px';
              th.style.backgroundColor = '#f0f0f0';
              headerRow.appendChild(th);
            });
          thead.appendChild(headerRow);
          table.appendChild(thead);

          const tbody = document.createElement('tbody');
          data.preview.forEach(item => {
            const tr = document.createElement('tr');
            [item.row, item.docente, item.codiceInsegnamento, item.nomeInsegnamento, item.orePreviste, item.periodo, item.annoOfferta]
              .forEach(val => {
                const td = document.createElement('td');
                td.textContent = val ?? '';
                td.style.border = '1px solid #ccc';
                td.style.padding = '4px';
                tr.appendChild(td);
              });
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          previewContainer.appendChild(table);
        } else {
          previewContainer.textContent = 'Nessun dato trovato nell\'Excel.';
        }
      } else {
        // Import reale
        previewContainer.textContent = `${data.success ? 'Import completato!' : 'Errore'}\n` +
                                       (data.errors && data.errors.length ? JSON.stringify(data.errors, null, 2) : '');
      }

    } catch (err) {
      console.error(err);
      previewContainer.textContent = 'Errore durante il caricamento del file.';
    }
  };

  // Submit reale per l'import
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await uploadFile(false);
  });

  // Bottone preview
  previewBtn.addEventListener('click', async () => {
    await uploadFile(true);
  });
});
