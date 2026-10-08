document.addEventListener('DOMContentLoaded', async () => {
  let allPermissions = [];

  const addPermissionModal = document.getElementById('add-permission-modal');
  const addPermissionBtn = document.getElementById('addPermissionBtn');
  const cancelNewPermissionBtn = document.getElementById('cancel-new-permission-btn');
  const saveNewPermissionBtn = document.getElementById('save-new-permission-btn');

  const editPermissionModal = document.getElementById('edit-permission-modal');
  const cancelEditPermissionBtn = document.getElementById('cancel-edit-permission-btn');
  const saveEditPermissionBtn = document.getElementById('save-edit-permission-btn');

  // APRI modal aggiungi
  addPermissionBtn.addEventListener('click', () => {
    document.getElementById('new-permission-name').value = '';
    document.getElementById('new-permission-description').value = '';
    addPermissionModal.classList.remove('admin-hidden');
  });

  cancelNewPermissionBtn.addEventListener('click', () => {
    addPermissionModal.classList.add('admin-hidden');
  });

  saveNewPermissionBtn.addEventListener('click', async () => {
    const name = document.getElementById('new-permission-name').value.trim();
    const description = document.getElementById('new-permission-description').value.trim();

    if (!name) return alert('Il nome del permesso è obbligatorio');

    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      addPermissionModal.classList.add('admin-hidden');
      await loadPermissions();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'aggiunta del permesso');
    }
  });

  // APRI modal modifica
  document.getElementById('permissionsTableBody').addEventListener('click', e => {
    const btn = e.target.closest('.admin-edit-permission-btn');
    if (!btn) return;

    const permission = allPermissions.find(p => p.id == btn.dataset.id);
    if (!permission) return;

    document.getElementById('edit-permission-id').value = permission.id;
    document.getElementById('edit-permission-name').value = permission.name;
    document.getElementById('edit-permission-description').value = permission.description || '';

    editPermissionModal.classList.remove('admin-hidden');
  });

  cancelEditPermissionBtn.addEventListener('click', () => {
    editPermissionModal.classList.add('admin-hidden');
  });

  saveEditPermissionBtn.addEventListener('click', async () => {
    const id = document.getElementById('edit-permission-id').value;
    const name = document.getElementById('edit-permission-name').value.trim();
    const description = document.getElementById('edit-permission-description').value.trim();

    if (!name) return alert('Il nome del permesso è obbligatorio');

    try {
      const res = await fetch(`/api/admin/permissions/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      editPermissionModal.classList.add('admin-hidden');
      await loadPermissions();
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio del permesso');
    }
  });

  // CARICAMENTO PERMESSI
  async function loadPermissions() {
    try {
      const res = await fetch('/api/admin/permissions', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      allPermissions = data.permissions || [];
      renderPermissions(allPermissions);
    } catch (err) {
      console.error(err);
      alert('Errore caricamento permessi');
    }
  }

  // RENDER TABELLA
  function renderPermissions(permissions) {
    const tbody = document.getElementById('permissionsTableBody');
    tbody.innerHTML = '';
    if (!permissions.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; font-style:italic;">Nessun permesso trovato</td></tr>`;
      return;
    }
    permissions.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.description || '-'}</td>
        <td>
          <button class="admin-btn edit admin-edit-permission-btn" data-id="${p.id}">Modifica</button>
          <button class="admin-btn delete admin-delete-permission-btn" data-id="${p.id}">Elimina</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // RICERCA PER NOME
const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', () => {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filteredPermissions = allPermissions.filter(p =>
    p.name.toLowerCase().includes(searchTerm)
  );

  renderPermissions(filteredPermissions);
});

  // ELIMINAZIONE
  document.getElementById('permissionsTableBody').addEventListener('click', async e => {
    const btn = e.target.closest('.admin-delete-permission-btn');
    if (!btn) return;

    if (!confirm('Sei sicuro di voler eliminare questo permesso?')) return;

    try {
      const res = await fetch(`/api/admin/permissions/${btn.dataset.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      await loadPermissions();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione del permesso');
    }
  });

  await loadPermissions();
});