document.addEventListener("DOMContentLoaded", async () => {
    const welcomeEl = document.getElementById("welcomeUser");
    const roleEl = document.getElementById("userRole");
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutIcon = document.getElementById("logoutIcon");


 const roleLabels = {
    docente: "Docente",
    capo_progetto: "Capo progetto",
    responsabile_amministrativo: "Resp. amministrativo",
    responsabile_didattica: "Resp. didattica",
    amministratore: "Amministratore"
};

    // Funzione logout
    async function doLogout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = "/index.html";
        } catch (err) {o
            console.error("Errore durante il logout:", err);
            alert("Errore durante il logout, riprova.");
        }
    }

    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
    if (logoutIcon) logoutIcon.addEventListener("click", doLogout);

    // Fetch info utente
    try {
        const res = await fetch('/api/user/me', { credentials: 'include' });
        if (!res.ok) throw new Error("Token mancante o scaduto");

        const data = await res.json();
        const user = data.user;

        const capoProgettiLink = document.getElementById("capoProgettiLink");

if (capoProgettiLink && user.roles.includes("capo_progetto")) {
    capoProgettiLink.classList.remove("hidden");
}

        // --- Mostra nome utente ---
        if (welcomeEl) {
            welcomeEl.textContent = `Benvenuto/a, ${user.first_name} ${user.last_name}`;
        }

        // --- Mostra ruolo ---

if (roleEl) {
    let userRole = null;

    // Se l'utente ha sia docente che capo_progetto, mostro capo_progetto
    if (user.roles.includes("capo_progetto") && user.roles.includes("docente")) {
        userRole = "capo_progetto";
    } else {
        // Altrimenti prendo il primo ruolo 
        userRole = user.roles[0];
    }

    const niceRole = roleLabels[userRole] || userRole;
    roleEl.textContent = `(${niceRole})`;
}
       

    } catch (err) {
        console.error("Impossibile ottenere le info dell'utente:", err);
        window.location.href = "/index.html";
    }
});
