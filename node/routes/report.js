const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const db = require('../config/db');
const ExcelJS = require('exceljs');
const path = require('path');
const { body,query, param, validationResult } = require('express-validator');



function academicYearToDates(yearStr) {
  const [startYear, endYear] = yearStr.split('/').map(y => parseInt(y, 10));
  const startDate = `${startYear}-10-01`;
  const endDate = `${endYear}-09-30`;
  return { startDate, endDate };
}

/* ============================================================================
   RECUPERO ANNI ACCADEMICI PER REPORT
============================================================================ */

router.get(
  '/academic-years',
  authMiddleware,
   roleMiddleware(['docente']),
  permissionMiddleware(['own_report']),
  async (req, res) => {
    try {
      const userId = req.user.id;

      const [rows] = await db.query(
        `
        SELECT DISTINCT academic_year
        FROM timesheet
        WHERE user_id = ?
        ORDER BY academic_year DESC
        `,
        [userId]
      );

      // Estraiamo solo i valori (array di stringhe)
      const academicYears = rows.map(row => row.academic_year);

      res.json({
        success: true,
        academic_years: academicYears
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        success: false,
        message: 'Errore nel recupero degli anni accademici'
      });
    }
  }
);

/* ============================================================================
   RECUPERO INSEGNAMENTI DOCENTE PER ANNO ACCADEMICO
============================================================================ */

router.get(
  '/teachings',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['own_report']),
  // Validazione query param
  query('academic_year')
    .trim()
    .notEmpty().withMessage('Anno accademico mancante')
    .matches(/^\d{4}\/(\d{2}|\d{4})$/)
    .withMessage('Formato anno accademico non valido (es. 2024/2025)'),
  async (req, res) => {
    try {
      // Controllo errori validazione
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user.id;
      const { academic_year } = req.query;

      const { startDate, endDate } = academicYearToDates(academic_year);

      const [rows] = await db.query(
        `
        SELECT t.id, t.name, t.code
        FROM teachings t
        JOIN teacher_teachings tt ON tt.teaching_id = t.id
        WHERE tt.user_id = ?
          AND tt.start_date <= ?
          AND tt.end_date >= ?
        ORDER BY t.name
        `,
        [userId, endDate, startDate]
      );

      // Combina nome + codice tra [] in un campo extra
      const teachings = rows.map(t => ({
        id: t.id,
        name: `${t.name} [${t.code}]`
      }));

      res.json({ success: true, teachings });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore nel recupero degli insegnamenti' });
    }
  }
);


/* ============================================================================
   RECUPERO INFO DETTAGLIO REPORT
============================================================================ */
router.get(
  '/teaching-info',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['own_report']),
  query('id')
    .trim()
    .notEmpty().withMessage('ID insegnamento mancante')
    .isInt().withMessage('ID insegnamento non valido'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { id } = req.query;
      const userId = req.user.id;

      // Recupera info insegnamento e docente
    const [rows] = await db.query(`
  SELECT tt.id AS teacher_teaching_id, 
         t.name, t.code,
         u.first_name, u.last_name, u.docente_code
  FROM teacher_teachings tt
  JOIN teachings t ON t.id = tt.teaching_id
  JOIN users u ON u.id = tt.user_id
  WHERE tt.teaching_id = ? AND tt.user_id = ?
`, [id, userId]);

      if (!rows.length) return res.status(404).json({ success: false, message: 'Insegnamento non trovato' });

      const row = rows[0];
      res.json({
        success: true,
        teaching: {
          id: row.teacher_teaching_id,
          name: row.name,
          code: row.code,
          teacher_name: `${row.first_name} ${row.last_name}`,
          teacher_code: row.docente_code || ''
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore recupero info insegnamento' });
    }
  }
);

/* ============================================================================
   ANTEPRIA DEL REPORT
============================================================================ */
router.get(
  '/registro',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['own_report']),
  // Validazione query param
  query('academic_year')
    .trim()
    .notEmpty().withMessage('Anno accademico mancante')
    .matches(/^\d{4}\/(\d{2}|\d{4})$/).withMessage('Formato anno accademico non valido'),
  query('teacher_teaching_id')
    .trim()
    .notEmpty().withMessage('Insegnamento mancante')
    .isInt().withMessage('ID insegnamento non valido'),
  query('semester')
    .optional()
    .isIn(['0','1','2']).withMessage('Semestre non valido'), // 0 = corso annuale
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) 
        return res.status(400).json({ success: false, errors: errors.array() });

      const { academic_year, teacher_teaching_id, semester } = req.query;
      const userId = req.user.id;

      // Date inizio/fine anno accademico
      const { startDate, endDate } = academicYearToDates(academic_year); // es. 2025-10-01 → 2026-09-30

      // Funzione per calcolare le date del semestre
      function getSemesterDates(startDateStr, endDateStr, semester) {
        const startDate = new Date(startDateStr); // 1 Ottobre
        const endDate = new Date(endDateStr);     // 30 Settembre anno successivo

        let semesterStart, semesterEnd;

        if (semester === '1') {
          // Primo semestre: Settembre anno accademico – Gennaio anno successivo
          semesterStart = new Date(startDate.getFullYear(), 8, 1); // Settembre
          semesterEnd   = new Date(startDate.getFullYear() + 1, 0, 31); // Gennaio
        } else if (semester === '2') {
          // Secondo semestre: Febbraio – Giugno anno successivo
          semesterStart = new Date(startDate.getFullYear() + 1, 1, 1); // Febbraio
          semesterEnd   = new Date(startDate.getFullYear() + 1, 5, 30); // Giugno
        } else {
          // Corso annuale o nessun semestre selezionato
          semesterStart = startDate;
          semesterEnd   = endDate;
        }

        const pad = n => String(n).padStart(2, '0');
        const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        return { semesterStart: format(semesterStart), semesterEnd: format(semesterEnd) };
      }

      const { semesterStart, semesterEnd } = getSemesterDates(startDate, endDate, semester);



      // Recupero entries filtrando per timesheet e date
