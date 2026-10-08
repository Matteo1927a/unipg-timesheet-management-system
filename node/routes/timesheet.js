const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const db = require('../config/db');
const { body, param, validationResult } = require('express-validator');
const { getActivitiesHoursByUser,  checkBudgetBeforeSave ,  checkAcademicYearHours, checkAcademicYearTotalHours, checkOrdinaryInternalAdjustment  } = require('../services/timesheetService');


//HELPER
function getAcademicYear(month, year) {
    let startYear, endYear;
    if (month >= 10) {
        startYear = year;
        endYear = year + 1;
    } else {
        startYear = year - 1;
        endYear = year;
    }
    return `${startYear}/${String(endYear).slice(-2)}`;
}

function buildDateFromAcademicYear(academicYear, month, day) {
  const [startYear, endYearShort] = academicYear.split('/');
  const endYear = Number(`20${endYearShort}`);

  const year =
    month >= 10
      ? Number(startYear)
      : endYear;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ============================================================================
   RECUPERO TUTTE LE ORE TIMESHEET NORMALIZZATE PER IL FRONTEND
============================================================================ */
router.get(
  '/:timesheetId/entries',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['timesheet.read_own']),
  param('timesheetId').isInt({ min: 1 }).withMessage("ID timesheet non valido"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const timesheetId = parseInt(req.params.timesheetId);

    try {
      const [ts] = await db.query(`SELECT * FROM timesheet WHERE id = ?`, [timesheetId]);
      if (ts.length === 0) return res.status(404).json({ success: false, message: "Timesheet non trovato" });

      const roles = req.user.roles || [];
      const isDocente = roles.includes('docente');
      const isRespDidattica = roles.includes('responsabile_didattica');
      const isAdmin = roles.includes('amministratore');
      const isRespAdminProgetti = roles.includes('responsabile_amministrativo');

      let entriesRaw = [];

      if (isDocente || isRespDidattica || isAdmin || isRespAdminProgetti) {
        
 [entriesRaw] = await db.query(`
SELECT *
FROM view_timesheet_entries
WHERE timesheet_id = ?
  AND user_id = ?
`, [timesheetId, req.user.id]);
      }

      const normalizedEntries = [];
      entriesRaw.forEach(e => {
        if (!e.day) return;

        normalizedEntries.push({
          type: e.type,
          activity_id: e.activity_id,
            project_id: e.project_id ?? null,
          day: e.day,
          hours: e.hours,
          academic_hours: e.academic_hours,
          start_time: e.start_time,
          end_time: e.end_time,
          activity_type: e.activity_type,
          title: e.title,
          description: e.description
        });
      });

      return res.json({
        success: true,
        timesheetId,
        entries: normalizedEntries
      });

    } catch (err) {
      console.error("Errore recupero ore timesheet:", err);
      res.status(500).json({ success: false, message: "Errore interno server" });
    }
  }
);



