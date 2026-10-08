// services/timesheetService.js
const db = require('../config/db');

async function getActivitiesHoursByUser(userId) {
  const [rows] = await db.query(
    `
    -- Teaching
    SELECT 
        tt.id AS activity_id,
        'teaching' AS activity_type,
        tt.assigned_hours,
        COALESCE(SUM(tte.academic_hours),0) AS used_hours,
        tt.assigned_hours - COALESCE(SUM(tte.academic_hours),0) AS remaining_hours
    FROM teacher_teachings tt
    LEFT JOIN teaching_timesheet_entries tte
           ON tte.teacher_teaching_id = tt.id
          AND tte.user_id = ?
    WHERE tt.user_id = ?
    GROUP BY tt.id, tt.assigned_hours

    UNION ALL

    -- Project senza WP
    SELECT 
        pa.id AS activity_id,
        'project' AS activity_type,
        pa.assigned_hours,
        COALESCE(SUM(pte.hours),0) AS used_hours,
        pa.assigned_hours - COALESCE(SUM(pte.hours),0) AS remaining_hours
    FROM project_assignments pa
    LEFT JOIN project_timesheet_entries pte
           ON pte.project_assignment_id = pa.id
          AND pte.workpackage_id IS NULL
          AND pte.user_id = ?
    WHERE pa.user_id = ?
    AND NOT EXISTS (
  SELECT 1
  FROM workpackage_assignments wa
  WHERE wa.user_id = ?
    AND wa.project_assignment_id = pa.id
)
    GROUP BY pa.id, pa.assigned_hours

    UNION ALL

-- Project con WP (solo se l'utente ha WP)
SELECT 
    pa.id AS activity_id,
    'project' AS activity_type,
    SUM(wa.assigned_hours) AS assigned_hours,
    SUM(COALESCE(pte_sum.used_hours,0)) AS used_hours,
    SUM(wa.assigned_hours - COALESCE(pte_sum.used_hours,0)) AS remaining_hours
FROM project_assignments pa
JOIN workpackage_assignments wa
  ON wa.project_assignment_id = pa.id
JOIN project_workpackages wp
  ON wp.id = wa.workpackage_id
LEFT JOIN (
    SELECT workpackage_id, SUM(hours) AS used_hours
    FROM project_timesheet_entries
    WHERE user_id = ?
    GROUP BY workpackage_id
) pte_sum ON pte_sum.workpackage_id = wa.workpackage_id
WHERE pa.user_id = ?
GROUP BY pa.id

    UNION ALL

    -- Workpackage
    SELECT 
        wa.id AS activity_id,
        'workpackage' AS activity_type,
        wa.assigned_hours,
        COALESCE(SUM(pte.hours),0) AS used_hours,
        wa.assigned_hours - COALESCE(SUM(pte.hours),0) AS remaining_hours
    FROM workpackage_assignments wa
    LEFT JOIN project_timesheet_entries pte
           ON pte.workpackage_id = wa.workpackage_id
          AND pte.user_id = ?
    WHERE wa.user_id = ?
    GROUP BY wa.id, wa.assigned_hours
    `,
    [
      userId, userId,
      userId, userId, userId,
      userId, userId,
      userId, userId
    ]
  );

  return rows;
}

