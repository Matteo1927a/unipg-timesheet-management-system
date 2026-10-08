const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const db = require('../config/db');
const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx');



/* ============================================================================
   RECUPERO LIMITI ANNUALI PER DOCENTE
============================================================================ */
router.get('/docente/:userId/limits', 
  authMiddleware, 
  roleMiddleware(['responsabile_didattica']), 
  permissionMiddleware(['didattica.read_limits']), 
  async (req, res) => {
  try {
    const { userId } = req.params;
    const { academic_year } = req.query;

    const [rows] = await db.query(
      `SELECT academic_year, max_teaching_hours, max_total_hours
       FROM teacher_hour_limits
       WHERE user_id = ?
       ${academic_year ? 'AND academic_year = ?' : ''}`,
      academic_year ? [userId, academic_year] : [userId]
    );

    res.json({ success: true, limits: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore nel recupero dei limiti' });
  }
});





/* ============================================================================
   RECUPERO LISTA DOCENTI PER RESPONSABILE DIDATTICA
============================================================================ */

router.get(
  '/docenti',
  authMiddleware,
  roleMiddleware(['responsabile_didattica']),
  permissionMiddleware(['didattica.read_docenti']),
  async (req, res) => {
    try {
      // Query per recuperare solo utenti con ruolo "docente"
      const [rows] = await db.query(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.docente_code,
          u.fiscal_code,
          u.is_active
        FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'docente'
        ORDER BY u.last_name, u.first_name
      `);

      res.json({
        success: true,
        docenti: rows
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero della lista docenti'
      });
    }
  }
);



/* ============================================================================
   INSERIMENTO / AGGIORNAMENTO LIMITI ANNUALI DOCENTE 
============================================================================ */
router.post(
  '/docente/:userId/limits',
  authMiddleware,
  roleMiddleware(['responsabile_didattica']),
  permissionMiddleware(['didattica.write_limits']),
  
  // Validazione campi con express-validator
  body('academic_year')
    .notEmpty().withMessage('Anno accademico obbligatorio')
    .matches(/^\d{4}\/\d{2}$/).withMessage('Formato anno accademico non valido (es. 2025/26)'),
  body('max_teaching_hours')
    .isInt({ min: 0 }).withMessage('Ore didattica massime devono essere un numero intero ≥ 0'),
  body('max_total_hours')
    .isInt({ min: 0 }).withMessage('Ore totali massime devono essere un numero intero ≥ 0'),

  async (req, res) => {
    // Controllo errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errore di validazione',
        errors: errors.array()
      });
    }

    try {
      const { userId } = req.params;
      const { academic_year, max_teaching_hours, max_total_hours } = req.body;

      // Verifica se esiste già un record per questo docente e anno accademico
      const [existing] = await db.query(
        `SELECT id FROM teacher_hour_limits WHERE user_id = ? AND academic_year = ?`,
        [userId, academic_year]
      );

      if (existing.length > 0) {
        // Aggiorna record esistente
        await db.query(
          `UPDATE teacher_hour_limits
           SET max_teaching_hours = ?, max_total_hours = ?
           WHERE user_id = ? AND academic_year = ?`,
          [max_teaching_hours, max_total_hours, userId, academic_year]
        );
      } else {
        // Inserisce nuovo record
        await db.query(
          `INSERT INTO teacher_hour_limits
           (user_id, academic_year, max_teaching_hours, max_total_hours)
           VALUES (?, ?, ?, ?)`,
          [userId, academic_year, max_teaching_hours, max_total_hours]
        );
      }

      res.json({ success: true, message: 'Limiti aggiornati con successo' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante il salvataggio dei limiti' });
    }
  }
);


/* ============================================================================
   RECUPERO LISTA INSEGNAMENTI
============================================================================ */
router.get(
  '/insegnamenti',
  authMiddleware,
  roleMiddleware(['responsabile_didattica']),
  permissionMiddleware(['didattica.teachings']),
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT id, code, name, budget_hour
        FROM teachings
        ORDER BY name
      `);

      res.json({
        success: true,
        teachings: rows
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore nel recupero degli insegnamenti'
      });
    }
  }
);

/* ============================================================================
   AGGIONRAMENTO BUDGET INSEGNAMENTI
============================================================================ */
router.put(
  '/insegnamenti/:id/budget',
  authMiddleware,
  roleMiddleware(['responsabile_didattica']),
  permissionMiddleware(['didattica.teachings']),
  body('budget_hour')
    .isInt({ min: 0 })
    .withMessage('Il budget ore deve essere un numero intero ≥ 0'),

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
      const { budget_hour } = req.body;

      await db.query(
        `UPDATE teachings SET budget_hour = ? WHERE id = ?`,
        [budget_hour, id]
      );

      res.json({
        success: true,
        message: 'Budget ore aggiornato con successo'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Errore durante l\'aggiornamento del budget'
      });
    }
  }
);


