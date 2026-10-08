document.addEventListener('DOMContentLoaded', async () => {

  let allUsers = [];
  let allRoles = [];
  let CURRENT_USER_ID = null;

  /* ===============================
     LOAD USERS
  =============================== */
  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`Errore caricamento utenti`);

      const data = await res.json();
      return data.users;

    } catch (err) {
      console.error(err);
      return [];
    }
  }

  /* ===============================
     LOAD ALL ROLES
  =============================== */
  async function loadRoles() {
    try {
      const res = await fetch('/api/admin/roles', {
        credentials: 'include'
      });

      const data = await res.json();
      allRoles = data.roles || [];

    } catch (err) {
      console.error("Errore loadRoles:", err);
      allRoles = [];
    }
  }

  /* ===============================
     TOGGLE USER
  =============================== */
  async function toggleUser(userId, isActive) {

    const action = isActive ? 'disattivare' : 'attivare';
    if (!confirm(`Sei sicuro di voler ${action} questo utente?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });

      const data = await res.json();
      alert(data.message);

      allUsers = await loadUsers();
      renderUsers(allUsers);

    } catch (err) {
      alert('Errore aggiornamento stato utente');
    }
  }

 

  /* ===============================
     OPEN USER ROLES MODAL
  =============================== */
  async function openUserRolesModal(userId) {

    CURRENT_USER_ID = userId;

    const user = allUsers.find(u => u.id == userId);
    if (!user) return;

    await loadRoles();

    const container = document.getElementById('user-roles-list');
    container.innerHTML = '';

    const userRoleIds = user.roles.map(r => r.id);

    allRoles.forEach(role => {

      const checked = userRoleIds.includes(role.id) ? 'checked' : '';

      container.innerHTML += `
        <div>
          <label>
            <input type="checkbox" value="${role.id}" ${checked}>
            ${role.name}
          </label>
        </div>
      `;
    });

    document.getElementById('user-roles-modal')
      .classList.remove('admin-hidden');
  }

  /* ===============================
     SAVE USER ROLES
  =============================== */
  async function saveUserRoles() {

    const checkboxes = document.querySelectorAll(
      '#user-roles-list input[type="checkbox"]:checked'
    );

    const selectedRoleIds = Array.from(checkboxes)
      .map(cb => parseInt(cb.value));

    try {

      const res = await fetch(
        `/api/admin/users/${CURRENT_USER_ID}/roles`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roleIds: selectedRoleIds
          })
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert('Errore aggiornamento ruoli');
        return;
      }

      alert('Ruoli aggiornati con successo');

      document.getElementById('user-roles-modal')
        .classList.add('admin-hidden');

      // 🔥 Ricarico utenti senza refresh pagina
      allUsers = await loadUsers();
      renderUsers(allUsers);

    } catch (err) {
      alert('Errore salvataggio ruoli');
    }
  }

  /* ===============================
     RENDER USERS
  =============================== */
  function renderUsers(users) {

    const tbody = document.querySelector('#adminTable tbody');
    tbody.innerHTML = '';

    if (!users.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; font-style:italic;">
            Nessun utente trovato
          </td>
        </tr>
      `;
      return;
    }

    users.forEach(user => {

      const rolesHtml = user.roles && user.roles.length
        ? user.roles.map(r => r.name).join(', ')
        : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.first_name}</td>
        <td>${user.last_name}</td>
        <td>${user.email}</td>
        <td>${user.docente_code || '-'}</td>
        <td>${user.fiscal_code || '-'}</td>
        <td>${rolesHtml}</td>
        <td>
          <span class="status ${user.is_active ? 'active' : 'inactive'}">
            ${user.is_active ? 'Attivo' : 'Disattivato'}
          </span>
        </td>
        <td>
          <button onclick="toggleUser(${user.id}, ${user.is_active})">
            ${user.is_active ? 'Disattiva' : 'Attiva'}
          </button>

          <button onclick="openUserRolesModal(${user.id})">
            Ruoli
          </button>

      
      `;
      tbody.appendChild(tr);
    });
  }

  /* ===============================
     SEARCH
  =============================== */
  const searchInput = document.getElementById('search-input');

  searchInput.addEventListener('input', () => {

    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredUsers = allUsers.filter(user =>
      user.first_name.toLowerCase().includes(searchTerm) ||
      user.last_name.toLowerCase().includes(searchTerm) ||
      (user.fiscal_code &&
       user.fiscal_code.toLowerCase().includes(searchTerm))
    );

    renderUsers(filteredUsers);
  });

  /* ===============================
     MODAL BUTTONS
  =============================== */
  document.getElementById('save-user-roles-btn')
    .addEventListener('click', saveUserRoles);

  document.getElementById('close-user-roles-btn')
    .addEventListener('click', () => {
      document.getElementById('user-roles-modal')
        .classList.add('admin-hidden');
    });

  /* ===============================
     INIT
  =============================== */
  allUsers = await loadUsers();
  renderUsers(allUsers);

  window.toggleUser = toggleUser;

  window.openUserRolesModal = openUserRolesModal;

});






