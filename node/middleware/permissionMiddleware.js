const db = require('../config/db');

function permissionMiddleware(requiredPermissions = []) {
    return async (req, res, next) => {

        // 1. Controllo autenticazione
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Utente non autenticato" });
        }

        try {
            // 2. Recupera i permessi associati ai ruoli dell’utente
            const [rows] = await db.query(`
                SELECT DISTINCT p.name 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ?
            `, [req.user.id]);

            const userPermissions = rows.map(r => r.name);

            // 3. Se non sono richiesti permessi, lascia passare
            if (requiredPermissions.length === 0) {
                return next();
            }

            // 4. OR logico: almeno uno dei permessi richiesti
            const hasAny = requiredPermissions.some(p => userPermissions.includes(p));

            if (!hasAny) {
                return res.status(403).json({
                    success: false,
                    message: "Permesso negato: non possiedi i permessi necessari.",
                    missingPermissions: requiredPermissions.filter(p => !userPermissions.includes(p))
                });
            }

            next();
        } catch (err) {
            console.error("Errore permissionMiddleware:", err);
            res.status(500).json({ success: false, message: "Errore interno del server" });
        }
    };
}

module.exports = permissionMiddleware;