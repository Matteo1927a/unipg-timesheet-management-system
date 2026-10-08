require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

// ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const timesheetRoutes = require('./routes/timesheet');
const diaryRoutes = require('./routes/diary');
const projectsRoutes = require('./routes/projects');
const reportRoutes =  require('./routes/report');
const didatticaRoutes =  require('./routes/didattica');
const reportProjectsRoutes = require('./routes/report_projects');
const adminRoutes =require('./routes/admin');


const app = express();

app.set('trust proxy', 1);

/* -----------------------
   MIDDLEWARE
----------------------- */

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/* Static uploads */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* -----------------------
   API ROUTES
----------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/report',reportRoutes);
app.use('/api/didattica',didatticaRoutes);
app.use('/api/report_projects',reportProjectsRoutes);
app.use('/api/admin',adminRoutes);


/* -----------------------
   SERVER
----------------------- */
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend avviato su porta ${PORT}`);
});
