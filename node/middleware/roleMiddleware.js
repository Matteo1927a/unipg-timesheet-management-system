function roleMiddleware(allowedRoles = []) {
    return (req, res, next) => {
        //Controllo se l'utente è autenticato 
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Utente non autenticato." });
        }
        // Ora prendiamo l'array di ruoli dall'utente 
        const userRoles = req.user.roles || [];
        if (userRoles.length === 0) {
            return res.status(403).json({ success: false, message: "Ruolo utente non trovato." });
        }
        // Controllo se almeno un ruolo dell'utente è autorizzato 
        const authorized = userRoles.some(role => allowedRoles.includes(role));
        if (!authorized) { return res.status(403).json({ success: false, message: "Accesso negato: ruolo non autorizzato." }); }
        // Tutto ok, procedi 
        next();
    };
    
}
module.exports = roleMiddleware;