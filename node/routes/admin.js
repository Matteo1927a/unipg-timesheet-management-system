const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const db = require('../config/db');
const { body, param, validationResult } = require('express-validator');

/* ============================================================================
   RECUPERO LISTA UTENTI + RUOLI
============================================================================ */
router.get(
  '/users',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.read_users']),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.docente_code,
          u.fiscal_code,
          u.is_active,
          r.id AS role_id,
          r.name AS role_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        ORDER BY u.last_name, u.first_name, r.name
      `);

      // Raggruppamento utenti
      const usersMap = {};

      rows.forEach(row => {
        if (!usersMap[row.user_id]) {
          usersMap[row.user_id] = {
            id: row.user_id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            docente_code: row.docente_code,
            fiscal_code: row.fiscal_code,
            is_active: row.is_active,
            roles: []
          };
        }

        if (row.role_id) {
          usersMap[row.user_id].roles.push({
            id: row.role_id,
            name: row.role_name
          });
        }
      });

      res.json({
        success: true,
        users: Object.values(usersMap)
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero della lista utenti'
      });
    }
  }
);


/* ============================================================================
   ATTIVA / DISATTIVA UTENTE
============================================================================ */
router.patch(
  '/users/:id/toggle',
  authMiddleware, 
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.active_users']), 
  param('id').isInt().withMessage('ID utente non valido'), 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const userId = req.params.id;

      // Recupera lo stato attuale dell'utente
      const [rows] = await db.query(
        'SELECT is_active FROM users WHERE id = ?',
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Utente non trovato' });
      }

      // Inverte lo stato
      const newStatus = rows[0].is_active ? 0 : 1;

      // Aggiorna la tabella
      await db.query(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [newStatus, userId]
      );

      res.json({
        success: true,
        message: `Utente ${newStatus ? 'attivato' : 'disattivato'} con successo`,
        is_active: newStatus
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento utente' });
    }
  }
);

/* ============================================================================
   RECUPERO LISTA RUOLI
============================================================================ */

router.get(
  '/roles',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.read_roles']),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT id, name, description
        FROM roles
        ORDER BY name
      `);
      res.json({ success: true, roles: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore nel recupero ruoli' });
    }
  }
);
/* ============================================================================
   RECUPERO LISTA PERMESSI
============================================================================ */
router.get(
  '/permissions',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.read_permissions']),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          id,
          name,
          description
        FROM permissions
        ORDER BY name
      `);

      res.json({
        success: true,
        permissions: rows
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei permessi'
      });
    }
  }
);

/* ============================================================================
   MODIFICA PERMESSO
============================================================================ */
router.put(
  '/permissions/:id',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.permissions']),

  param('id').isInt().withMessage('ID permesso non valido'),
  body('name').notEmpty().withMessage('Nome permesso obbligatorio'),
  body('description').optional().isString(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const [result] = await db.query(
        `UPDATE permissions
         SET name = ?, description = ?
         WHERE id = ?`,
        [name, description || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Permesso non trovato'
        });
      }

      res.json({
        success: true,
        message: 'Permesso aggiornato con successo'
      });

    } catch (err) {
      console.error(err);

      // nome duplicato
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Esiste già un permesso con questo nome'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Errore durante l\'aggiornamento del permesso'
      });
    }
  }
);
/* ============================================================================
   ELIMINAZIONE PERMESSO
============================================================================ */
router.delete(
  '/permissions/:id',
  authMiddleware,                  
  roleMiddleware(['amministratore']), 
  permissionMiddleware(['admin.permissions']), 
  param('id').isInt().withMessage('ID permesso non valido'), 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const permissionId = req.params.id;

      // Controlla se il permesso esiste
      const [rows] = await db.query(
        'SELECT id FROM permissions WHERE id = ?',
        [permissionId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Permesso non trovato' });
      }

      // Elimina il permesso
      await db.query(
        'DELETE FROM permissions WHERE id = ?',
        [permissionId]
      );

      res.json({
        success: true,
        message: 'Permesso eliminato con successo'
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'eliminazione del permesso'
      });
    }
  }
);

/* ============================================================================
   AGGIUNGI NUOVO PERMESSO
============================================================================ */
router.post(
  '/permissions',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.permissions']),
  body('name').notEmpty().withMessage('Nome permesso obbligatorio'),
  body('description').optional(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, description } = req.body;

      // Controlla se il permesso esiste già
      const [existing] = await db.query('SELECT id FROM permissions WHERE name = ?', [name]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Permesso già esistente' });
      }

      // Inserisce nuovo permesso
      await db.query('INSERT INTO permissions (name, description) VALUES (?, ?)', [name, description]);

      res.json({ success: true, message: 'Permesso aggiunto con successo' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante l\'aggiunta del permesso' });
    }
  }
);

/* ============================================================================
  AGGIUNTA PERMESSO
============================================================================ */
router.post(
  '/roles',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.roles']),
  body('name').notEmpty().withMessage('Il nome è obbligatorio'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, description } = req.body;

    try {
      const [result] = await db.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description || null]
      );
      res.json({ success: true, message: 'Ruolo aggiunto con successo', id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante l\'aggiunta del ruolo' });
    }
  }
);

/* ============================================================================
   AGGIONRAMENTO RUOLO
============================================================================ */
router.put(
  '/roles/:id',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.roles']),
  param('id').isInt().withMessage('ID ruolo non valido'),
  body('name').notEmpty().withMessage('Il nome è obbligatorio'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { id } = req.params;
    const { name, description } = req.body;

    try {
      const [result] = await db.query(
        'UPDATE roles SET name = ?, description = ? WHERE id = ?',
        [name, description || null, id]
      );

      if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Ruolo non trovato' });

      res.json({ success: true, message: 'Ruolo aggiornato con successo' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento del ruolo' });
    }
  }
);

/* ============================================================================
   ELIMINAZIONE RUOLO
============================================================================ */
router.delete(
  '/roles/:id',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.roles']),
  param('id').isInt().withMessage('ID ruolo non valido'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { id } = req.params;

    try {
      const [result] = await db.query('DELETE FROM roles WHERE id = ?', [id]);

      if (result.affectedRows === 0)
        return res.status(404).json({ success: false, message: 'Ruolo non trovato' });

      res.json({ success: true, message: 'Ruolo eliminato con successo' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante l\'eliminazione del ruolo' });
    }
  }
);

/* ============================================================================
   RECUPERO PERMESSI DI UN RUOLO
============================================================================ */
router.get(
  '/roles/:roleId/permissions',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.read_roles']),
  async (req, res) => {
    const { roleId } = req.params;

    try {
      const [rows] = await db.query(`
        SELECT
          p.id AS permission_id,
          p.name AS permission_name,
          p.description
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = ?
        ORDER BY p.name
      `, [roleId]);

      res.json({
        success: true,
        permissions: rows.map(r => ({
          id: r.permission_id,
          name: r.permission_name,
          description: r.description
        }))
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dei permessi del ruolo'
      });
    }
  }
);

/* ============================================================================
   AGGIORNA PERMESSI DI UN RUOLO
============================================================================ */
router.put(
  '/roles/:roleId/permissions',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.permissions']),
  async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body; // Array di ID permessi

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: 'La lista dei permessi deve essere un array'
      });
    }

    try {
      // Rimuove tutte le associazioni esistenti
      await db.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      // Inserisce i nuovi permessi
      if (permissionIds.length > 0) {
        const values = permissionIds.map(pid => [roleId, pid]);
        await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
      }

      res.json({
        success: true,
        message: 'Permessi del ruolo aggiornati correttamente'
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'aggiornamento dei permessi del ruolo'
      });
    }
  }
);

/* ============================================================================
   AGGIORNA RUOLI DI UN UTENTE
============================================================================ */
router.put(
  '/users/:id/roles',
  authMiddleware,
  roleMiddleware(['amministratore']),
  permissionMiddleware(['admin.permissions']),
  async (req, res) => {

    const userId = req.params.id;
    const { roleIds } = req.body; // array di id ruoli

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {

      // 1️⃣ Rimuovo tutti i ruoli attuali
      await connection.query(
        'DELETE FROM user_roles WHERE user_id = ?',
        [userId]
      );

      // 2️⃣ Inserisco quelli nuovi
      if (roleIds && roleIds.length > 0) {

        const values = roleIds.map(roleId => [userId, roleId]);

        await connection.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Ruoli utente aggiornati con successo'
      });

    } catch (err) {

      await connection.rollback();
      console.error(err);

      res.status(500).json({
        success: false,
        message: 'Errore aggiornamento ruoli utente'
      });
    } finally {
      connection.release();
    }
  }
);






module.exports = router;