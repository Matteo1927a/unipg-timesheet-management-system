const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');
const db = require('../config/db');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { body, query,param, validationResult } = require('express-validator');


//HELPER

function mapYearToAcademicYear(year, month) {
  const y = parseInt(year);

  if (month >= 10) { // ottobre-dicembre
    const nextYearShort = (y + 1).toString().slice(-2); // ultime 2 cifre
    return `${y}/${nextYearShort}`; 
  } else { // gennaio-settembre
    const prevYearShort = (y - 1).toString().slice(-2); // ultime 2 cifre
    return `${y - 1}/${y.toString().slice(-2)}`; 
  }
}
function decimalToTime(hoursDecimal) {
  const hours = Math.floor(hoursDecimal);          
  const minutes = Math.round((hoursDecimal - hours) * 60); 
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function getCellByDefinedName(workbook, sheet, name) {
  const defined = workbook.definedNames.model.find(d => d.name === name);
  if (!defined) throw new Error(`Nome definito ${name} non trovato`);

  // Prendi il primo range e rimuovi il nome del foglio
  const range = defined.ranges[0]; // es: 'Template!$F$7'
  const address = range.split('!')[1]; // '$F$7'

  return sheet.getCell(address);
}

function findCellsByText(sheet, searchText) {
  const matches = [];

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (
        typeof cell.value === 'string' &&
        cell.value.trim().toLowerCase() === searchText.toLowerCase()
      ) {
        matches.push(cell);
      }
    });
  });

  return matches;
}