const upload = multer({
  storage: multer.memoryStorage()
});

/* ============================================================================
   IMPORT ASSEGANZIONE DECOENTI-INSEGNAMENTI
============================================================================ */
router.post(
  '/import-teacher-assignments',
  authMiddleware,
  roleMiddleware(['responsabile_didattica']),
  permissionMiddleware(['didattica.teachings']),
  upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ success: false, message: 'File mancante' });

      const previewMode = req.query.preview === 'true'; // <-- FLAG preview

       const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      

      
      console.log(Object.keys(rows[0])); 

      const results = { success: 0, errors: [], previewData: [] };
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const annoOfferta = row['Anno Offerta'];
  const codiceInsegnamento = row['Cod. Insegnamento'];
  const nomeInsegnamento = row['Des. Insegnamento'];
  const orePreviste = row['Ore Att. Front. Inseg.'];
  const periodo = row['Des. Periodo Insegnamento'];
  const cognomeDocente = row['Cognome Docente'];
  const nomeDocente = row['Nome Docente'];

  console.log("Intestazioni colonna:", Object.keys(rows[0]));
console.log("Prime 5 righe:", rows.slice(0, 5));
        if (!nomeDocente || !cognomeDocente) {
          results.errors.push({ row: i + 1, message: 'Docente mancante' });
          continue;
        }

        const [users] = await db.query(
          'SELECT id FROM users WHERE first_name = ? AND last_name = ?',
          [nomeDocente.trim(), cognomeDocente.trim()]
        );

        if (!users.length) {
          results.errors.push({ row: i + 1, message: `Docente ${nomeDocente} ${cognomeDocente} non trovato` });
          continue;
        }

        const userId = users[0].id;

        // In preview aggiungiamo solo i dati da mostrare
        if (previewMode) {
          results.previewData.push({
            row: i + 1,
            docente: `${nomeDocente} ${cognomeDocente}`,
            codiceInsegnamento,
            nomeInsegnamento,
            orePreviste,
            periodo,
            annoOfferta
          });
          continue; // salto tutto il resto, niente insert/update
        }

        // --- Logica normale di inserimento/aggiornamento ---
        let [teachings] = await db.query(
          'SELECT id FROM teachings WHERE code = ?',
          [codiceInsegnamento]
        );

        let teachingId;
        if (teachings.length) {
          teachingId = teachings[0].id;
        } else {
          const [insertRes] = await db.query(
            'INSERT INTO teachings (code, name) VALUES (?, ?)',
            [codiceInsegnamento, nomeInsegnamento]
          );
          teachingId = insertRes.insertId;
        }

        const academicYear = `${annoOfferta}/${String(Number(annoOfferta) + 1).slice(-2)}`;

        let startDate, endDate;
        if (periodo === 'Primo Semestre') { // primo semestre
          startDate = `${annoOfferta}-09-20`;
          endDate = `${Number(annoOfferta) + 1}-01-16`;
        } else if (periodo === 'Secondo Semestre') { // secondo semestre
          startDate = `${Number(annoOfferta) + 1}-02-24`;
          endDate = `${Number(annoOfferta) + 1}-06-30`;
        } else { // annuale
          startDate = `${annoOfferta}-09-20`;
          endDate = `${Number(annoOfferta) + 1}-06-30`;
        }

        await db.query(
          `INSERT INTO teacher_teachings 
           (user_id, teaching_id, start_date, end_date, assigned_hours, academic_year)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             assigned_hours = VALUES(assigned_hours),
             start_date = VALUES(start_date),
             end_date = VALUES(end_date)`,
          [userId, teachingId, startDate, endDate, orePreviste, academicYear]
        );

        results.success += 1;
      }

      // Se in preview, restituisco solo previewData
      if (previewMode) {
        return res.json({ success: true, preview: results.previewData, errors: results.errors });
      }

      res.json({ success: true, message: `${results.success} assegnazioni importate`, errors: results.errors });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore durante l\'import' });
    }
  }
);







module.exports = router;