async function checkBudgetBeforeSave({
  connection,
  userId,
  type,
  activityId,
  date,
  newHours
}) {
  if (!['teaching', 'project', 'workpackage'].includes(type)) {
    return { overBudget: false };
  }

  let assigned = 0;
  let usedTotal = 0;
  let usedThatDay = 0;
  let activityName = null;

  // ===================================================
  // TEACHING
  // ===================================================
  if (type === 'teaching') {
    const [[teach]] = await connection.query(
      `
      SELECT tt.assigned_hours, s.name AS activity_name
      FROM teacher_teachings tt
      JOIN teachings s ON s.id = tt.teaching_id
      WHERE tt.id = ? AND tt.user_id = ?
      `,
      [activityId, userId]
    );

    if (!teach) return { overBudget: false };

    assigned = Number(teach.assigned_hours) || 0;
    activityName = teach.activity_name;

    const [[tot]] = await connection.query(
      `
      SELECT COALESCE(SUM(academic_hours),0) AS used
      FROM teaching_timesheet_entries
      WHERE teacher_teaching_id = ?
        AND user_id = ?
      `,
      [activityId, userId]
    );

    const [[day]] = await connection.query(
      `
      SELECT COALESCE(academic_hours,0) AS used
      FROM teaching_timesheet_entries
      WHERE teacher_teaching_id = ?
        AND user_id = ?
        AND date = ?
      `,
      [activityId, userId, date]
    );

    usedTotal = Number(tot.used);
    usedThatDay = Number(day?.used || 0);
  }

  // ===================================================
  // PROJECT (senza WP)
  // ===================================================
  if (type === 'project') {
    const [[proj]] = await connection.query(
      `
      SELECT pa.assigned_hours, p.name AS activity_name
      FROM project_assignments pa
      JOIN projects p ON p.id = pa.project_id
      WHERE pa.id = ? AND pa.user_id = ?
      `,
      [activityId, userId]
    );

    if (!proj) return { overBudget: false };

    assigned = Number(proj.assigned_hours) || 0;
    activityName = proj.activity_name;

    const [[tot]] = await connection.query(
      `
      SELECT COALESCE(SUM(hours),0) AS used
      FROM project_timesheet_entries
      WHERE project_assignment_id = ?
        AND workpackage_id IS NULL
        AND user_id = ?
      `,
      [activityId, userId]
    );

    const [[day]] = await connection.query(
      `
      SELECT COALESCE(hours,0) AS used
      FROM project_timesheet_entries
      WHERE project_assignment_id = ?
        AND workpackage_id IS NULL
        AND user_id = ?
        AND date = ?
      `,
      [activityId, userId, date]
    );

    usedTotal = Number(tot.used);
    usedThatDay = Number(day?.used || 0);
  }

 // ===================================================
// WORKPACKAGE
// ===================================================
if (type === 'workpackage') {
const [[wp]] = await connection.query(
  `
  SELECT wa.id AS workpackage_assignment_id,
         wa.project_assignment_id,
         wa.workpackage_id,          
         wa.assigned_hours,
         wp.description AS activity_name
  FROM workpackage_assignments wa
  JOIN project_workpackages wp ON wp.id = wa.workpackage_id
  WHERE wa.id = ? AND wa.user_id = ?
  `,
  [activityId, userId]
);
  if (!wp) return { overBudget: false };

  assigned = Number(wp.assigned_hours) || 0;
  activityName = wp.activity_name;

const [[tot]] = await connection.query(
  `
  SELECT COALESCE(SUM(hours),0) AS used
  FROM project_timesheet_entries
  WHERE project_assignment_id = ?
    AND workpackage_id = ?
    AND user_id = ?
  `,
  [wp.project_assignment_id, wp.workpackage_id, userId]
);

const [[day]] = await connection.query(
  `
  SELECT COALESCE(hours,0) AS used
  FROM project_timesheet_entries
  WHERE project_assignment_id = ?
    AND workpackage_id = ?
    AND user_id = ?
    AND date = ?
  `,
  [wp.project_assignment_id, wp.workpackage_id, userId, date]
);

  usedTotal = Number(tot.used);
  usedThatDay = Number(day?.used || 0);
}


  // ===================================================
  // CALCOLO FINALE
  // ===================================================
  const usedAfter =
    usedTotal - usedThatDay + (Number(newHours) || 0);

  return {
    overBudget: usedAfter > assigned,
    activityName,
    assigned_hours: assigned,
    used_before: usedTotal,
    used_after: usedAfter,
    remaining_after: assigned - usedAfter
  };
}