const [entries] = await db.query(`
  SELECT e.date, e.start_time, e.end_time, e.academic_hours, e.activity_type, e.title, e.description
  FROM teaching_timesheet_entries e
  JOIN timesheet t ON t.id = e.timesheet_id
  JOIN teacher_teachings tt ON tt.id = e.teacher_teaching_id
  WHERE e.user_id = ?
    AND tt.teaching_id = ?  -- <--- qui cerchi per teaching_id invece che per id tt
    AND t.academic_year = ?
    AND e.date BETWEEN ? AND ?
    AND e.date BETWEEN tt.start_date AND tt.end_date
  ORDER BY e.date ASC, e.start_time ASC
`, [userId, teacher_teaching_id, academic_year, semesterStart, semesterEnd]);

      res.json({ success: true, entries });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Errore recupero registro' });
    }
  }
);

/* ============================================================================
   GENERAZIONE REPORT
============================================================================ */
router.get(
  '/generate',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['own_report']),
  query('academic_year')
    .trim()
    .notEmpty().withMessage('Anno accademico mancante')
    .matches(/^\d{4}\/(\d{2}|\d{4})$/)
    .withMessage('Formato anno accademico non valido'),
  query('teacher_teaching_id')
    .trim()
    .notEmpty().withMessage('Insegnamento mancante')
    .isInt().withMessage('ID insegnamento non valido'),
  query('semester')
    .optional()
    .isIn(['0','1','2']).withMessage('Semestre non valido'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ success: false, errors: errors.array() });

      const { academic_year, teacher_teaching_id, semester } = req.query;
      const userId = req.user.id;

      function expandAcademicYear(shortYear) {
  // "2025/26" -> ["2025", "26"]
  const parts = shortYear.split('/');
  if (parts.length !== 2) return shortYear; // fallback se formato strano

  const startYear = parts[0];
  let endYear = parts[1];

  // Se endYear è 2 cifre, aggiunGO le prime 2 cifre dello startYear
  if (endYear.length === 2) {
    endYear = startYear.slice(0,2) + endYear;
  }

  return `${startYear}/${endYear}`;
}

const [rows] = await db.query(`
  SELECT tt.id AS teacher_teaching_id, 
         t.name, t.code,
         u.first_name, u.last_name, u.docente_code
  FROM teacher_teachings tt
  JOIN teachings t ON t.id = tt.teaching_id
  JOIN users u ON u.id = tt.user_id
  WHERE tt.teaching_id = ? AND tt.user_id = ?
`, [teacher_teaching_id, userId]); 

