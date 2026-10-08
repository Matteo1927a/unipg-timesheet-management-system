const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function authMiddleware(req, res, next) {
   

    const token = req.cookies?.token;

    if (!token) {
      
        return res.status(401).json({ success: false, message: "Non autenticato. Effettua il login." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
     

        // Controllo che il token contenga almeno id e ruoli
        if (!decoded.id || !decoded.roles) {
     
            return res.status(401).json({ success: false, message: "Token non valido." });
        }

        // Verifico che l'utente esista ed è attivo
        const [rows] = await db.query(
            `SELECT id, first_name, last_name, email, is_active
             FROM users
             WHERE id = ?`,
            [decoded.id]
        );

        if (rows.length === 0) {
           
            return res.status(401).json({ success: false, message: "Utente non trovato." });
        }

        const user = rows[0];

        if (!user.is_active) {
        
            return res.status(403).json({ success: false, message: "Account disattivato." });
        }

        // Assegno l'utente alla request
        req.user = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            roles: decoded.roles
        };

      
        next();

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.log(`[AUTH] Token scaduto`);
            return res.status(401).json({ success: false, message: "Sessione scaduta. Effettua di nuovo il login." });
        }

        
        return res.status(401).json({ success: false, message: "Token non valido." });
    }
}

module.exports = authMiddleware;