const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// --- LOGIN ---
router.post('/login', 
    [
        body('email').isEmail().withMessage('Inserisci un indirizzo email valido'),
        body('password').notEmpty().withMessage('La password non può essere vuota')
    ], 
    async (req, res) => {

        console.log(`[REQUEST] ${req.method} ${req.url}`);

        // Controllo errori di validazione
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(`[LOGIN] Errore di validazione:`, errors.array());
            return res.status(400).json({ 
                success: false, 
                message: 'Errore di validazione',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        try {
            // recupero utente + ruoli
            const [rows] = await db.query(
                `SELECT u.id, u.first_name, u.last_name, u.email, u.password, u.is_active, r.name AS role
                 FROM users u
                 LEFT JOIN user_roles ur ON u.id = ur.user_id
                 LEFT JOIN roles r ON ur.role_id = r.id
                 WHERE u.email = ?`,
                [email]
            );

            if (rows.length === 0) {
                console.log(`[LOGIN] Tentativo fallito: email ${email} non trovata`);
                return res.status(401).json({ success: false, message: "Credenziali non valide" });
            }

            const user = rows[0];

            if (!user.is_active) {
                console.log(`[LOGIN] Utente ${email} disattivato`);
                return res.status(403).json({ success: false, message: "Account disattivato" });
            }

            const pwMatch = await bcrypt.compare(password, user.password);
            if (!pwMatch) {
                console.log(`[LOGIN] Tentativo fallito: password non corretta per utente ${email}`);
                return res.status(401).json({ success: false, message: "Credenziali non valide" });
            }

            // tutti i ruoli
            const roles = rows.map(r => r.role).filter(Boolean);

            const token = jwt.sign(
                { id: user.id, roles: roles, first_name: user.first_name, last_name: user.last_name },
                JWT_SECRET,
                { expiresIn: "2h" }
            );

            // Imposto il cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: false,      
                sameSite: "lax",
                maxAge: 2 * 60 * 60 * 1000
            });

            console.log(`[LOGIN] Utente ${email} loggato, ID: ${user.id}`);
            console.log(`[LOGIN] Token JWT generato`);
            console.log(`[LOGIN] Cookie impostato: httpOnly=true, secure=false, sameSite=lax`);

            res.json({ success: true, message: "Login effettuato", roles });

        } catch (err) {
            console.error("[LOGIN] Errore login:", err);
            res.status(500).json({ success: false, message: "Errore interno del server" });
        }
    }
);

// --- LOGOUT ---
router.post('/logout', authMiddleware, (req, res) => {
    console.log(`[LOGOUT] Utente ID ${req.user?.id} esegue logout`);
    
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,      // deve corrispondere al cookie impostato
        sameSite: "lax"
    });

    res.json({ success: true, message: "Logout effettuato" });
});

module.exports = router;