/* ============================================================================
   CREAZIONE/RECUPERO TIMESHEET
============================================================================ */
router.get(
  '/:year/:month',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['timesheet.create_own']),
  [
    param('month').isInt({ min: 1, max: 12 }),
    param('year').isInt({ min: 2000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const monthParam = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    const academicYear = getAcademicYear(monthParam, year);

    try {
      // 1️⃣ Creazione/recupero timesheet globale
      await db.query(
        `INSERT INTO timesheet (user_id, month, academic_year, status)
         VALUES (?, ?, ?, 'vuoto')
         ON DUPLICATE KEY UPDATE id = id`,
        [req.user.id, monthParam, academicYear]
      );

      const [tsRows] = await db.query(
        `SELECT id, status
         FROM timesheet
         WHERE user_id = ? AND month = ? AND academic_year = ?`,
        [req.user.id, monthParam, academicYear]
      );

      const timesheetId = tsRows[0].id;

      //  Recupero dei progetti assegnati all'utente
      const [projects] = await db.query(
        `SELECT pa.project_id, p.name
         FROM project_assignments pa
         JOIN projects p ON p.id = pa.project_id
         WHERE pa.user_id = ?`,
        [req.user.id]
      );

      //  Creazione righe in timesheet_project_status se non esistono
      for (const proj of projects) {
        await db.query(
          `INSERT INTO timesheet_project_status (timesheet_id, project_id, user_id, status)
           VALUES (?, ?, ?, 'assegnato')
           ON DUPLICATE KEY UPDATE id = id`,
          [timesheetId, proj.project_id, req.user.id]
        );
      }

      //  Recupero lo stato dei singoli progetti
      const [projectStatusRows] = await db.query(
        `SELECT project_id, status, reopening_note
         FROM timesheet_project_status
         WHERE timesheet_id = ? AND user_id = ?`,
        [timesheetId, req.user.id]
      );

      res.json({
        success: true,
        timesheetId,
        month: monthParam,
        year,
        academicYear,
        status: tsRows[0].status, // stato globale del timesheet
        projects: projectStatusRows // array con stato di ciascun progetto
      });

    } catch (err) {
      console.error("Errore creazione/recupero timesheet:", err);
      return res.status(500).json({ success: false, message: "Errore interno" });
    }
  }
);



/* ============================================================================
   RECUPERO ATTIVITÀ DEL DOCENTE
============================================================================ */
const COLLATE = 'utf8mb4_general_ci';

router.get(
  '/:year/:month/activities',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['activities.read_own']),
  [
      param('month').isInt({ min: 1, max: 12 }),
      param('year').isInt({ min: 2000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const monthParam = parseInt(req.params.month);
    const monthIndex = monthParam - 1;
    const year = parseInt(req.params.year);
    const academicYear = getAcademicYear(monthParam, year);

    const startOfMonth = `${year}-${String(monthParam).padStart(2,'0')}-01`;
    const endOfMonth   = `${year}-${String(monthParam).padStart(2,'0')}-${new Date(year, monthIndex + 1, 0).getDate()}`;

    try {
        const [ts] = await db.query(
            `SELECT * FROM timesheet
             WHERE user_id = ? AND month = ? AND academic_year = ?`,
            [req.user.id, monthParam, academicYear]
        );
        if (ts.length === 0) 
            return res.status(404).json({ success: false, message: "Timesheet non trovato" });

        // ==========================
        // Recupero attività direttamente dalla view
        // ==========================
      const [activities] = await db.query(`
  SELECT *
  FROM view_timesheet_activities a
  WHERE (
    a.user_id = ?
    OR a.activity_type COLLATE utf8mb4_general_ci IN ('diary','institutional')
  )
  AND (a.start_date IS NULL OR a.start_date <= ?)
  AND (a.end_date IS NULL OR a.end_date >= ?)
`, [req.user.id, endOfMonth, startOfMonth]);

        // ==========================
        // Ore calcolate
        // ==========================
        const hoursData = await getActivitiesHoursByUser(req.user.id);
        const hoursMap = {};
        hoursData.forEach(h => { hoursMap[`${h.activity_type}_${h.activity_id}`] = h; });

        const activitiesMapped = activities.map(act => {
          const key = `${act.activity_type}_${act.activity_id}`;
          const hours = hoursMap[key] || {};

          return {
            id: act.activity_id,
            project_id: act.project_id,          
            activity_type: act.activity_type,
            activity_name: act.activity_name,
            activity_code: act.activity_code || null,
            project_name: act.project_name || null,
            workpackage_code: act.workpackage_code || null,
            assigned_hours: hours.assigned_hours !== undefined ? Number(hours.assigned_hours) 
                              : (act.assigned_hours ? Number(act.assigned_hours) : 0),
            used_hours: hours.used_hours ? Number(hours.used_hours) : 0,
            remaining_hours: hours.remaining_hours !== undefined ? Number(hours.remaining_hours) : null,
            days: {}
          };
        });

        res.json({ success: true, timesheetId: ts[0].id, activities: activitiesMapped });

    } catch (err) {
        console.error("Errore recupero attività timesheet:", err);
        return res.status(500).json({ success: false, message: "Errore interno server" });
    }
  }
);



/* ============================================================================
   SALVA O AGGIORNA LE ORE DI UN TIMESHEET
============================================================================ */
router.post(
  '/:timesheetId/entries',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['timesheet.update_own']),
  [
    param('timesheetId').isInt({ min: 1 }),
    body('entries.*.project_id').optional().isInt({ min: 1 }),
    body('entries.*.project_id').optional().isInt({ min: 1 }),
    body('entries').isArray(),
    body('entries.*.type').isIn(['teaching', 'workpackage', 'project', 'diary','institutional']),
    body('entries.*.activity_id').isInt({ min: 1 }),
    body('entries.*.day').isInt({ min: 1, max: 31 }),
    body('entries.*.hours').optional().isFloat({ min: 0 }),
    body('entries.*.academic_hours').optional().isFloat({ min: 0 }),
    body('entries.*.start_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('entries.*.end_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  ],
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    

    const timesheetId = parseInt(req.params.timesheetId);
    const { entries } = req.body;

    const connection = await db.getConnection();
    await connection.beginTransaction();



    try {

        // ===================================================
  // CONTROLLO STATO TIMESHEET (OBBLIGATORIO)
  // ===================================================
  const [[tsStatus]] = await connection.query(
    `SELECT status FROM timesheet WHERE id = ? AND user_id = ?`,
    [timesheetId, req.user.id]
  );

  if (!tsStatus) {
    throw new Error('Timesheet non trovato');
  }

// ===================================================
//  BLOCCO ATTIVITÀ ORDINARIE SE TIMESHEET APPROVATO / RENDICONTATO
// ===================================================
const ORDINARY_TYPES = ['teaching', 'diary', 'institutional'];
const LOCKED_TIMESHEET_STATUSES = ['approvato', 'rendicontato'];

if (LOCKED_TIMESHEET_STATUSES.includes(tsStatus.status)) {

  const ordinaryIncoming = entries.filter(e =>
    ORDINARY_TYPES.includes(e.type)
  );

  if (ordinaryIncoming.length > 0) {
    throw {
      code: 'TIMESHEET_LOCKED',
      message: `Timesheet ${tsStatus.status}: attività ordinarie non modificabili`
    };
  }
}

  // ===================================================
// MAPPA STATI PROGETTI DEL TIMESHEET
// ===================================================
const [projectStatusRows] = await connection.query(
  `
  SELECT project_id, status
  FROM timesheet_project_status
  WHERE timesheet_id = ? AND user_id = ?
  `,
  [timesheetId, req.user.id]
);

const projectStatusMap = {};
projectStatusRows.forEach(p => {
  projectStatusMap[p.project_id] = p.status;
});

function isProjectEditable(projectId) {
  const status = projectStatusMap[projectId];
  return ['assegnato', 'riaperto'].includes(status);
}

      // ===================================================
      // Verifica ownership timesheet
      // ===================================================
      const [[ts]] = await connection.query(
        `SELECT month, academic_year
         FROM timesheet
         WHERE id = ? AND user_id = ?`,
        [timesheetId, req.user.id]
      );

      if (!ts) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Timesheet non valido' });
      }

      const { month } = ts;


      // ===================================================
      // Recupero ENTRIES ESISTENTI (VIEW)
      // ===================================================
      const [existingEntries] = await connection.query(
        `
     SELECT
  type,
  activity_id,
  day,
    project_id,
  CASE
    WHEN type COLLATE utf8mb4_general_ci IN ('workpackage','project')
      THEN COALESCE(hours, 0)

    WHEN type COLLATE utf8mb4_general_ci = 'teaching'
      THEN COALESCE(academic_hours, 0)

    ELSE COALESCE(hours, 0)
  END AS existingHours
FROM view_timesheet_entries
WHERE timesheet_id = ?
  AND user_id = ?
        `,
        [timesheetId, req.user.id]
      );

console.log('DEBUG existingEntries:', existingEntries);

      // Set delle entries ricevute dal frontend
      const incomingSet = new Set(
        entries.map(e => `${e.type}_${e.activity_id}_${e.day}`)
      );

      // --- CHECK ORDINARY HOURS PER TEACHING/DIARY/INSTITUTIONAL ---
if (tsStatus.status === 'inviato') {
  await checkOrdinaryInternalAdjustment({
    connection,
    timesheetId,
    userId: req.user.id,
    proposedEntries: entries
  });
}

    
// ===================================================
// BLOCCO CONTROLLO E INSERIMENTO/DELETE ENTRIES
// ===================================================

// --- BLOCCO CONTROLLO E FILTRO ENTRIES ---
const projectRelatedEntries = entries.filter(e => ['project', 'workpackage'].includes(e.type));

const modifiedProjectEntries = projectRelatedEntries.filter(e => {
  const existing = existingEntries.find(
    ex => ex.type === e.type && ex.activity_id === e.activity_id && ex.day === e.day
  );
  if (!existing) return true; // nuova entry
  const incomingHours = e.hours ?? e.academic_hours ?? 0;
  return Number(existing.existingHours) !== Number(incomingHours);
});

const blockedEntries = []; // entries che non si possono salvare

for (const e of modifiedProjectEntries) {
  if (!e.project_id) {
    blockedEntries.push({ ...e, reason: 'PROJECT_ID_MISSING' });
    console.warn('ENTRY BLOCCATA:', e, '→ Manca project_id');
    continue;
  }

  const status = projectStatusMap[e.project_id];
  if (!status) {
    blockedEntries.push({ ...e, reason: 'PROJECT_STATUS_NOT_FOUND' });
    console.warn('ENTRY BLOCCATA:', e, '→ Stato progetto non trovato');
    continue;
  }

  if (!['assegnato', 'riaperto'].includes(status)) {
    blockedEntries.push({ ...e, reason: `PROJECT_LOCKED (${status})` });
    console.warn('ENTRY BLOCCATA:', e, `→ Progetto non modificabile (stato: ${status})`);
  }
}

// --- Rimuovo dal set di entries da salvare quelle bloccate ---
const entriesToSave = entries.filter(
  e => !blockedEntries.some(be =>
    be.activity_id === e.activity_id &&
    be.day === e.day &&
    be.type === e.type
  )
);


console.log('ENTRIES BLOCCATE:', blockedEntries.map(be => ({
  type: be.type,
  activity_id: be.activity_id,
  day: be.day,
  reason: be.reason
})));

// --- DELETE ENTRIES TEACHING (con flag delete) ---
for (const e of entries.filter(en => en.type === 'teaching' && en.delete)) {
  const date = buildDateFromAcademicYear(ts.academic_year, month, e.day);

  if (LOCKED_TIMESHEET_STATUSES.includes(tsStatus.status)) {
    blockedEntries.push({
      ...e,
      reason: `TIMESHEET_LOCKED (${tsStatus.status})`
    });
    continue;
  }

  const teacherTeachingId = e.activity_id; // direttamente l'id corretto

  await connection.query(
    `DELETE FROM teaching_timesheet_entries
     WHERE timesheet_id = ? AND user_id = ? AND teacher_teaching_id = ? AND date = ?`,
    [timesheetId, req.user.id, teacherTeachingId, date]
  );
}

// --- DELETE ENTRIES NON PIÙ PRESENTI ---
for (const ex of existingEntries) {
  const key = `${ex.type}_${ex.activity_id}_${ex.day}`;
  if (incomingSet.has(key)) continue; // se presente nel frontend → non cancellare

  //  BLOCCO DELETE ATTIVITÀ ORDINARIE SE TIMESHEET LOCKED
if (
  LOCKED_TIMESHEET_STATUSES.includes(tsStatus.status) &&
  ORDINARY_TYPES.includes(ex.type)
) {
  blockedEntries.push({
    ...ex,
    reason: `TIMESHEET_LOCKED (${tsStatus.status})`
  });
  console.warn(
    `[DELETE BLOCCATA] ${ex.type} activity_id=${ex.activity_id} day=${ex.day}`
  );
  continue;
}

  const date = buildDateFromAcademicYear(ts.academic_year, month, ex.day);

  // ============================
  //  BLOCCO DELETE PROJECT / WORKPACKAGE
  // ============================

  let projectAssignmentId = null;
  let workpackageId = null;
  let status = null;

  if (ex.type === 'project' || ex.type === 'workpackage') {
    
    const projectId = ex.project_id;
    if (!projectId) {
      blockedEntries.push({ ...ex, reason: 'PROJECT_ID_MISSING' });
      console.warn(`DELETE BLOCCATA: Project ID mancante`, ex);
      continue;
    }

    status = projectStatusMap[projectId] ?? null;
    if (!['assegnato', 'riaperto'].includes(status)) {
      blockedEntries.push({ ...ex, reason: `DELETE_NOT_ALLOWED (${status})` });
      console.warn(`[DELETE BLOCCATA] ${ex.type.toUpperCase()} activity_id=${ex.activity_id} project_id=${projectId} status=${status}`);
      continue;
    }

    if (ex.type === 'project') {
      projectAssignmentId = ex.activity_id;
    } else if (ex.type === 'workpackage') {
      projectAssignmentId = ex.project_assignment_id; // dalla view se presente
      workpackageId = ex.activity_id;
    }
  }

  // ============================
  // DELETE REALI
  // ============================
  if (ex.type === 'diary') {
    await connection.query(
      `DELETE FROM diary_timesheet_entries
       WHERE timesheet_id = ? AND user_id = ? AND diary_activity_id = ? AND date = ?`,
      [timesheetId, req.user.id, ex.activity_id, date]
    );
  }

  if (ex.type === 'project') {
    await connection.query(
      `DELETE FROM project_timesheet_entries
       WHERE timesheet_id = ? AND user_id = ? AND project_assignment_id = ? AND workpackage_id IS NULL AND date = ?`,
      [timesheetId, req.user.id, projectAssignmentId, date]
    );
  }

  if (ex.type === 'workpackage') {
    await connection.query(
      `DELETE FROM project_timesheet_entries
       WHERE timesheet_id = ? AND user_id = ? AND project_assignment_id = ? AND workpackage_id = ? AND date = ?`,
      [timesheetId, req.user.id, projectAssignmentId, workpackageId, date]
    );
  }

  if (ex.type === 'institutional') {
    await connection.query(
      `DELETE FROM institutional_timesheet_entries
       WHERE timesheet_id = ? AND user_id = ? AND institutional_activity_id = ? AND date = ?`,
      [timesheetId, req.user.id, ex.activity_id, date]
    );
  }
}



// ===================================================
// CALCOLO ORE TOTALI DEL TIMESHEET (PRIMA) PER TUTTE LE ATTIVITà
// ===================================================
const [[beforeTotalRow]] = await connection.query(
  `
 SELECT COALESCE(SUM(
    CASE
      WHEN v.type COLLATE utf8mb4_general_ci = 'teaching' THEN v.academic_hours
      ELSE v.hours
    END
), 0) AS total
FROM view_timesheet_entries v
WHERE v.timesheet_id = ?
  AND v.user_id = ?
  `,
  [timesheetId, req.user.id]
);

const timesheetBeforeTotalAll = Number(beforeTotalRow.total || 0);
console.log('DEBUG timesheetBeforeTotalAll:', timesheetBeforeTotalAll);
// ===================================================
// CALCOLO ORE ATTUALI DEL TIMESHEET (PRIMA) PER LA DIDATTICA
// ===================================================
const [[beforeRow]] = await connection.query(
  `
  SELECT COALESCE(SUM(
    CASE
      WHEN v.type COLLATE utf8mb4_general_ci = 'teaching' THEN v.academic_hours
      ELSE v.hours
    END
  ), 0) AS total
  FROM view_timesheet_entries v
  WHERE v.timesheet_id = ?
    AND v.user_id = ?
    AND v.type COLLATE utf8mb4_general_ci IN ('teaching','diary','institutional')
  `,
  [timesheetId, req.user.id]
);

const timesheetBeforeTotal = Number(beforeRow.total || 0);

console.log('DEBUG timesheetBeforeTotal:', timesheetBeforeTotal);

// ===================================================
// CALCOLO ORE INVIATE DAL FRONTEND
// ===================================================
const timesheetIncomingTotal = entries
  .filter(e => ['teaching','diary','institutional'].includes(e.type))
  .reduce((sum, e) => {
    return sum + Number(e.academic_hours ?? e.hours ?? 0);
  }, 0);

console.log('DEBUG timesheetIncomingTotal:', timesheetIncomingTotal);

const teachingDelta = timesheetIncomingTotal - timesheetBeforeTotal;
console.log('DEBUG teachingDelta REAL:', teachingDelta);

// ===================================================
// CALCOLO ORE TOTALI IN ARRIVO DAL FRONTEND
// ===================================================
const timesheetIncomingTotalAll = entries.reduce((sum, e) => {
  return sum + Number(e.academic_hours ?? e.hours ?? 0);
}, 0);

console.log('DEBUG timesheetIncomingTotalAll:', timesheetIncomingTotalAll);

// ===================================================
// DELTA TOTALE REALE
// ===================================================
const totalDelta = timesheetIncomingTotalAll - timesheetBeforeTotalAll;
console.log('DEBUG totalDelta REAL:', totalDelta);

// ===================================================
// CONTROLLO LIMITE ANNUALE (UNA SOLA VOLTA)
// ===================================================
if (teachingDelta > 0) {
  const yearCheck = await checkAcademicYearHours(
    connection,
    req.user.id,
    ts.academic_year,
    teachingDelta,
    'teaching'
  );

  console.log('DEBUG academic year check (FINAL):', yearCheck);

  if (yearCheck.overLimit) {
    throw {
      code: 'ACADEMIC_YEAR_LIMIT_EXCEEDED',
      details: {
        limit: yearCheck.limit,
        used_before: yearCheck.usedBefore,
        used_after: yearCheck.usedAfter,
        remaining_after: yearCheck.limit - yearCheck.usedAfter
      }
    };
  }
}

// ===================================================
// CONTROLLO LIMITE TOTALE ANNUALE
// ===================================================
if (totalDelta > 0) {
  const totalYearCheck = await checkAcademicYearTotalHours(
    connection,
    req.user.id,
    ts.academic_year,
    totalDelta
  );

  console.log('DEBUG academic year TOTAL check:', totalYearCheck);

  if (totalYearCheck.overLimit) {
    throw {
      code: 'ACADEMIC_YEAR_TOTAL_LIMIT_EXCEEDED',
      details: {
        limit: totalYearCheck.limit,
        used_before: totalYearCheck.usedBefore,
        used_after: totalYearCheck.usedAfter,
        remaining_after: totalYearCheck.limit - totalYearCheck.usedAfter,
        breakdown: totalYearCheck.breakdown
      }
    };
  }
}



      // ===================================================
      //  INSERT / UPDATE delle entries presenti
      // ===================================================
      for (const e of entriesToSave) {
 
        const {
          type,
          activity_id,
          day,
          hours,
          academic_hours,
          start_time,
          end_time,
          activity_type,
          title,
          description
        } = e;
      



   const date = buildDateFromAcademicYear(
    ts.academic_year,
    month,
    e.day
  );



          // ===================================================
  // CONTROLLO SUPERAMENTO BUDGET
  // ===================================================

 console.log('DEBUG budget check input:', { userId: req.user.id, type, activityId: activity_id, date, newHours: academic_hours ?? hours ?? 0 });

const check = await checkBudgetBeforeSave({
  connection,
  userId: req.user.id,
  type,
  activityId: activity_id,
  date,
  newHours: academic_hours ?? hours ?? 0
});

console.log('DEBUG budget check result:', check);

if (check.overBudget) {
  throw {
    code: 'BUDGET_EXCEEDED',
    details: {
      activity_type: type,
      activity_id,
      activity_name: check.activityName,
      assigned_hours: check.assigned_hours,
      used_before: check.used_before,
      used_after: check.used_after,
      remaining_after: check.remaining_after
    }
  };
}
    
        // ---------------- TEACHING ----------------
       if (type === 'teaching') {
  if (e.delete) continue; // skip cancellate

 const [[row]] = await connection.query(
  `SELECT id
   FROM teacher_teachings
   WHERE id = ? AND user_id = ?`,
  [activity_id, req.user.id]
);
if (!row) continue;

  await connection.query(
    `INSERT INTO teaching_timesheet_entries
      (timesheet_id, user_id, teacher_teaching_id, date,
       academic_hours, start_time, end_time, activity_type, title, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       academic_hours = VALUES(academic_hours),
       start_time = VALUES(start_time),
       end_time = VALUES(end_time),
       activity_type = VALUES(activity_type),
       title = VALUES(title),
       description = VALUES(description)`,
    [
      timesheetId,
      req.user.id,
      row.id,
      date,
      academic_hours,
      start_time || null,
      end_time || null,
      activity_type,
      title || null,
      description || null
    ]
  );
}
// ---------------- WORKPACKAGE ----------------
if (type === 'workpackage') {
  // Recupera l'assegnazione WP attiva per l'utente
  const [wpRows] = await connection.query(
  `SELECT id AS workpackage_assignment_id, project_assignment_id, workpackage_id
   FROM workpackage_assignments
   WHERE user_id = ? AND (workpackage_id = ? OR id = ?) AND active = 1`,
  [req.user.id, activity_id, activity_id]
);
  const wpAssign = wpRows[0];
  if (!wpAssign) continue; // WP non attivo → skip

  // LOG DI DEBUG
  console.log('DEBUG WP assign:', wpAssign);
  console.log('DEBUG Entry:', e);

  await connection.query(
    `INSERT INTO project_timesheet_entries
      (timesheet_id, user_id, project_assignment_id, workpackage_id, date, hours)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE hours = VALUES(hours)`,
    [
      timesheetId,
      req.user.id,
      wpAssign.project_assignment_id, 
      wpAssign.workpackage_id,
      date,
      hours || 0
    ]
  );
}

// ---------------- PROJECT ----------------
if (type === 'project') {

const [projRows] = await connection.query(
  `SELECT id
   FROM project_assignments
   WHERE id = ? AND user_id = ?`,
  [activity_id, req.user.id]
);
const projAssign = projRows[0];

// LOG per debug
console.log('DEBUG project assignment lookup:', {
  activity_id,
  user_id: req.user.id,
  projAssign
});

if (!projAssign) {
  console.warn(`Activity ID ${activity_id} non corrisponde a nessun project assignment attivo per l'utente.`);
  continue; 
}



await connection.query(
  `INSERT INTO project_timesheet_entries
    (timesheet_id, user_id, project_assignment_id, workpackage_id, date, hours)
   VALUES (?, ?, ?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE hours = VALUES(hours)`,
  [
    timesheetId,     
    req.user.id,    
    projAssign.id,   
    null,          
    date,           
    hours || 0       
  ]
);
}

        // ---------------- DIARY ----------------
        if (type === 'diary') {
          await connection.query(
            `INSERT INTO diary_timesheet_entries
              (timesheet_id, user_id, diary_activity_id, date, hours)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE hours = VALUES(hours)`,
            [
              timesheetId,
              req.user.id,
              activity_id,
              date,
              hours || 0
            ]
          );
        }

if (type === 'institutional') {
  await connection.query(
    `INSERT INTO institutional_timesheet_entries
      (timesheet_id, user_id, institutional_activity_id, date, hours)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE hours = VALUES(hours)`,
    [timesheetId, req.user.id, activity_id, date, hours || 0]
  );
}

      }
 // ===================================================
// AGGIORNAMENTO STATO GLOBALE TIMESHEET
// ===================================================

//  Recupera stato attuale del timesheet
const [[tsRow]] = await connection.query(
  `
  SELECT status
  FROM timesheet
  WHERE id = ? AND user_id = ?
  `,
  [timesheetId, req.user.id]
);

const currentStatus = tsRow.status;

//  Recupera gli stati dei progetti
const [projectStatuses] = await connection.query(
  `
  SELECT status
  FROM timesheet_project_status
  WHERE timesheet_id = ? AND user_id = ?
  `,
  [timesheetId, req.user.id]
);

const statuses = projectStatuses.map(p => p.status);

//  Determina il nuovo stato globale
let newStatus = currentStatus;

//  PRIORITÀ: se almeno un progetto è riaperto
if (statuses.includes('riaperto')) {
  newStatus = 'riaperto';
}

//  Tutti rendicontati
else if (statuses.length > 0 && statuses.every(s => s === 'rendicontato')) {
  newStatus = 'rendicontato';
}

//  Tutti approvati
else if (statuses.length > 0 && statuses.every(s => s === 'approvato')) {
  newStatus = 'approvato';
}

//  SOLO PRIMA DEL PRIMO INVIO
else if (['vuoto', 'inserito'].includes(currentStatus)) {

  const [[countRow]] = await connection.query(
    `
    SELECT COUNT(*) AS total
    FROM view_timesheet_entries
    WHERE timesheet_id = ? AND user_id = ?
    `,
    [timesheetId, req.user.id]
  );

  newStatus = countRow.total > 0 ? 'inserito' : 'vuoto';
}

//  Se è 'inviato', rimane inviato
//  Se è già 'approvato' o 'rendicontato', rimane tale

//  Aggiorna SOLO se cambia davvero
if (newStatus !== currentStatus) {
  await connection.query(
    `
    UPDATE timesheet
    SET status = ?
    WHERE id = ? AND user_id = ?
    `,
    [newStatus, timesheetId, req.user.id]
  );
}

      await connection.commit();
      connection.release();

     res.json({
  success: true,
  message: 'Timesheet aggiornato correttamente',
  blockedEntries: blockedEntries // array di entries che non sono state salvate
});

    } catch (err) {
      await connection.rollback();
      connection.release();

          console.error('Errore salvataggio entries:', err);
  
      // Gestione errori noti
if (err.code === 'TIMESHEET_LOCKED') {
  return res.status(200).json({
    success: false,
    code: err.code,
    message: err.message
  });
}

if (
  err.code === 'BUDGET_EXCEEDED' ||
  err.code === 'ACADEMIC_YEAR_LIMIT_EXCEEDED' ||
  err.code === 'ACADEMIC_YEAR_TOTAL_LIMIT_EXCEEDED'
) {
  return res.status(200).json({
    success: false,
    code: err.code,
    details: err.details
  });
}
  if (
  err.code === 'ORDINARY_HOURS_DELTA' ||
  err.code === 'ORDINARY_HOURS_REMOVED'
) {
    return res.status(200).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details
    });
  }

      // altri errori imprevisti
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);