const teaching = rows[0];  

      if (!teaching)
        return res.status(404).json({ success: false, message: 'Insegnamento non trovato' });

      // ===============================
      //  Calcolo periodo semestre
      // ===============================
      const { startDate, endDate } = academicYearToDates(academic_year);

      const getSemesterDates = (startDateStr, endDateStr, semester) => {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        let semesterStart, semesterEnd;

        if (semester === '1') {
          semesterStart = new Date(startDate.getFullYear(), 8, 1);  // Settembre
          semesterEnd   = new Date(startDate.getFullYear() + 1, 0, 31); // Gennaio
        } else if (semester === '2') {
          semesterStart = new Date(startDate.getFullYear() + 1, 1, 1); // Febbraio
          semesterEnd   = new Date(startDate.getFullYear() + 1, 5, 30); // Giugno
        } else {
          semesterStart = startDate;
          semesterEnd   = endDate;
        }

        const pad = n => String(n).padStart(2, '0');
        const format = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        return {
          semesterStart: format(semesterStart),
          semesterEnd: format(semesterEnd)
        };
      };

      const { semesterStart, semesterEnd } = getSemesterDates(startDate, endDate, semester);

       // Recupero entries
   const [entries] = await db.query(`
  SELECT e.date, e.start_time, e.end_time, e.academic_hours, e.activity_type, e.title, e.description
  FROM teaching_timesheet_entries e
  JOIN timesheet t ON t.id = e.timesheet_id
  JOIN teacher_teachings tt ON tt.id = e.teacher_teaching_id
  WHERE e.user_id = ?
    AND tt.teaching_id = ?
    AND t.academic_year = ?
    AND e.date BETWEEN ? AND ?
    AND e.date BETWEEN tt.start_date AND tt.end_date
  ORDER BY e.date ASC, e.start_time ASC
`, [userId, teacher_teaching_id, academic_year, semesterStart, semesterEnd]);

      // ===============================
      // Carica template Excel 
      // ===============================
   const templatePath = path.join(__dirname, '..', 'templates', 'registro_template.xlsx');


      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);

      const sheet = workbook.getWorksheet('Foglio1'); // nome foglio del template

      // ===============================
      //  Compila intestazione
      // ===============================
      sheet.getCell('B5').value = expandAcademicYear(academic_year);
      sheet.getCell('B6').value = `${teaching.first_name} ${teaching.last_name} ${teaching.docente_code}`;
      sheet.getCell('B7').value = `${teaching.name} [${teaching.code}]`;
const activityTypeMap = {
  'lezione': '0001',
  'lezione pratica': '0002',
  'integrativa curriculare': '0003',
  'attività didattica a distanza*': '0020',
  'lezione tecnico-pratica': '0021',
  'equivalente alla ufficiale': '0019'
};

      // ===============================
      //  Scrittura lezioni
      // ===============================
      const startRow = 15;

      entries.forEach((lesson, index) => {

        console.log('VALORE DB:', lesson.activity_type);
console.log('MAPPATO:', activityTypeMap[lesson.activity_type?.trim().toLowerCase()]);
        const rowNumber = startRow + index;
        const row = sheet.getRow(rowNumber);

        row.getCell('A').value = new Date(lesson.date);
        row.getCell('A').numFmt = 'dd/mm/yyyy';

     // START TIME
if (lesson.start_time && !lesson.start_time.startsWith('00:00')) {
  row.getCell('B').value = lesson.start_time;
  row.getCell('B').numFmt = 'hh:mm';
} else {
  row.getCell('B').value = null; // cella vuota
}

// END TIME
if (lesson.end_time && !lesson.end_time.startsWith('00:00')) {
  row.getCell('C').value = lesson.end_time;
  row.getCell('C').numFmt = 'hh:mm';
} else {
  row.getCell('C').value = null; // cella vuota
}

       row.getCell('D').value = lesson.academic_hours
  ? Number(lesson.academic_hours)
  : null;

row.getCell('D').numFmt = '0';

const normalizedType = lesson.activity_type
  ? lesson.activity_type.trim().toLowerCase()
  : '';

row.getCell('E').value =
  activityTypeMap[normalizedType] || '';
        row.getCell('G').value = lesson.title || '';
        row.getCell('H').value = lesson.description || '';

        row.commit();
      });

      // ===============================
      //  Invio file
      // ===============================
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Registro_${teaching.last_name}_${academic_year}.xlsx`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.send(buffer);

    } catch (err) {
      console.error('Errore generazione registro:', err);
      res.status(500).json({
        success: false,
        message: 'Errore interno server'
      });
    }
  }
);



module.exports = router;