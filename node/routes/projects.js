const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const uploadBanner = require("../middleware/uploadProjectBanner");
const db = require('../config/db');
const { body, param, validationResult } = require('express-validator');



/* ============================================================================
   RECUPERO ANAGRAFICA UTENTI
============================================================================ */

router.get(
  '/anagrafica',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.read_anagrafica']),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          id,
          first_name,
          last_name,
          fiscal_code
        FROM users
        ORDER BY last_name, first_name
      `);

      res.json({
        success: true,
        users: rows
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero dell’anagrafica'
      });
    }
  }
);

/* ============================================================================
   CREAZIONE NUOVO RUOLO PROGETTO
============================================================================ */

router.post(
  '/project-roles',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.create_roles']),
  // Validazione input
  body('name')
    .trim()
    .notEmpty().withMessage('Il nome del ruolo è obbligatorio')
    .isLength({ max: 100 }).withMessage('Il nome del ruolo non può superare 100 caratteri'),
  async (req, res) => {
    try {
      // Controllo errori validazione
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name } = req.body;

      // Inserimento ruolo
      const [result] = await db.query(
        'INSERT INTO project_roles (name) VALUES (?)',
        [name]
      );

      res.json({
        success: true,
        role: {
          id: result.insertId,
          name: name
        }
      });

    } catch (err) {
      console.error(err);

      // Controllo duplicato
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Il ruolo esiste già'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Errore nella creazione del ruolo'
      });
    }
  }
);

/* ============================================================================
   RECUPERO LISTA PROGETTI
============================================================================ */
router.get(
  '/lista-progetti',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.read']),
  async (req, res) => {
  try {
  // Recupero dinamico ID ruolo coordinatore scientifico
  const [roles] = await db.query(
    'SELECT id FROM project_roles WHERE name = ? LIMIT 1',
    ['Coordinatore scientifico']
  );

  if (!roles.length) {
    return res.status(500).json({
      success: false,
      message: "Ruolo Coordinatore scientifico non trovato"
    });
  }

  const COORDINATORE_ROLE_ID = roles[0].id;

  const [projects] = await db.query(`
    SELECT
      p.id,
      p.name,
      p.acronym,
      p.cup_code,
      p.project_code,
      p.start_date,
      p.end_date,
      p.status,

      (
        SELECT CONCAT(u.first_name, ' ', u.last_name)
        FROM project_assignments pa
        JOIN users u ON pa.user_id = u.id
        WHERE pa.project_id = p.id
          AND pa.role_id = ?
        LIMIT 1
      ) AS coordinatore_scientifico

    FROM projects p
    ORDER BY p.name
  `, [COORDINATORE_ROLE_ID]);

  res.json({
    success: true,
    projects
  });

} catch (err) {
  console.error("Errore recupero progetti:", err);
  res.status(500).json({
    success: false,
    message: "Errore interno server"
  });
}
  }
);

/* ============================================================================
   RECUPERO LISTA PROGETTI
============================================================================ */
router.get(
  '/lista_progetti_capo_progetto',
  authMiddleware,
  roleMiddleware(['capo_progetto']),
  permissionMiddleware(['projects.read.capoprogetto']),
  async (req, res) => {
    try {
      // Recupero dinamico ID ruolo coordinatore scientifico
      const [roles] = await db.query(
        'SELECT id FROM project_roles WHERE name = ? LIMIT 1',
        ['Coordinatore scientifico']
      );

      if (!roles.length) {
        return res.status(500).json({ message: "Ruolo coordinatore non trovato" });
      }

      const COORDINATORE_ROLE_ID = roles[0].id;

      // Recupero progetti dove l'utente loggato è coordinatore scientifico
      const [projects] = await db.query(
        `SELECT
           p.id,
           p.name,
           p.acronym,
           p.cup_code,
           p.project_code,
           p.start_date,
           p.end_date,
           p.status
         FROM projects p
         JOIN project_assignments pa
           ON pa.project_id = p.id
         WHERE pa.user_id = ?
           AND pa.role_id = ?
         ORDER BY p.name`,
        [req.user.id, COORDINATORE_ROLE_ID]
      );

      res.json({
        success: true,
        projects
      });

    } catch (err) {
      console.error("Errore recupero progetti capo:", err);
      res.status(500).json({
        success: false,
        message: "Errore interno server"
      });
    }
  }
);

/* ============================================================================
   RECUPERO RUOLI UTENTI NEI PROGETTI
============================================================================ */
router.get(
  '/project_roles',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.read']), 
 
  async (req, res) => {
    try {
      const [roles] = await db.query(`SELECT id, name FROM project_roles ORDER BY name`);
      res.json({
        success: true,
        roles: roles.map(r => ({ id: r.id, name: r.name }))
      });
    } catch (err) {
      console.error("Errore recupero ruoli:", err);
      res.status(500).json({ success: false, message: "Errore interno server" });
    }
  }
);


/* ============================================================================
   CREAZIONE NUOVO PROGETTO CON WORK PACKAGES E BANNER
============================================================================ */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.create']),
  uploadBanner.single('banner'),
  [
    body('acronym').notEmpty().withMessage("L'acronimo è obbligatorio"),
    body('cup_code').notEmpty().withMessage("Il codice CUP è obbligatorio"),
    body('start_date').isISO8601().withMessage("Data inizio non valida"),
    body('end_date').isISO8601().withMessage("Data fine non valida"),
    body('total_hours').optional().isFloat({ min: 0 }),
    body('workpackages').optional(),
    body('workpackages.*.code').notEmpty().withMessage("Codice WP obbligatorio"),
    body('workpackages.*.start_date').isISO8601().withMessage("Data inizio WP non valida"),
    body('workpackages.*.end_date').isISO8601().withMessage("Data fine WP non valida"),
    body('workpackages.*.total_hours').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    try {
      // --- PARSING WORKPACKAGES SE ARRIVA COME STRINGA ---
      if (req.body.workpackages && typeof req.body.workpackages === 'string') {
        try {
          req.body.workpackages = JSON.parse(req.body.workpackages);
        } catch (err) {
          return res.status(400).json({ success: false, message: "workpackages non valido" });
        }
      }

      // --- VALIDAZIONE ---
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        name,
        acronym,
        cup_code,
        project_code,
        start_date,
        end_date,
        status = 'aperto',
        funding_entity,
        entity_name,
        total_hours,
        workpackages = []
      } = req.body;

      // --- CONTROLLO DATE WP ---
      for (const wp of workpackages) {
        const wpStart = new Date(wp.start_date);
        const wpEnd = new Date(wp.end_date);
        const projStart = new Date(start_date);
        const projEnd = new Date(end_date);

        if (wpStart < projStart || wpEnd > projEnd) {
          return res.status(400).json({
            success: false,
            message: `Le date del WP "${wp.code}" devono rientrare nel periodo del progetto`
          });
        }
      }

      const bannerPath = req.file
        ? `/uploads/project_banners/${req.file.filename}`
        : null;

      const conn = await db.getConnection();
      await conn.beginTransaction();

      // --- INSERIMENTO PROGETTO ---
      const [projResult] = await conn.query(`
        INSERT INTO projects
          (name, acronym, cup_code, project_code, start_date, end_date,
           status, funding_entity, entity_name, total_hours, banner_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name || null,
        acronym,
        cup_code,
        project_code || null,
        start_date,
        end_date,
        status,
        funding_entity || null,
        entity_name || null,
        total_hours || null,
        bannerPath
      ]);

      const projectId = projResult.insertId;

      // --- INSERIMENTO WORKPACKAGES ---
      for (const wp of workpackages) {
        await conn.query(`
          INSERT INTO project_workpackages
            (project_id, code, description, start_date, end_date, total_hours)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          projectId,
          wp.code,
          wp.description || '',
          wp.start_date,
          wp.end_date,
          wp.total_hours || 0
        ]);
      }

      await conn.commit();
      res.json({ success: true, projectId });

    } catch (err) {
      if (req.conn) await req.conn.rollback();
      console.error("Errore creazione progetto:", err);
      res.status(500).json({ success: false, message: "Errore interno server" });
    } finally {
      if (req.conn) req.conn.release();
    }
  }
);

/* ============================================================================
   RECUPERO DETTAGLI COMPLETI DI UN PROGETTO
============================================================================ */
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
 permissionMiddleware(['projects.view_details']),
  param('id').isInt({ min: 1 }).withMessage('ID progetto non valido'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const projectId = req.params.id;

    try {
      const [projects] = await db.query(
        `SELECT * FROM projects WHERE id = ?`,
        [projectId]
      );

      if (!projects.length) {
        return res.status(404).json({ success: false, message: "Progetto non trovato" });
      }

      const project = projects[0];

  const [resources] = await db.query(
  `SELECT 
    pa.id AS assignment_id,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.fiscal_code,

    pa.role_id,                
    pr.name AS role_name,

    pa.start_date,
    pa.end_date,
    pa.assigned_hours
FROM project_assignments pa
JOIN users u ON pa.user_id = u.id
LEFT JOIN project_roles pr ON pa.role_id = pr.id
WHERE pa.project_id = ?
ORDER BY u.last_name, u.first_name`,
  [projectId]
);

      const [workpackages] = await db.query(
        `SELECT *
         FROM project_workpackages
         WHERE project_id = ?
         ORDER BY code`,
        [projectId]
      );

      const [wpAssignments] = await db.query(
        `SELECT
            wpa.user_id,
            wpa.workpackage_id,
            wpa.assigned_hours,
            wpa.start_date,
            wpa.end_date
         FROM workpackage_assignments wpa
         JOIN project_workpackages wp ON wpa.workpackage_id = wp.id
         WHERE wp.project_id = ?`,
        [projectId]
      );

      const resourcesWithWP = resources.map(r => ({
        ...r,
        wpAssignments: wpAssignments.filter(a => a.user_id === r.user_id)
      }));

     res.json({
  success: true,
  project: {
    ...project,
    start_date: normalizeDate(project.start_date),
    end_date: normalizeDate(project.end_date),

    risorse: resourcesWithWP.map(r => ({
      ...r,
      start_date: normalizeDate(r.start_date),
      end_date: normalizeDate(r.end_date),
      wpAssignments: r.wpAssignments.map(wp => ({
        ...wp,
        start_date: normalizeDate(wp.start_date),
        end_date: normalizeDate(wp.end_date)
      }))
    })),

    workpackages: workpackages.map(wp => ({
      ...wp,
      start_date: normalizeDate(wp.start_date),
      end_date: normalizeDate(wp.end_date)
    }))
  }
});


    } catch (err) {
      console.error("Errore recupero progetto:", err);
      res.status(500).json({ success: false, message: "Errore interno server" });
    }
  }
);

/* ============================================================================
   MODIFICA DATI ANAGRAFICI PROGETTO
============================================================================ */
router.put(
  '/:id-projects',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.update']),
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID progetto non valido'),

    body('name')
      .optional()
      .isString()
      .isLength({ max: 255 })
      .withMessage('Nome progetto non valido'),

    body('acronym')
      .optional()
      .notEmpty()
      .withMessage("L'acronimo non può essere vuoto"),

    body('cup_code')
      .optional()
      .notEmpty()
      .withMessage("Il codice CUP non può essere vuoto"),

    body('project_code')
      .optional()
      .isString()
      .withMessage("Codice progetto non valido"),

    body('start_date')
      .optional()
      .isISO8601()
      .withMessage("Data inizio non valida"),

    body('end_date')
      .optional()
      .isISO8601()
      .withMessage("Data fine non valida"),

    body('total_hours')
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Totale ore non valido"),

    body('status')
      .optional()
      .isIn(['aperto', 'rendicontato', 'chiuso'])
      .withMessage("Stato progetto non valido")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const projectId = req.params.id;
    const {
      name,
      acronym,
      cup_code,
      project_code,
      start_date,
      end_date,
      total_hours,
      status
    } = req.body;

    try {
      // --- Verifica esistenza progetto ---
      const [existing] = await db.query(
        'SELECT id, start_date, end_date FROM projects WHERE id = ?',
        [projectId]
      );

      if (!existing.length) {
        return res.status(404).json({
          success: false,
          message: 'Progetto non trovato'
        });
      }

      // --- Controllo coerenza date ---
     const newStart = start_date ?? normalizeDate(existing[0].start_date);
const newEnd   = end_date   ?? normalizeDate(existing[0].end_date);

if (newStart > newEnd) {
  return res.status(400).json({
    success: false,
    message: 'La data di inizio non può essere successiva alla data di fine'
  });
}

      // --- Update ---
      await db.query(
        `
        UPDATE projects
        SET
          name = COALESCE(?, name),
          acronym = COALESCE(?, acronym),
          cup_code = COALESCE(?, cup_code),
          project_code = COALESCE(?, project_code),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          total_hours = COALESCE(?, total_hours),
          status = COALESCE(?, status)
        WHERE id = ?
        `,
        [
          name ?? null,
          acronym ?? null,
          cup_code ?? null,
          project_code ?? null,
          start_date ?? null,
          end_date ?? null,
          total_hours ?? null,
          status ?? null,
          projectId
        ]
      );

      res.json({
        success: true,
        message: 'Progetto aggiornato correttamente'
      });

    } catch (err) {
      console.error('Errore aggiornamento progetto:', err);
      res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);

// Funzione helper per normalizzare le date (YYYY-MM-DD)
const normalizeDate = (d) => {
  if (!d) return null;
  return String(d).slice(0, 10); // YYYY-MM-DD
};

/* ============================================================================
  AGGIUNTA WP AD UN PROGETTO
============================================================================ */
router.post(
  '/:id/workpackages',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.edit_workpackages']),
  [
    param('id').isInt({ min: 1 }).withMessage('ID progetto non valido'),
    body('code').notEmpty().withMessage('Codice WP obbligatorio'),
    body('description').optional().isString(),
    body('total_hours').isFloat({ min: 0 }).withMessage('Ore WP non valide'),
    body('start_date').isISO8601().withMessage('Data inizio WP non valida'),
    body('end_date').isISO8601().withMessage('Data fine WP non valida')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const projectId = req.params.id;
    const { code, description, total_hours, start_date, end_date } = req.body;

    try {
      // Recupera date progetto
      const [projects] = await db.query('SELECT start_date, end_date FROM projects WHERE id = ?', [projectId]);
      if (!projects.length) return res.status(404).json({ success: false, message: 'Progetto non trovato' });

      const proj = projects[0];

      // Controllo date WP nel periodo progetto (solo YYYY-MM-DD)
 if (
  normalizeDate(start_date) < normalizeDate(proj.start_date) ||
  normalizeDate(end_date) > normalizeDate(proj.end_date)
) {
  return res.status(400).json({
    success: false,
    message: 'Le date del WP devono rientrare nel periodo del progetto'
  });
}


      const [result] = await db.query(`
        INSERT INTO project_workpackages
          (project_id, code, description, start_date, end_date, total_hours)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [projectId, code, description || '', start_date, end_date, total_hours]);

      res.json({ success: true, workpackageId: result.insertId });

    } catch (err) {
      console.error('Errore creazione WP:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);

/* ============================================================================
   MODIFICA WP
============================================================================ */
router.put(
  '/:projectId/workpackages/:wpId',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.edit_workpackages']),
  [
    param('projectId').isInt({ min: 1 }),
    param('wpId').isInt({ min: 1 }),
    body('code').notEmpty(),
    body('description').optional(),
    body('total_hours').isFloat({ min: 0 }),
    body('start_date').isISO8601(),
    body('end_date').isISO8601()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { projectId, wpId } = req.params;
    const { code, description, total_hours, start_date, end_date } = req.body;

    try {
      const [projects] = await db.query('SELECT start_date, end_date FROM projects WHERE id = ?', [projectId]);
      if (!projects.length) return res.status(404).json({ success: false, message: 'Progetto non trovato' });

      const proj = projects[0];

      // Controllo date WP nel periodo progetto (solo YYYY-MM-DD)
    if (
  normalizeDate(start_date) < normalizeDate(proj.start_date) ||
  normalizeDate(end_date) > normalizeDate(proj.end_date)
) {
  return res.status(400).json({
    success: false,
    message: 'Le date del WP devono rientrare nel periodo del progetto'
  });
}
      await db.query(`
        UPDATE project_workpackages
        SET code = ?, description = ?, total_hours = ?, start_date = ?, end_date = ?
        WHERE id = ? AND project_id = ?
      `, [code, description || '', total_hours, start_date, end_date, wpId, projectId]);

      res.json({ success: true });

    } catch (err) {
      console.error('Errore modifica WP:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);

/* ============================================================================
   AGGIUNTA RISORSA AD UN PROGETTO
============================================================================ */
router.post(
  '/:id/resources',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.edit_resources']),
  [
    param('id').isInt({ min: 1 }).withMessage('ID progetto non valido'),
    body('user_id').isInt({ min: 1 }).withMessage('ID utente non valido'),
    body('role_id').isInt({ min: 1 }).withMessage('Ruolo non valido'),
    body('start_date').isISO8601().withMessage('Data inizio non valida'),
    body('end_date').isISO8601().withMessage('Data fine non valida'),
    body('assigned_hours').optional().isFloat({ min: 0 }).withMessage('Ore assegnate non valide')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const projectId = req.params.id;
    const { user_id, role_id, start_date, end_date, assigned_hours } = req.body;

    try {
      // --- Verifica esistenza progetto ---
      const [projects] = await db.query('SELECT start_date, end_date FROM projects WHERE id = ?', [projectId]);
      if (!projects.length) return res.status(404).json({ success: false, message: 'Progetto non trovato' });
      const proj = projects[0];

      // --- Controllo coerenza date risorsa ---
      if (start_date < normalizeDate(proj.start_date) || end_date > normalizeDate(proj.end_date)) {
        return res.status(400).json({
          success: false,
          message: 'Il periodo della risorsa deve rientrare nel periodo del progetto'
        });
      }
      const [roles] = await db.query('SELECT id FROM project_roles WHERE id = ?', [role_id]);
if (!roles.length) {
  return res.status(400).json({ success: false, message: 'Ruolo non valido' });
}

      // --- Inserimento assegnazione ---
const [result] = await db.query(`
  INSERT INTO project_assignments
    (project_id, user_id, role_id, start_date, end_date, assigned_hours)
  VALUES (?, ?, ?, ?, ?, ?)
`, [projectId, user_id, role_id, start_date, end_date, assigned_hours || 0]);

      res.json({ success: true, assignmentId: result.insertId });

    } catch (err) {
      console.error('Errore aggiunta risorsa:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);
/* ============================================================================
   MODIFCA ASSEGANZIONE
============================================================================ */
router.put(
  '/:projectId/resources/:assignmentId',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.edit_resources']),
  [
    param('projectId').isInt({ min: 1 }),
    param('assignmentId').isInt({ min: 1 }),
    body('role_id').isInt({ min: 1 }).withMessage('Ruolo non valido'),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('assigned_hours').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { projectId, assignmentId } = req.params;
    const { role_id, start_date, end_date, assigned_hours } = req.body;

    const [roles] = await db.query('SELECT id FROM project_roles WHERE id = ?', [role_id]);
if (!roles.length) {
  return res.status(400).json({ success: false, message: 'Ruolo non valido' });
}

    try {
      // --- Progetto ---
      const [projects] = await db.query(
        'SELECT start_date, end_date, total_hours FROM projects WHERE id = ?',
        [projectId]
      );
      if (!projects.length) {
        return res.status(404).json({ success: false, message: 'Progetto non trovato' });
      }
      const project = projects[0];

      // --- Assegnazione corrente ---
      const [currentRows] = await db.query(
        'SELECT * FROM project_assignments WHERE id = ? AND project_id = ?',
        [assignmentId, projectId]
      );
      if (!currentRows.length) {
        return res.status(404).json({ success: false, message: 'Assegnazione non trovata' });
      }
      const current = currentRows[0];

      // --- Altre assegnazioni dello stesso progetto ---
      const [others] = await db.query(
        'SELECT * FROM project_assignments WHERE project_id = ? AND id != ?',
        [projectId, assignmentId]
      );

      // --- Date finali ---
      const finalStart = new Date(start_date || current.start_date);
      const finalEnd = new Date(end_date || current.end_date);

      const projectStart = new Date(project.start_date);
      const projectEnd = new Date(project.end_date);

      if (finalStart < projectStart || finalEnd > projectEnd) {
        return res.status(400).json({
          success: false,
          message: 'Il periodo deve rientrare nel periodo del progetto'
        });
      }
      if (finalEnd < finalStart) {
        return res.status(400).json({
          success: false,
          message: 'La data di fine non può precedere quella di inizio'
        });
      }

      // --- Sovrapposizioni ---
      const finalRoleId = role_id || current.role_id;

      const overlaps = (aStart, aEnd, bStart, bEnd) =>
        aStart <= bEnd && bStart <= aEnd;

      for (const a of others) {
        if (a.user_id !== current.user_id) continue;

        const aStart = new Date(a.start_date);
        const aEnd = new Date(a.end_date);

        if (overlaps(aStart, aEnd, finalStart, finalEnd)) {
       if (a.role_id === finalRoleId) {
  return res.status(400).json({
    success: false,
    message: 'Esiste già un incarico con lo stesso ruolo in un periodo sovrapposto'
  });
          } else {
            return res.status(400).json({
              success: false,
              message: 'Esiste già un incarico nello stesso periodo con ruolo diverso'
            });
          }
        }
      }

      // --- Controllo ore totali progetto ---
      const totalAssigned = others.reduce(
        (sum, a) => sum + (a.assigned_hours || 0),
        0
      );

      const finalHours = assigned_hours !== undefined
        ? assigned_hours
        : current.assigned_hours;

      if (totalAssigned + finalHours > project.total_hours) {
        return res.status(400).json({
          success: false,
          message: `Le ore superano il budget del progetto (${project.total_hours})`
        });
      }

      // --- Update ---
await db.query(
  `
  UPDATE project_assignments
  SET
    role_id = ?,
    start_date = ?,
    end_date = ?,
    assigned_hours = ?
  WHERE id = ? AND project_id = ?
  `,
  [
    finalRoleId,
    finalStart,
    finalEnd,
    finalHours,
    assignmentId,
    projectId
  ]
);

      res.json({ success: true, message: 'Assegnazione aggiornata correttamente' });

    } catch (err) {
      console.error('Errore update assegnazione:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);


/* ============================================================================
   ASSEGNAZIONE WP AD UNA RISORSA
============================================================================ */
router.put(
  '/:projectId/resources/:userId/wp',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.edit_resources']),
  [
    param('projectId').isInt({ min: 1 }),
    param('userId').isInt({ min: 1 }),
    body('wpAssignments').isArray(),
    body('wpAssignments.*.codice').notEmpty(),
    body('wpAssignments.*.ore').isFloat({ min: 0 }),
    body('wpAssignments.*.start_date').optional().isISO8601(),
    body('wpAssignments.*.end_date').optional().isISO8601()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { projectId, userId } = req.params;
    const { wpAssignments } = req.body;

    try {
      // --- Recupera progetto ---
      const [projects] = await db.query(
        'SELECT start_date, end_date FROM projects WHERE id = ?',
        [projectId]
      );
      if (!projects.length) {
        return res.status(404).json({ success: false, message: 'Progetto non trovato' });
      }
      const proj = projects[0];

      // --- Recupera assegnazione del docente al progetto ---
      const [projAssignRows] = await db.query(
        'SELECT id, assigned_hours FROM project_assignments WHERE user_id = ? AND project_id = ?',
        [userId, projectId]
      );
      if (!projAssignRows.length) {
        return res.status(400).json({ success: false, message: 'Utente non assegnato al progetto' });
      }
      const projectAssignmentId = projAssignRows[0].id;
      const maxProjectHours = parseFloat(projAssignRows[0].assigned_hours || 0);

      // --- Recupera tutte le assegnazioni WP esistenti ---
      const [existingAssignments] = await db.query(
        `SELECT wa.id, wa.assigned_hours, wp.code
         FROM workpackage_assignments wa
         JOIN project_workpackages wp ON wa.workpackage_id = wp.id
         WHERE wa.user_id = ? AND wp.project_id = ?`,
        [userId, projectId]
      );

      const wpCodesInRequest = wpAssignments.map(wp => wp.codice);

      // --- Ciclo su ogni WP da aggiornare / creare ---
      for (const wp of wpAssignments) {
        const [wpRow] = await db.query(
          'SELECT id, start_date, end_date FROM project_workpackages WHERE project_id = ? AND code = ?',
          [projectId, wp.codice]
        );
        if (!wpRow.length) {
          return res.status(400).json({ success: false, message: `WP ${wp.codice} non trovato` });
        }

        const wpId = wpRow[0].id;
        const start = wp.start_date || wpRow[0].start_date;
        const end = wp.end_date || wpRow[0].end_date;

        // --- Controllo date ---
        if (normalizeDate(start) < normalizeDate(proj.start_date) ||
            normalizeDate(end) > normalizeDate(proj.end_date)) {
          return res.status(400).json({
            success: false,
            message: `Le date del WP ${wp.codice} devono rientrare nel periodo del progetto`
          });
        }

        // --- Controllo ore totali sul progetto ---
        const existingWP = existingAssignments.find(e => e.code === wp.codice);
        const currentWPId = existingWP ? existingWP.id : 0;

        const totalOtherWPHours = existingAssignments
          .filter(e => e.id !== currentWPId)
          .reduce((sum, e) => sum + parseFloat(e.assigned_hours || 0), 0);

        if (totalOtherWPHours + parseFloat(wp.ore) > maxProjectHours) {
          return res.status(400).json({
            success: false,
            message: `Le ore totali dei WP assegnate (${totalOtherWPHours + parseFloat(wp.ore)}) superano le ore della risorsa sul progetto (${maxProjectHours})`
          });
        }

        // --- UPDATE / INSERT ---
        if (existingWP) {
          await db.query(
            `UPDATE workpackage_assignments
             SET assigned_hours = ?, start_date = ?, end_date = ?, active = 1
             WHERE id = ?`,
            [wp.ore, start, end, existingWP.id]
          );
        } else {
          await db.query(
            `INSERT INTO workpackage_assignments
             (user_id, workpackage_id, assigned_hours, start_date, end_date, project_assignment_id, active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [userId, wpId, wp.ore, start, end, projectAssignmentId]
          );
        }
      }

      // --- Disattiva assegnazioni non inviate ---
      for (const existing of existingAssignments) {
        if (!wpCodesInRequest.includes(existing.code)) {
          await db.query(
            'UPDATE workpackage_assignments SET active = 0 WHERE id = ?',
            [existing.id]
          );
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Errore assegnazione WP risorsa:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);


/* ============================================================================
   OVERVIEW PROGETTO + WP + ORE
   Residui calcolati STORICAMENTE
============================================================================ */

router.get(
  '/:projectId/overview',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.read']),
  async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const month = Number(req.query.month);
      const academicYear = req.query.academicYear;

      if (!projectId || !month || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Parametri mancanti (projectId, month, academicYear)'
        });
      }

      /* ============================================================
         1. PROGETTO
      ============================================================ */
      const [[project]] = await db.query(
        `SELECT id, name, acronym, cup_code, project_code, total_hours
         FROM projects
         WHERE id = ?`,
        [projectId]
      );

      if (!project) {
        return res.status(404).json({ success: false, message: 'Progetto non trovato' });
      }

      /* ============================================================
         2. WORKPACKAGES
      ============================================================ */
      const [workpackages] = await db.query(
        `SELECT id, code, description, total_hours
         FROM project_workpackages
         WHERE project_id = ?`,
        [projectId]
      );

      /* ============================================================
         3. TIMESHEET DEL MESE (VISUALIZZAZIONE)
      ============================================================ */
      const [timesheetsMonth] = await db.query(
        `SELECT id, user_id, status
         FROM timesheet
         WHERE month = ?
           AND academic_year = ?
           AND status IN ('inviato','approvato','riaperto','rendicontato')`,
        [month, academicYear]
      );

      const timesheetIdsMonth = timesheetsMonth.map(t => t.id);

      /* ============================================================
         4. ORE DEL MESE
      ============================================================ */
      let monthEntries = [];
      if (timesheetIdsMonth.length > 0) {
        [monthEntries] = await db.query(
          `SELECT
    pte.user_id,
    u.first_name,
    u.last_name,
    t.status AS timesheet_status,
    -- project_status aggiornato
    CASE
        WHEN tps.status IS NOT NULL THEN tps.status
        ELSE t.status
    END AS project_status,
    pa.assigned_hours AS project_user_budget,
    wp.id AS wp_id,
    wp.code AS wp_code,
    wp.total_hours AS wp_budget,
    wpa.assigned_hours AS wp_user_budget,
    pte.date,
    pte.hours
FROM project_timesheet_entries pte
JOIN timesheet t ON t.id = pte.timesheet_id
JOIN users u ON u.id = pte.user_id
JOIN project_assignments pa ON pa.id = pte.project_assignment_id
LEFT JOIN project_workpackages wp ON wp.id = pte.workpackage_id
LEFT JOIN workpackage_assignments wpa
  ON wpa.user_id = pte.user_id AND wpa.workpackage_id = wp.id
LEFT JOIN timesheet_project_status tps
  ON tps.timesheet_id = pte.timesheet_id
 AND tps.project_id = pa.project_id
 AND tps.user_id = pte.user_id
WHERE pa.project_id = ?
  AND pte.timesheet_id IN (?)
ORDER BY u.last_name, pte.date;
`,
          [projectId, timesheetIdsMonth]
        );
      }

      /* ============================================================
         5. ORE STORICHE (PER RESIDUI)
      ============================================================ */
      const [historicalEntries] = await db.query(
        `SELECT
           pte.user_id,
           pte.workpackage_id,
           pte.hours
         FROM project_timesheet_entries pte
         JOIN timesheet t ON t.id = pte.timesheet_id
         JOIN project_assignments pa ON pa.id = pte.project_assignment_id
         WHERE pa.project_id = ?
           AND t.status IN ('inviato','approvato','riaperto','rendicontato')`,
        [projectId]
      );

      /* ============================================================
         6. SOMME STORICHE
      ============================================================ */
      const projectUsedTotal = {};
      const wpUsedTotal = {};

      historicalEntries.forEach(e => {
        projectUsedTotal[e.user_id] =
          (projectUsedTotal[e.user_id] || 0) + Number(e.hours);

        if (e.workpackage_id) {
          wpUsedTotal[e.workpackage_id] ??= {};
          wpUsedTotal[e.workpackage_id][e.user_id] =
            (wpUsedTotal[e.workpackage_id][e.user_id] || 0) + Number(e.hours);
        }
      });

      /* ============================================================
         7. COSTRUZIONE RISPOSTA
      ============================================================ */
      const membersMap = {};
      const wpMap = {};
      let projectUsedMonth = 0;

      monthEntries.forEach(e => {
        const userKey = e.user_id;

        // ---------- PROGETTO ----------
        if (!membersMap[userKey]) {
          membersMap[userKey] = {
            user_id: e.user_id,
            name: `${e.first_name} ${e.last_name}`,
            budget: e.project_user_budget,
            used_month: 0,
            used_total: projectUsedTotal[userKey] || 0,
            days: {},
            status: ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status) ? e.project_status: null
          };
        } else {
          // Aggiorna stato solo se presente e valido
          if (!membersMap[userKey].status && ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status)) {
            membersMap[userKey].status = e.project_status;
          }
        }

        membersMap[userKey].used_month += Number(e.hours);
        membersMap[userKey].days[e.date] =
          (membersMap[userKey].days[e.date] || 0) + Number(e.hours);

        projectUsedMonth += Number(e.hours);

        // ---------- WORKPACKAGE ----------
        if (e.wp_id) {
          if (!wpMap[e.wp_id]) {
            const wpFromDb = workpackages.find(wp => wp.id === e.wp_id);
            wpMap[e.wp_id] = {
              id: e.wp_id,
              code: e.wp_code,
              description: wpFromDb ? wpFromDb.description : "",
              budget: e.wp_budget,
              used_month: 0,
              members: {}
            };
          }

          if (!wpMap[e.wp_id].members[userKey]) {
            wpMap[e.wp_id].members[userKey] = {
              user_id: e.user_id,
              name: `${e.first_name} ${e.last_name}`,
              budget: e.wp_user_budget,
              used_month: 0,
              used_total: wpUsedTotal[e.wp_id]?.[userKey] || 0,
              days: {},
              status: ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status) ? e.project_status : null
            };
          } else {
            if (!wpMap[e.wp_id].members[userKey].status && ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status)) {
              wpMap[e.wp_id].members[userKey].status = e.project_status;
            }
          }

          wpMap[e.wp_id].members[userKey].used_month += Number(e.hours);
          wpMap[e.wp_id].members[userKey].days[e.date] =
            (wpMap[e.wp_id].members[userKey].days[e.date] || 0) + Number(e.hours);

          wpMap[e.wp_id].used_month += Number(e.hours);
        }
      });

      /* ============================================================
         8. CALCOLO RESIDUI FINALI
      ============================================================ */
      Object.values(membersMap).forEach(m => {
        m.remaining = m.budget != null
          ? m.budget - m.used_total
          : null;
      });

      const workpackagesResponse = Object.values(wpMap).map(wp => ({
        ...wp,
        remaining: wp.budget != null
          ? wp.budget -
            Object.values(wp.members).reduce((s, m) => s + m.used_total, 0)
          : null,
        members: Object.values(wp.members).map(m => ({
          ...m,
          remaining: m.budget != null ? m.budget - m.used_total : null
        }))
      }));

      /* ============================================================
         9. RESPONSE
      ============================================================ */
      return res.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          acronym: project.acronym,
          cup_code: project.cup_code,
          project_code: project.project_code,
          budget: project.total_hours,
          used_month: projectUsedMonth,
          remaining: project.total_hours - Object.values(projectUsedTotal).reduce((a, b) => a + b, 0),
          members: Object.values(membersMap),
          workpackages: workpackagesResponse
        }
      });

    } catch (err) {
      console.error('Errore overview progetto:', err);
      return res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);

/* ============================================================================
   OVERVIEW PROGETTO + ORE
   Capo progetto (Coordinatore scientifico)
============================================================================ */

router.get(
  '/:projectId/overview_capo_progetto',
  authMiddleware,
  roleMiddleware(['capo_progetto']),
  permissionMiddleware(['projects.read.capoprogetto']),
  async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const month = Number(req.query.month);
      const academicYear = req.query.academicYear;
      const userId = req.user.id;

      if (!projectId || !month || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Parametri mancanti (projectId, month, academicYear)'
        });
      }

      /* ============================================================
         0. VERIFICA COORDINATORE SCIENTIFICO
      ============================================================ */
      const [[isCoordinator]] = await db.query(
        `SELECT 1
         FROM project_assignments pa
         JOIN project_roles pr ON pr.id = pa.role_id
         WHERE pa.project_id = ?
           AND pa.user_id = ?
           AND pr.name = 'Coordinatore scientifico'
         LIMIT 1`,
        [projectId, userId]
      );

      if (!isCoordinator) {
        return res.status(403).json({
          success: false,
          message: 'Non sei coordinatore scientifico di questo progetto'
        });
      }

      /* ============================================================
         1. PROGETTO
      ============================================================ */
      const [[project]] = await db.query(
        `SELECT id, name, acronym, cup_code, project_code, total_hours
         FROM projects
         WHERE id = ?`,
        [projectId]
      );

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Progetto non trovato'
        });
      }

      /* ============================================================
         2. WORKPACKAGES
      ============================================================ */
      const [workpackages] = await db.query(
        `SELECT id, code, description, total_hours
         FROM project_workpackages
         WHERE project_id = ?`,
        [projectId]
      );

      /* ============================================================
         3. TIMESHEET DEL MESE (SOLO PER FILTRO DATE)
      ============================================================ */
      const [timesheetsMonth] = await db.query(
        `SELECT id
         FROM timesheet
         WHERE month = ?
           AND academic_year = ?
           AND status IN ('inviato','approvato','riaperto','rendicontato')`,
        [month, academicYear]
      );

      const timesheetIdsMonth = timesheetsMonth.map(t => t.id);

      /* ============================================================
         4. ORE DEL MESE
      ============================================================ */
      let monthEntries = [];
      if (timesheetIdsMonth.length > 0) {
  [monthEntries] = await db.query(
  `SELECT
    pte.user_id,
    u.first_name,
    u.last_name,
    t.status AS timesheet_status,
    -- Se il timesheet globale è inviato, mostriamo 'inviato',
    -- altrimenti prendiamo lo stato specifico del progetto
   CASE
    WHEN tps.status IS NOT NULL AND tps.status != 'assegnato' THEN tps.status
    ELSE t.status
END AS project_status,
    pa.assigned_hours AS project_user_budget,
    wp.id AS wp_id,
    wp.code AS wp_code,
    wp.total_hours AS wp_budget,
    wpa.assigned_hours AS wp_user_budget,
    pte.date,
    pte.hours
FROM project_timesheet_entries pte
JOIN timesheet t ON t.id = pte.timesheet_id
JOIN users u ON u.id = pte.user_id
JOIN project_assignments pa ON pa.id = pte.project_assignment_id
LEFT JOIN project_workpackages wp ON wp.id = pte.workpackage_id
LEFT JOIN workpackage_assignments wpa
  ON wpa.user_id = pte.user_id AND wpa.workpackage_id = wp.id
LEFT JOIN timesheet_project_status tps
  ON tps.timesheet_id = pte.timesheet_id
 AND tps.project_id = pa.project_id
 AND tps.user_id = pte.user_id
WHERE pa.project_id = ?
  AND pte.timesheet_id IN (?)
ORDER BY u.last_name, pte.date;`,
  [projectId, timesheetIdsMonth]
);
      }

      /* ============================================================
         5. ORE STORICHE (PER RESIDUI)
      ============================================================ */
      const [historicalEntries] = await db.query(
        `SELECT
           pte.user_id,
           pte.workpackage_id,
           pte.hours
         FROM project_timesheet_entries pte
         JOIN timesheet t ON t.id = pte.timesheet_id
         JOIN project_assignments pa ON pa.id = pte.project_assignment_id
         WHERE pa.project_id = ?
           AND t.status IN ('inviato','approvato','riaperto','rendicontato')`,
        [projectId]
      );

      /* ============================================================
         6. SOMME STORICHE
      ============================================================ */
      const projectUsedTotal = {};
      const wpUsedTotal = {};

      historicalEntries.forEach(e => {
        projectUsedTotal[e.user_id] =
          (projectUsedTotal[e.user_id] || 0) + Number(e.hours);

        if (e.workpackage_id) {
          wpUsedTotal[e.workpackage_id] ??= {};
          wpUsedTotal[e.workpackage_id][e.user_id] =
            (wpUsedTotal[e.workpackage_id][e.user_id] || 0) + Number(e.hours);
        }
      });

      /* ============================================================
         7. COSTRUZIONE RISPOSTA
      ============================================================ */
      const membersMap = {};
      const wpMap = {};
      let projectUsedMonth = 0;

     monthEntries.forEach(e => {
  const userKey = e.user_id;

  if (!membersMap[userKey]) {
    membersMap[userKey] = {
      user_id: e.user_id,
      name: `${e.first_name} ${e.last_name}`,
      budget: e.project_user_budget,
      used_month: 0,
      used_total: projectUsedTotal[userKey] || 0,
      days: {},
      status: ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status) ? e.project_status : null
    };
  } else {
    if (!membersMap[userKey].status && ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status)) {
      membersMap[userKey].status = e.project_status;
    }
  }

  membersMap[userKey].used_month += Number(e.hours);
  membersMap[userKey].days[e.date] =
    (membersMap[userKey].days[e.date] || 0) + Number(e.hours);

  projectUsedMonth += Number(e.hours);

  if (e.wp_id) {
    if (!wpMap[e.wp_id]) {
      const wpFromDb = workpackages.find(wp => wp.id === e.wp_id);
      wpMap[e.wp_id] = {
        id: e.wp_id,
        code: e.wp_code,
        description: wpFromDb?.description || '',
        budget: e.wp_budget,
        used_month: 0,
        members: {}
      };
    }

    if (!wpMap[e.wp_id].members[userKey]) {
      wpMap[e.wp_id].members[userKey] = {
        user_id: e.user_id,
        name: `${e.first_name} ${e.last_name}`,
        budget: e.wp_user_budget,
        used_month: 0,
        used_total: wpUsedTotal[e.wp_id]?.[userKey] || 0,
        days: {},
        status: ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status) ? e.project_status : null
      };
    } else {
      if (!wpMap[e.wp_id].members[userKey].status && ["inviato","approvato","riaperto","rendicontato"].includes(e.project_status)) {
        wpMap[e.wp_id].members[userKey].status = e.project_status;
      }
    }

    wpMap[e.wp_id].members[userKey].used_month += Number(e.hours);
    wpMap[e.wp_id].members[userKey].days[e.date] =
      (wpMap[e.wp_id].members[userKey].days[e.date] || 0) + Number(e.hours);

    wpMap[e.wp_id].used_month += Number(e.hours);
  }
});

      /* ============================================================
         8. RESPONSE
      ============================================================ */
      return res.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          acronym: project.acronym,
          cup_code: project.cup_code,
          project_code: project.project_code,
          budget: project.total_hours,
          used_month: projectUsedMonth,
          remaining: project.total_hours -
            Object.values(projectUsedTotal).reduce((a, b) => a + b, 0),
          members: Object.values(membersMap).map(m => ({
            ...m,
            remaining: m.budget != null ? m.budget - m.used_total : null
          })),
          workpackages: Object.values(wpMap).map(wp => ({
            ...wp,
            remaining: wp.budget != null
              ? wp.budget -
                Object.values(wp.members).reduce((s, m) => s + m.used_total, 0)
              : null,
            members: Object.values(wp.members).map(m => ({
              ...m,
              remaining: m.budget != null ? m.budget - m.used_total : null
            }))
          }))
        }
      });

    } catch (err) {
      console.error('Errore overview capo progetto:', err);
      return res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);

/* ============================================================================
   CAMBIAMENTO STATO PROGETTI
============================================================================ */
router.post(
  '/:projectId/change_status',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.change_status']),
  async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const { action, userIds, note, month, academicYear } = req.body;

      if (!projectId || !action || !userIds?.length || !month || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Parametri mancanti'
        });
      }

      const validActions = ['approvato', 'rendicontato', 'riaperto'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Azione non valida'
        });
      }

      const skipped = [];
      let updatedCount = 0;

      // Recupera timesheet + nome utente
      const [timesheets] = await db.query(
        `
        SELECT t.id, t.user_id, t.status, u.first_name, u.last_name
        FROM timesheet t
        JOIN users u ON u.id = t.user_id
        WHERE t.month = ?
          AND t.academic_year = ?
          AND t.user_id IN (?)
        `,
        [month, academicYear, userIds]
      );

      for (const ts of timesheets) {
        const tsId = ts.id;

        // Stato progetto specifico
        const [projectStatuses] = await db.query(
          `
          SELECT id, status
          FROM timesheet_project_status
          WHERE timesheet_id = ?
            AND project_id = ?
            AND user_id = ?
          `,
          [tsId, projectId, ts.user_id]
        );

        const currentStatus = projectStatuses[0]?.status || 'assegnato';

        let newStatus = null;
        let reason = null;

     // ---- TRANSIZIONI STATO PROGETTO ----
switch (action) {
  case 'approvato':
    // approvato solo se lo stato corrente è inviato
    if (currentStatus === 'inviato') {
      newStatus = 'approvato';
    } else {
      reason = `Impossibile approvare: stato progetto = ${currentStatus}`;
    }
    break;

  case 'rendicontato':
    if (currentStatus === 'approvato') {
      newStatus = 'rendicontato';
    } else {
      reason = 'Impossibile rendicontare: il progetto deve essere approvato';
    }
    break;

  case 'riaperto':
    if (['inviato', 'approvato'].includes(currentStatus)) {
      newStatus = 'riaperto';
      reopeningNote = note || null;
    } else if (currentStatus === 'rendicontato') {
      reason = 'Impossibile riaprire: progetto già rendicontato';
    } else {
      reason = `Impossibile riaprire: stato progetto = ${currentStatus}`;
    }
    break;
}

        // ---- AZIONE NON APPLICABILE ----
        if (!newStatus) {
          skipped.push({
            userId: ts.user_id,
            userName: `${ts.first_name} ${ts.last_name}`,
            projectId,
            action,
            currentStatus,
            reason
          });
          continue;
        }

        // ---- UPDATE / INSERT STATO PROGETTO ----
     if (projectStatuses.length > 0) {
  await db.query(
    `
    UPDATE timesheet_project_status
    SET status = ?, reopening_note = ?
    WHERE id = ?
    `,
    [newStatus, action === 'riaperto' ? reopeningNote : projectStatuses[0].reopening_note, projectStatuses[0].id]
  );
} else {
  await db.query(
    `
    INSERT INTO timesheet_project_status
      (timesheet_id, project_id, user_id, status, reopening_note)
    VALUES (?, ?, ?, ?, ?)
    `,
    [tsId, projectId, ts.user_id, newStatus, action === 'riaperto' ? reopeningNote : null]
  );
}

        updatedCount++;

        // ---- RICALCOLO STATO GLOBALE TIMESHEET ----
        const [allProjectStatuses] = await db.query(
          `
          SELECT status
          FROM timesheet_project_status
          WHERE timesheet_id = ?
          `,
          [tsId]
        );

        let globalStatus = ts.status;

        if (allProjectStatuses.length > 0) {
          if (allProjectStatuses.every(p => p.status === 'rendicontato')) {
            globalStatus = 'rendicontato';
          } else if (allProjectStatuses.every(p => p.status === 'approvato')) {
            globalStatus = 'approvato';
          } else if (allProjectStatuses.some(p => p.status === 'riaperto')) {
            globalStatus = 'riaperto';
          } else if (allProjectStatuses.some(p => p.status === 'inviato')) {
            globalStatus = 'inviato';
          }
        }

        await db.query(
          `UPDATE timesheet SET status = ? WHERE id = ?`,
          [globalStatus, tsId]
        );
      }

      // ---- RESPONSE FINALE ----
      if (updatedCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nessuna operazione eseguita',
          skipped
        });
      }

      if (skipped.length > 0) {
        return res.json({
          success: true,
          message: `Operazione parzialmente completata (${updatedCount} aggiornati)`,
          updatedCount,
          skipped
        });
      }

      return res.json({
        success: true,
        message: 'Stati aggiornati correttamente',
        updatedCount
      });

    } catch (err) {
      console.error('Errore change_status:', err);
      return res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);






module.exports = router;