const mesi = [
  '', // placeholder per indice 0
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

/* ============================================================================
   FILTRI PROGETTO PER REPORT
============================================================================ */
router.get(
  '/filters',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware (['projects.read']),
  async (req, res) => {
    try {
      // prendi solo progetti aperti o in rendicontazione
      const [projects] = await db.query(`
        SELECT id, name, start_date, end_date
        FROM projects
        WHERE status IN ('aperto', 'rendicontato')
        ORDER BY start_date ASC
      `);

      res.json(projects);

    } catch (err) {
      console.error('Errore recupero filtri progetti:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);


/* ============================================================================
   RECUPERO UTENTI ASSEGNATI AL PROGETTO
============================================================================ */
router.get(
  '/:projectId/users',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware (['projects.read_anagrafica']),

  async (req, res) => {
    const { projectId } = req.params;

    try {
      const [users] = await db.query(`
        SELECT u.id, u.first_name, u.last_name
        FROM users u
        INNER JOIN project_assignments pa ON pa.user_id = u.id
        WHERE pa.project_id = ?
        ORDER BY u.last_name, u.first_name
      `, [projectId]);

      res.json(users);

    } catch (err) {
      console.error('Errore recupero utenti progetto:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);

/* ============================================================================
   CREAZIONE REPORT DI UN PROGETTO PER UN UTENTE
============================================================================ */
router.get(
  '/:projectId/generate_report',
  authMiddleware,
  roleMiddleware(['responsabile_amministrativo']),
  permissionMiddleware(['projects.read']),
  [
    param('projectId').isInt({ min: 1 }),
    query('userId').isInt({ min: 1 }),
    query('month').isInt({ min: 1, max: 12 }),
    query('year').isInt({ min: 2000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { projectId } = req.params;
    const { userId, month, year } = req.query;

    try {
      //  Recupera progetto
   const [[project]] = await db.query(
  `SELECT
     id,
     name,
     cup_code,
     project_code,
     entity_name,
     banner_path
   FROM projects
   WHERE id = ?`,
  [projectId]
);
      if (!project) return res.status(404).json({ success: false, message: 'Progetto non trovato' });

      //  Recupera utente e ruolo
      const [[user]] = await db.query(
        `SELECT u.first_name, u.last_name, u.fiscal_code, pr.name AS ruolo
         FROM users u
         JOIN project_assignments pa ON pa.user_id = u.id
         LEFT JOIN project_roles pr ON pr.id = pa.role_id
         WHERE pa.project_id = ? AND u.id = ?`,
        [projectId, userId]
      );
      if (!user) return res.status(404).json({ success: false, message: 'Utente non assegnato al progetto' });

      // Monte ore annuo
      const academicYear = mapYearToAcademicYear(year, month);
      const [limits] = await db.query(
        `SELECT max_total_hours 
         FROM teacher_hour_limits 
         WHERE user_id = ? AND academic_year = ?`,
        [userId, academicYear]
      );
      const monteOreAnnue = limits.length ? limits[0].max_total_hours : 0;
      const monteOreFormattato = `${parseInt(monteOreAnnue)}*`;

      //  Recupera WP del progetto
      const [workpackages] = await db.query(
        `SELECT id, code, description
         FROM project_workpackages
         WHERE project_id = ?`,
        [projectId]
      );

      // Recupera timesheet del mese
      const [timesheetsMonth] = await db.query(
        `SELECT id, user_id, status
         FROM timesheet
         WHERE month = ?
           AND academic_year = ?
           AND status IN ('inviato','approvato','rendicontato')
           AND user_id = ?`,
        [month, academicYear, userId]
      );
      const timesheetIdsMonth = timesheetsMonth.map(t => t.id);
      if (!timesheetIdsMonth.length)
        return res.status(404).json({ success: false, message: 'Nessun timesheet trovato per il mese e utente selezionato' });

      //  Recupera entries del mese per utente selezionato
      const [entries] = await db.query(
        `SELECT
           pte.user_id,
           u.first_name,
           u.last_name,
           t.status AS timesheet_status,
           CASE
               WHEN tps.status IS NOT NULL THEN tps.status
               ELSE t.status
           END AS project_status,
           wp.id AS wp_id,
           wp.code AS wp_code,
           pte.date,
           pte.hours
         FROM project_timesheet_entries pte
         JOIN timesheet t ON t.id = pte.timesheet_id
         JOIN users u ON u.id = pte.user_id
         JOIN project_assignments pa ON pa.id = pte.project_assignment_id
         LEFT JOIN project_workpackages wp ON wp.id = pte.workpackage_id
         LEFT JOIN timesheet_project_status tps
           ON tps.timesheet_id = pte.timesheet_id
          AND tps.project_id = pa.project_id
          AND tps.user_id = pte.user_id
         WHERE pa.project_id = ?
           AND pte.timesheet_id IN (?)
           AND pte.user_id = ?
         ORDER BY pte.date;`,
        [projectId, timesheetIdsMonth, userId]
      );


const [otherProjectEntries] = await db.query(
  `SELECT
     pa.project_id,
     p.name AS project_name,
     pte.date,
     pte.hours
   FROM project_timesheet_entries pte
   JOIN timesheet t ON t.id = pte.timesheet_id
   JOIN project_assignments pa ON pa.id = pte.project_assignment_id
   JOIN projects p ON p.id = pa.project_id
   WHERE pte.timesheet_id IN (?)
     AND pte.user_id = ?
     AND t.status IN ('inviato','approvato','rendicontato')
     AND pa.project_id <> ?
   ORDER BY pte.date`,
  [timesheetIdsMonth, userId, projectId]
);
      

      //  Costruzione struttura report
      const membersMap = {};
      membersMap[userId] = {
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`,
        label: 'Attività svolta sul progetto ',
        type: 'project_main',
        days: {},
        subRows: [],
        others: [],
        ordinary: { days: {} }
      };
      const member = membersMap[userId];

//  Raggruppa ore WP per giorno
const wpTotals = {};
entries.forEach(e => {
  if (!['inviato','approvato','rendicontato'].includes(e.project_status)) return;

  if (e.wp_id) {
    let wpRow = member.subRows.find(w => w.wpId === e.wp_id);
    if (!wpRow) {
      const wpFromDb = workpackages.find(wp => wp.id === e.wp_id);
      wpRow = {
        wpId: e.wp_id,
        label: wpFromDb?.description || e.wp_code,
        type: 'wp',
        days: {}
      };
      member.subRows.push(wpRow);
    }
    wpRow.days[e.date] = (wpRow.days[e.date] || 0) + Number(e.hours);

    // Somma totale per la riga principale
    wpTotals[e.date] = (wpTotals[e.date] || 0) + Number(e.hours);
  } else {
    // Solo ore senza WP
    member.days[e.date] = (member.days[e.date] || 0) + Number(e.hours);
  }
});



      otherProjectEntries.forEach(e => {
  let proj = member.others.find(p => p.projectId === e.project_id);

  if (!proj) {
    proj = {
      projectId: e.project_id,
      label: e.project_name,
      cup: e.cup_code,
      type: 'project_other',
      days: {}
    };
    member.others.push(proj);
  }

  proj.days[e.date] = (proj.days[e.date] || 0) + Number(e.hours);
});


      // --------------------
// Recupero ore attività ordinaria (teaching, diary, institutional)
// --------------------
const ordinaryEntries = [];

// Recupera tutte le entries del mese per l'utente
for (const tsId of timesheetIdsMonth) {
  const [entriesRaw] = await db.query(`
    SELECT *
    FROM view_timesheet_entries
    WHERE timesheet_id = ?
      AND user_id = ?
  `, [tsId, userId]);

entriesRaw.forEach(e => {
  if (!e.day) return;

  let ore = 0;

  if (e.type === 'teaching') {
    ore = Number(e.academic_hours || 0);
  } else if (['diary', 'institutional'].includes(e.type)) {
    ore = Number(e.hours || 0);
  }

  if (ore > 0) {
    ordinaryEntries.push({
      day: e.day,
      hours: ore
    });
  }
});
}

// Somma ore ordinarie per giorno
ordinaryEntries.forEach(e => {
  member.ordinary.days[e.day] = (member.ordinary.days[e.day] || 0) + e.hours;
});

      // ---------- LOG ATTIVITÀ ----------
      console.log('--- Log attività per report ---');
      console.log(`Utente: ${member.userName}`);
      console.log('Progetto principale:');
      Object.entries(member.days).forEach(([date, hours]) => {
        console.log(`  ${date}: ${hours} ore`);
      });

      if (member.subRows.length) {
        console.log('Workpackages:');
        member.subRows.forEach(wp => {
          console.log(`  WP: ${wp.label}`);
          Object.entries(wp.days).forEach(([date, hours]) => {
            console.log(`    ${date}: ${hours} ore`);
          });
        });
      }

      if (member.others?.length) {
        console.log('Altri progetti:');
        member.others.forEach(proj => {
          console.log(`  Progetto: ${proj.label}`);
          Object.entries(proj.days).forEach(([date, hours]) => {
            console.log(`    ${date}: ${hours} ore`);
          });
        });
      }

      if (member.ordinary) {
        console.log('Attività ordinaria:');
        Object.entries(member.ordinary.days).forEach(([date, hours]) => {
          console.log(`  ${date}: ${hours} ore`);
        });
      }
      console.log('--- Fine log attività ---');


      function getRowByDefinedName(workbook, sheet, definedName) {
  const dn = workbook.definedNames.model.find(
    n => n.name === definedName
  );

  if (!dn)
    throw new Error(`Defined name "${definedName}" non trovato nel file Excel`);

  
  const range = dn.ranges[0];

  // togli nome foglio
  const cellRange = range.includes('!')
    ? range.split('!')[1]
    : range;

  const firstCell = cellRange.split(':')[0];

  
  const rowNumber = parseInt(firstCell.match(/\d+/)[0], 10);

  return sheet.getRow(rowNumber);
}

function writeHours(cell, hours) {
  if (hours == null) return;
  cell.value = Number(hours) / 24;
  cell.numFmt = '[h]:mm';
}

// ----------  Genera Excel ----------
// Se il progetto ha WP, usa il template con righe WP, altrimenti quello normale
const templateFile = member.subRows.length > 0
  ? '../templates/template_with_wp.xlsx'  // template con righe WP
  : '../templates/template.xlsx';          // template normale

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(path.join(__dirname, templateFile));

const sheet = workbook.getWorksheet('Template');

// ================================
// BANNER PROGETTO (se presente)
// ================================
if (project.banner_path) {
  const bannerAbsolutePath = path.join(
    __dirname,
    '..',
    project.banner_path
  );

  if (fs.existsSync(bannerAbsolutePath)) {
    const imageId = workbook.addImage({
      filename: bannerAbsolutePath,
      extension: path.extname(bannerAbsolutePath).replace('.', '')
    });

    // Inserisce il banner in alto (A1 → AF4)
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      br: { col: 31, row: 4 }
    });

    // Migliora resa grafica
    for (let r = 1; r <= 4; r++) {
      sheet.getRow(r).height = 35;
    }

    console.log('Banner progetto inserito nel report');
  } else {
    console.warn('Banner non trovato:', bannerAbsolutePath);
  }
}




console.log(
  'Defined names trovati:',
  workbook.definedNames.model.map(n => ({
    name: n.name,
    ranges: n.ranges
  }))
);

// ================================
// INTESTAZIONI
// ================================
const nomeMese = mesi[parseInt(month)];
getCellByDefinedName(workbook, sheet, 'titoloProgetto').value = project.name;
getCellByDefinedName(workbook, sheet, 'cupProgetto').value = project.cup_code;
getCellByDefinedName(workbook, sheet, 'codiceProgetto').value = project.project_code;
getCellByDefinedName(workbook, sheet, 'denominazioneSoggetto').value = project.entity_name;
getCellByDefinedName(workbook, sheet, 'figuraProfessionale').value = user.ruolo || '';
getCellByDefinedName(workbook, sheet, 'nomeUtente').value = user.first_name;
getCellByDefinedName(workbook, sheet, 'cognomeUtente').value = user.last_name;
getCellByDefinedName(workbook, sheet, 'codiceFiscale').value = user.fiscal_code;
getCellByDefinedName(workbook, sheet, 'monteOreAnnue').value = monteOreFormattato;
getCellByDefinedName(workbook, sheet, 'meseRiferimento').value = nomeMese;
getCellByDefinedName(workbook, sheet, 'annoRiferimento').value = parseInt(year);
getCellByDefinedName(workbook, sheet, 'intestazioneMeseAnno').value =
  `Mese di ${nomeMese} ${year}`;

// ================================
// GIORNI DEL MESE
// ================================
const daysInMonth = new Date(year, month, 0).getDate();
const startColumnIndex = 2;
const headerRow = 17;

for (let day = daysInMonth + 1; day <= 31; day++) {
  sheet.getColumn(startColumnIndex + (day - 1)).hidden = true;
  sheet.getCell(headerRow, startColumnIndex + (day - 1)).value = '';
}

// ================================
// RIGA ATTIVITÀ SUL PROGETTO (senza WP)
// ================================
const projectRow = getRowByDefinedName(workbook, sheet, 'riga_attivita_progetto');
projectRow.getCell(1).value = member.label;

// Somma ore WP + progetto principale
const daysSum = {};

// Ore WP
member.subRows.forEach(wp => {
  Object.entries(wp.days).forEach(([date, hours]) => {
    daysSum[date] = (daysSum[date] || 0) + Number(hours);
  });
});

// Ore progetto principale senza WP
Object.entries(member.days).forEach(([date, hours]) => {
  daysSum[date] = (daysSum[date] || 0) + Number(hours);
});

// Scrivi nella riga principale
Object.entries(daysSum).forEach(([date, hours]) => {
  const day = new Date(date).getDate();
 writeHours(
  projectRow.getCell(startColumnIndex + (day - 1)),
  hours
);
});

if (member.subRows.length > 0) {
  const wpRowNames = ['riga_wp1', 'riga_wp2', 'riga_wp3'];

  member.subRows.forEach((wp, index) => {
    if (index >= wpRowNames.length) return; // gestire massimo 3 WP

    const wpRow = getRowByDefinedName(workbook, sheet, wpRowNames[index]);
    wpRow.getCell(1).value = wp.label;

    Object.entries(wp.days).forEach(([date, hours]) => {
      const day = new Date(date).getDate();
      writeHours(
  wpRow.getCell(startColumnIndex + (day - 1)),
  hours
);
    });
  });
}



// ================================
// ATTIVITÀ ORDINARIA (RIGA FISSA)
// ================================
const ordinaryRow = getRowByDefinedName(workbook, sheet, 'riga_attivita_ordinaria');
ordinaryRow.getCell(1).value = 'Attività ordinaria';

Object.entries(member.ordinary.days).forEach(([date, hours]) => {
  const day = Number(date); // <-- converto la chiave stringa in numero
writeHours(
  ordinaryRow.getCell(startColumnIndex + (day - 1)),
  hours
);
  console.log(`Scrivo ${hours} ore nella colonna ${startColumnIndex + (day - 1)}`);
});

// ================================
// ALTRI PROGETTI (cup1, cup2, cup3)
// ================================
const cupRowNames = [
  'riga_cup1',
  'riga_cup2',
  'riga_cup3'
];

member.others.slice(0, 3).forEach((proj, index) => {
  const rowName = cupRowNames[index];
  const row = getRowByDefinedName(workbook, sheet, rowName);

  // Nome progetto in colonna A
  row.getCell(1).value = proj.label;

  // Inserisci ore per giorno
  Object.entries(proj.days).forEach(([date, hours]) => {
    const day = new Date(date).getDate();
    writeHours(
  row.getCell(startColumnIndex + (day - 1)),
  hours
);
  });
});
      // ---------- Invia Excel ----------
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=Report_${user.last_name}_${user.first_name}_${month}_${year}.xlsx`
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(buffer);

    } catch (err) {
      console.error('Errore generazione report:', err);
      res.status(500).json({ success: false, message: 'Errore interno server' });
    }
  }
);




module.exports = router;