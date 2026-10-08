document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include' 
            });

            const data = await response.json();

            if (!data.success) {
                alert(data.message || "Login fallito");
                return;
            }

            // Controllo ruoli
      if (data.roles.includes("docente")) {
    window.location.href = "/timesheet.html";
} else if (data.roles.includes("responsabile_amministrativo")) {
    window.location.href = "/lista_progetti.html";
} else if (data.roles.includes("capo_progetto")) {
    window.location.href = "/timesheet.html"; 
} else if (data.roles.includes("responsabile_didattica")) {
    window.location.href = "/didattica.html"; 
} else if (data.roles.includes("amministratore")) {
    window.location.href = "/admin_gestione_utenti.html"; 
} else {
    alert("Ruolo sconosciuto");
}

        } catch (err) {
            console.error('Errore server:', err);
            alert("Errore server, riprova");
        }
    });

    // Logout
    const logoutLink = document.getElementById('logoutLink');
    if(logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();

            await fetch('/api/auth/logout', { 
                method: 'POST', 
                credentials: 'include' 
            });

            window.location.href = '/index.html';
        });
    }
});