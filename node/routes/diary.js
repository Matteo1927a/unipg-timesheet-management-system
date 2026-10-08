const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const db = require('../config/db');
const { query, body, validationResult } = require('express-validator');
const { checkAcademicYearHours, checkAcademicYearTotalHours} = require('../services/timesheetService'); // importa il service

/* ============================================================================
   RECUPERO DIARIO ANNUALE
============================================================================ */
router.get(
  '/academic-year',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['diary.read_own']),
  query('academicYear').notEmpty().withMessage('Anno accademico mancante'),
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const { academicYear } = req.query;

    try {
      const [rows] = await db.query(
        `
        SELECT
          da.id AS diary_activity_id,
          da.name AS activity_name,

          COALESCE(ts.timesheet_hours, 0) AS timesheet_hours,
          COALESCE(ann.hours, 0) AS annual_hours,

          COALESCE(ts.timesheet_hours, 0) + COALESCE(ann.hours, 0) AS total_hours

        FROM diary_activities da

        LEFT JOIN (
          SELECT
            dte.diary_activity_id,
            SUM(dte.hours) AS timesheet_hours
          FROM diary_timesheet_entries dte
          INNER JOIN timesheet t ON t.id = dte.timesheet_id
          WHERE dte.user_id = ?
            AND t.academic_year = ?
          GROUP BY dte.diary_activity_id
        ) ts ON ts.diary_activity_id = da.id

        LEFT JOIN diary_annual_entries ann
          ON ann.diary_activity_id = da.id
          AND ann.user_id = ?
          AND ann.academic_year = ?

        ORDER BY da.name
        `,
        [userId, academicYear, userId, academicYear]
      );

      return res.json({
        success: true,
        academicYear,
        data: rows
      });

    } catch (err) {
      console.error('Errore recupero diario annuale:', err);
      return res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);


/* ============================================================================
   RECUPERO ENTIRIES DIARIO
============================================================================ */
router.post(
  '/annual-entry',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['diary.write_own']),
  [
    body('academicYear').notEmpty(),
    body('diaryActivityId').isInt({ min: 1 }),
    body('hours').isFloat({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const { academicYear, diaryActivityId, hours } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // ===================================================
      // CONTROLLO LIMITE ANNUALE DIDATTICA (INCLUDENDO TIMESHEET + ANNUAL ENTRIES)
      // ===================================================
      const yearCheck = await checkAcademicYearHours(connection, userId, academicYear, hours, 'teaching');

      if (yearCheck.overLimit) {
        await connection.rollback();
        connection.release();
        return res.status(200).json({
          success: false,
          code: 'ACADEMIC_YEAR_LIMIT_EXCEEDED',
          details: {
            limit: yearCheck.limit,
            used_before: yearCheck.usedBefore,
            used_after: yearCheck.usedAfter,
            remaining_after: yearCheck.limit - yearCheck.usedAfter
          }
        });
      }

      // ===================================================
// CONTROLLO LIMITE TOTALE ANNUALE (TUTTE LE ATTIVITÀ)
// ===================================================
const totalYearCheck = await checkAcademicYearTotalHours(
  connection,
  userId,
  academicYear,
  hours
);

if (totalYearCheck.overLimit) {
  await connection.rollback();
  connection.release();
  return res.status(200).json({
    success: false,
    code: 'ACADEMIC_YEAR_TOTAL_LIMIT_EXCEEDED',
    details: {
      limit: totalYearCheck.limit,
      used_before: totalYearCheck.usedBefore,
      used_after: totalYearCheck.usedAfter,
      remaining_after: totalYearCheck.limit - totalYearCheck.usedAfter,
      breakdown: totalYearCheck.breakdown
    }
  });
}

      // ===================================================
      // INSERT / UPDATE O CANCELLAZIONE ENTRY
      // ===================================================
      if (Number(hours) === 0) {
        await connection.query(
          `
          DELETE FROM diary_annual_entries
          WHERE user_id = ?
            AND academic_year = ?
            AND diary_activity_id = ?
          `,
          [userId, academicYear, diaryActivityId]
        );
      } else {
        await connection.query(
          `
          INSERT INTO diary_annual_entries
            (user_id, academic_year, diary_activity_id, hours)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE hours = VALUES(hours)
          `,
          [userId, academicYear, diaryActivityId, hours]
        );
      }

      await connection.commit();
      connection.release();

      return res.json({ success: true, message: 'Ore annuali del diario aggiornate correttamente' });

    } catch (err) {
      await connection.rollback();
      connection.release();

      console.error('Errore salvataggio diario annuale:', err);

      res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);
module.exports = router;