async function checkAcademicYearHours(connection, userId, academicYear, newHours = 0, type = 'teaching') {
  if (!['teaching', 'all'].includes(type)) {
    throw new Error('Tipo non valido: deve essere teaching o all');
  }

  // Recupera i limiti dell'utente
  const [[limitRow]] = await connection.query(
    `SELECT max_teaching_hours, max_total_hours
     FROM teacher_hour_limits
     WHERE user_id = ? AND academic_year = ?`,
    [userId, academicYear]
  );

  if (!limitRow) {
    throw new Error(`Nessun limite definito per l'utente ${userId} nell'anno ${academicYear}`);
  }

  const limit = type === 'teaching' ? Number(limitRow.max_teaching_hours) : Number(limitRow.max_total_hours);

 // ================================
// Ore già utilizzate dai timesheet
// ================================
let [[usedRow]] = await connection.query(
  `
  SELECT COALESCE(SUM(
    CASE
      WHEN v.type COLLATE utf8mb4_general_ci = 'teaching' THEN v.academic_hours
      ELSE v.hours
    END
  ), 0) AS used
  FROM view_timesheet_entries v
  JOIN timesheet t ON t.id = v.timesheet_id
  WHERE v.user_id = ?
    AND t.academic_year = ?
    ${type === 'teaching' ? "AND v.type COLLATE utf8mb4_general_ci IN ('teaching','diary','institutional')" : ""}
  `,
  [userId, academicYear]
);

  const timesheetUsed = Number(usedRow.used || 0);

  // ================================
  // Ore diary annuali inserite direttamente
  // ================================
  let [[diaryRow]] = await connection.query(
    `
    SELECT COALESCE(SUM(hours), 0) AS diary_annual
    FROM diary_annual_entries
    WHERE user_id = ?
      AND academic_year = ?
    `,
    [userId, academicYear]
  );

  const diaryAnnualUsed = Number(diaryRow.diary_annual || 0);

  // ================================
  // Totale ore utilizzate + ore nuove
  // ================================
  const usedBefore = timesheetUsed + diaryAnnualUsed;
  const usedAfter = usedBefore + Number(newHours);

  return {
    overLimit: usedAfter > limit,
    limit,
    usedBefore,
    usedAfter
  };
}

async function checkAcademicYearTotalHours(
  connection,
  userId,
  academicYear,
  newHours = 0
) {
  // ================================
  // Recupero limite totale
  // ================================
  const [[limitRow]] = await connection.query(
    `
    SELECT max_total_hours
    FROM teacher_hour_limits
    WHERE user_id = ? AND academic_year = ?
    `,
    [userId, academicYear]
  );

  if (!limitRow) {
    throw new Error(
      `Nessun limite definito per l'utente ${userId} nell'anno ${academicYear}`
    );
  }

  const limit = Number(limitRow.max_total_hours);

  // ================================
  // TEACHING (academic_hours)
  // ================================
  const [[teachingRow]] = await connection.query(
    `
    SELECT COALESCE(SUM(t.academic_hours), 0) AS total
    FROM teaching_timesheet_entries t
    JOIN timesheet ts ON ts.id = t.timesheet_id
    WHERE t.user_id = ?
      AND ts.academic_year = ?
    `,
    [userId, academicYear]
  );

  // ================================
  // DIARY da timesheet
  // ================================
  const [[diaryTsRow]] = await connection.query(
    `
    SELECT COALESCE(SUM(d.hours), 0) AS total
    FROM diary_timesheet_entries d
    JOIN timesheet ts ON ts.id = d.timesheet_id
    WHERE d.user_id = ?
      AND ts.academic_year = ?
    `,
    [userId, academicYear]
  );

  // ================================
  // DIARY annuale
  // ================================
  const [[diaryAnnualRow]] = await connection.query(
    `
    SELECT COALESCE(SUM(hours), 0) AS total
    FROM diary_annual_entries
    WHERE user_id = ?
      AND academic_year = ?
    `,
    [userId, academicYear]
  );

  // ================================
  // INSTITUTIONAL
  // ================================
  const [[institutionalRow]] = await connection.query(
    `
    SELECT COALESCE(SUM(i.hours), 0) AS total
    FROM institutional_timesheet_entries i
    JOIN timesheet ts ON ts.id = i.timesheet_id
    WHERE i.user_id = ?
      AND ts.academic_year = ?
    `,
    [userId, academicYear]
  );

  // ================================
  // PROGETTI / WP
  // ================================
  const [[projectRow]] = await connection.query(
    `
    SELECT COALESCE(SUM(p.hours), 0) AS total
    FROM project_timesheet_entries p
    JOIN timesheet ts ON ts.id = p.timesheet_id
    WHERE p.user_id = ?
      AND ts.academic_year = ?
    `,
    [userId, academicYear]
  );

  // ================================
  // Totali
  // ================================
  const usedBefore =
    Number(teachingRow.total) +
    Number(diaryTsRow.total) +
    Number(diaryAnnualRow.total) +
    Number(institutionalRow.total) +
    Number(projectRow.total);

  const usedAfter = usedBefore + Number(newHours);

  return {
    overLimit: usedAfter > limit,
    limit,
    usedBefore,
    usedAfter,
    breakdown: {
      teaching: Number(teachingRow.total),
      diary_timesheet: Number(diaryTsRow.total),
      diary_annual: Number(diaryAnnualRow.total),
      institutional: Number(institutionalRow.total),
      projects: Number(projectRow.total)
    }
  };
}

