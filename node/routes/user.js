const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');

// --- Recupera profilo utente loggato ---
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT r.name AS role
             FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id = ?`,
            [userId]
        );

        const roles = rows.map(r => r.role);

        res.json({
            success: true,
            user: {
                id: req.user.id,
                first_name: req.user.first_name,
                last_name: req.user.last_name,
                email: req.user.email,
                roles: roles
            }
        });

    } catch (err) {
        console.error("Errore getProfile:", err);
        res.status(500).json({ success: false, message: "Errore interno del server" });
    }
});

module.exports = router;