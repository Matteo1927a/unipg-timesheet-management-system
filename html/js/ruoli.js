let allRoles = [];
let allPermissions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadRoles();
  await loadAllPermissions();
  initRoleModals();
  initRolePermissionsModal(); // inizializza il nuovo popup
});

// ===============================
// Caricamento ruoli
// ===============================
async function loadRoles() {
  try {
    const res = await fetch('/api/admin/roles', { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    allRoles = data.roles || [];
    renderRoles(allRoles);
  } catch (err) {
    console.error(err);
    alert('Errore caricamento ruoli');
  }
}

// ===============================
// Caricamento permessi globali
// ===============================
async function loadAllPermissions() {
  try {
    const res = await fetch('/api/admin/permissions', { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    allPermissions = data.permissions || [];
  } catch (err) {
    console.error('Errore caricamento permessi:', err);
    alert('Errore caricamento permessi');
  }
}

// ===============================
// Render tabella ruoli
// ===============================
function renderRoles(roles) {
  const tbody = document.getElementById('rolesTableBody');
  tbody.innerHTML = '';

  if (!roles.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-style:italic;">Nessun ruolo trovato</td></tr>`;
    return;
  }

  roles.forEach(role => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${role.name}</td>
      <td>${role.description || '-'}</td>
      <td>
        <button class="admin-btn edit admin-edit-role-btn" data-id="${role.id}">Modifica</button>
        <button class="admin-btn edit admin-edit-role-permissions-btn" data-id="${role.id}">Permessi</button>
        <button class="admin-btn delete admin-delete-role-btn" data-id="${role.id}">Elimina</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===============================
// Modali ruoli (aggiungi/modifica/elimina)
// ===============================
function initRoleModals() {
  const addRoleModal = document.getElementById('add-role-modal');
  const addRoleBtn = document.getElementById('addRoleBtn');
  const cancelNewRoleBtn = document.getElementById('cancel-new-role-btn');
  const saveNewRoleBtn = document.getElementById('save-new-role-btn');

  const editRoleModal = document.getElementById('edit-role-modal');
  const cancelEditRoleBtn = document.getElementById('cancel-edit-role-btn');
  const saveEditRoleBtn = document.getElementById('save-edit-role-btn');

  // APRI modal aggiungi ruolo
  addRoleBtn.addEventListener('click', () => {
    document.getElementById('new-role-name').value = '';
    document.getElementById('new-role-description').value = '';
    addRoleModal.classList.remove('admin-hidden');
  });

  cancelNewRoleBtn.addEventListener('click', () => addRoleModal.classList.add('admin-hidden'));
  cancelEditRoleBtn.addEventListener('click', () => editRoleModal.classList.add('admin-hidden'));

  // SALVATAGGIO NUOVO RUOLO
  saveNewRoleBtn.addEventListener('click', async () => {
    const name = document.getElementById('new-role-name').value.trim();
    const description = document.getElementById('new-role-description').value.trim();
    if (!name) return alert('Il nome del ruolo è obbligatorio');

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      addRoleModal.classList.add('admin-hidden');
      await loadRoles();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'aggiunta del ruolo');
    }
  });

  // APRI modal modifica ruolo
  document.getElementById('rolesTableBody').addEventListener('click', e => {
    const btn = e.target.closest('.admin-edit-role-btn');
    if (!btn) return;

    const role = allRoles.find(r => r.id == btn.dataset.id);
    if (!role) return;

    document.getElementById('edit-role-id').value = role.id;
    document.getElementById('edit-role-name').value = role.name;
    document.getElementById('edit-role-description').value = role.description || '';
    editRoleModal.classList.remove('admin-hidden');
  });

  // SALVATAGGIO modifica ruolo
  saveEditRoleBtn.addEventListener('click', async () => {
    const id = document.getElementById('edit-role-id').value;
    const name = document.getElementById('edit-role-name').value.trim();
    const description = document.getElementById('edit-role-description').value.trim();
    if (!name) return alert('Il nome del ruolo è obbligatorio');

    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      editRoleModal.classList.add('admin-hidden');
      await loadRoles();
    } catch (err) {
      console.error(err);
      alert('Errore durante la modifica del ruolo');
    }
  });

  // ELIMINAZIONE RUOLO
  document.getElementById('rolesTableBody').addEventListener('click', async e => {
    const deleteBtn = e.target.closest('.admin-delete-role-btn');
    if (!deleteBtn) return;

    const id = deleteBtn.dataset.id;
    if (!confirm('Sei sicuro di voler eliminare questo ruolo?')) return;

    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      await loadRoles();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione del ruolo');
    }
  });
}

// ===============================
// Modal permessi ruolo
// ===============================
function initRolePermissionsModal() {
  const modal = document.getElementById('role-permissions-modal');
  const permissionsList = document.getElementById('role-permissions-list');
  const saveBtn = document.getElementById('save-role-permissions-btn');
  const cancelBtn = document.getElementById('cancel-role-permissions-btn');

  // APRI modal
  document.getElementById('rolesTableBody').addEventListener('click', async e => {
    const btn = e.target.closest('.admin-edit-role-permissions-btn');
    if (!btn) return;

    const roleId = btn.dataset.id;
    document.getElementById('role-permissions-id').value = roleId;

    // Recupera i permessi già assegnati al ruolo
    const res = await fetch(`/api/admin/roles/${roleId}/permissions`, { credentials: 'include' });
    const data = await res.json();
    const rolePerms = data.permissions.map(p => p.id);

    // Genera lista checkbox
    permissionsList.innerHTML = allPermissions.map(p => `
      <label>
        <input type="checkbox" value="${p.id}" ${rolePerms.includes(p.id) ? 'checked' : ''}>
        ${p.name}
      </label>
    `).join('');

    modal.classList.remove('admin-hidden');
  });

  // CHIUDI modal
  cancelBtn.addEventListener('click', () => modal.classList.add('admin-hidden'));

  // SALVA modifiche
  saveBtn.addEventListener('click', async () => {
    const roleId = document.getElementById('role-permissions-id').value;
    const selectedPerms = Array.from(permissionsList.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => parseInt(cb.value));

    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
  method: 'PUT',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ permissionIds: selectedPerms })
});

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      modal.classList.add('admin-hidden');
      await loadRoles();
    } catch (err) {
      console.error(err);
      alert('Errore aggiornando i permessi del ruolo');
    }
  });
}