/**
 * Controlla l'aggiustamento interno delle ore ordinarie (teaching, diary, institutional)
 * Blocca qualsiasi modifica che cambi la somma totale giornaliera,
 * comprese le cancellazioni o le aggiunte non autorizzate.
 */
async function checkOrdinaryInternalAdjustment({ connection, timesheetId, userId, proposedEntries }) {
  // entries correnti
  const [currentRows] = await connection.query(
    `
    SELECT type, day,
           COALESCE(academic_hours, hours, 0) AS hours
    FROM view_timesheet_entries
    WHERE timesheet_id = ? AND user_id = ?
      AND type COLLATE utf8mb4_general_ci IN ('teaching','diary','institutional')
    `,
    [timesheetId, userId]
  );

  // Raggruppa le ore correnti per giorno
  const currentByDay = {};
  for (const row of currentRows) {
    if (!currentByDay[row.day]) currentByDay[row.day] = 0;
    currentByDay[row.day] += Number(row.hours);
  }

  // Raggruppa le ore proposte per giorno
  const proposedByDay = {};
  for (const entry of proposedEntries.filter(e => ['teaching','diary','institutional'].includes(e.type))) {
    const day = entry.day;
    const hours = Number(entry.academic_hours ?? entry.hours ?? 0);
    if (!proposedByDay[day]) proposedByDay[day] = 0;
    proposedByDay[day] += hours;
  }

  // Considera tutti i giorni da controllare
  const allDays = new Set([
    ...Object.keys(currentByDay).map(Number),
    ...Object.keys(proposedByDay).map(Number)
  ]);

  // Controlli
for (const day of allDays) {
  const currentTotal = currentByDay[day] ?? 0;
  const proposedTotal = proposedByDay[day] ?? 0;

  // Giorno che aveva ore → non può sparire completamente
  if (currentTotal > 0 && proposedTotal === 0) {
    throw {
      code: 'ORDINARY_HOURS_REMOVED',
      message: `Non puoi cancellare tutte le ore ordinarie del giorno ${day}.`,
      details: { day, currentTotal, proposedTotal }
    };
  }

  //Inserimento su giorno senza ordinarie
  if (currentTotal === 0 && proposedTotal > 0) {
    throw {
      code: 'ORDINARY_HOURS_DELTA',
      message: `Non puoi inserire ore in un giorno senza attività ordinarie (${day}).`,
      details: { day, currentTotal, proposedTotal }
    };
  }

  // Qualsiasi variazione di totale
  if (proposedTotal !== currentTotal) {
    throw {
      code: 'ORDINARY_HOURS_DELTA',
      message: `Non puoi modificare la somma totale delle ore ordinarie per il giorno ${day}.`,
      details: { day, currentTotal, proposedTotal }
    };
  }
}

  return true;
}








module.exports = {
  getActivitiesHoursByUser,
  checkBudgetBeforeSave,
  checkAcademicYearHours,
  checkAcademicYearTotalHours,
  checkOrdinaryInternalAdjustment 
};