/* ============================================================================
   INVIO TIMESHEET
============================================================================ */
router.post(
  '/:timesheetId/submit',
  authMiddleware,
  roleMiddleware(['docente']),
  permissionMiddleware(['timesheet.submit_own']),
  param('timesheetId').isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const timesheetId = parseInt(req.params.timesheetId);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      //  verifica timesheet
      const [[ts]] = await connection.query(
        `SELECT status
         FROM timesheet
         WHERE id = ? AND user_id = ?`,
        [timesheetId, req.user.id]
      );

      if (!ts) {
        throw new Error('Timesheet non trovato');
      }

      if (!['inserito', 'riaperto'].includes(ts.status)) {
        return res.status(400).json({
          success: false,
          message: 'Timesheet non inviabile nello stato corrente'
        });
      }

      //  verifica presenza ore progetto/WP
      const [[row]] = await connection.query(
        `
        SELECT COUNT(*) AS total
        FROM project_timesheet_entries
        WHERE timesheet_id = ?
        AND user_id = ?
        `,
        [timesheetId, req.user.id]
      );

      if (row.total === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nessuna ora progetto presente nel timesheet'
        });
      }

      // cambio stato
      await connection.query(
       `
  UPDATE timesheet
  SET status = 'inviato'
  WHERE id = ?
    AND user_id = ?
  `,
  [timesheetId, req.user.id]

      );


// aggiorna stati singoli progetti
await connection.query(
  `
  UPDATE timesheet_project_status tps
  JOIN project_assignments pa
    ON pa.project_id = tps.project_id
    AND pa.user_id = tps.user_id
  SET tps.status = 'inviato'
  WHERE tps.timesheet_id = ?
    AND tps.user_id = ?
    AND tps.status NOT IN ('approvato','rendicontato')
  `,
  [timesheetId, req.user.id]
);

      await connection.commit();
      res.json({ success: true, message: 'Timesheet inviato correttamente' });

    } catch (err) {
      await connection.rollback();
      console.error('Errore invio timesheet:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    } finally {
      connection.release();
    }
  }
);


module.exports = router;