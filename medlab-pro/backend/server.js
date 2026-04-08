const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const { trajtojGabimin } = require('./middleware/gabimet');
const seed = require('./config/seed');

// Routes
const authRoutes       = require('./routes/authRoutes');
const perdoruesRoutes  = require('./routes/perdoruesRoutes');
const pacientiRoutes   = require('./routes/pacientiRoutes');
const laboratorRoutes  = require('./routes/laboratorRoutes');
const kontrolliRoutes  = require('./routes/kontrolliRoutes');
const pagesaRoutes     = require('./routes/pagesaRoutes');
const dashboardRoutes  = require('./routes/dashboardRoutes');
const referuesRoutes   = require('./routes/referuesRoutes');
const profiliRoutes      = require('./routes/profiliRoutes');
const settingsRoutes     = require('./routes/settingsRoutes');
const antibiogramRoutes  = require('./routes/antibiogramRoutes');
const nenshkrimRoutes    = require('./routes/nenshkrimRoutes');
const pakoRoutes         = require('./routes/pakoRoutes');
const financaRoutes      = require('./routes/financaRoutes');
const statistikatRoutes  = require('./routes/statistikatRoutes');
const auditRoutes        = require('./routes/auditRoutes');
const backupRoutes       = require('./routes/backupRoutes');
const alarmRoutes        = require('./routes/alarmRoutes');
const kodZbritjeRoutes   = require('./routes/kodZbritjeRoutes');

// Lidhu me DB, seed dhe nis cron-in e backup
connectDB().then(async () => {
  await seed();
  const { inicializoCronin } = require('./utils/backupCron');
  await inicializoCronin();
});

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.CLIENT_URL ||
  'http://localhost:5173,https://emri-frontendit.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minuta
  max: 200,
  message: 'Shume kerkesa nga kjo IP, provo perseri pas 10 minutash',
});
app.use('/api', limiter);

// Auth rate limit me i rrepte
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Shume tentativa hyrjeje, provo pas 15 minutash',
});
app.use('/api/auth', authLimiter);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/perdorues',   perdoruesRoutes);
app.use('/api/pacientet',   pacientiRoutes);
app.use('/api/laborator',   laboratorRoutes);
app.use('/api/kontrollet',  kontrolliRoutes);
app.use('/api/pagesat',     pagesaRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/referuesit',  referuesRoutes);
app.use('/api/profilet',   profiliRoutes);
app.use('/api/settings',     settingsRoutes);
app.use('/api/antibiogram',  antibiogramRoutes);
app.use('/api/nenshkrimet',  nenshkrimRoutes);
app.use('/api/paketat',      pakoRoutes);
app.use('/api/financa',      financaRoutes);
app.use('/api/statistikat',  statistikatRoutes);
app.use('/api/audit',        auditRoutes);
app.use('/api/backup',       backupRoutes);
app.use('/api/alarmet',      alarmRoutes);
app.use('/api/zbritjet',     kodZbritjeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(trajtojGabimin);

// ─── Start Server ────────────────────────────────────────────────────────────
const PORTI_PARAZGJEDHUR = parseInt(process.env.PORT) || 5000;

let server;
const nisServer = (port) => {
  server = app.listen(port)
    .once('listening', () => {
      console.log(`✅ MedLab Pro Server duke u ekzekutuar ne port ${port} [${process.env.NODE_ENV}]`);
    })
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${port} i zënë — duke provuar ${port + 1}...`);
        nisServer(port + 1);
      } else {
        console.error(`❌ Gabim serveri: ${err.message}`);
        process.exit(1);
      }
    });
};

nisServer(PORTI_PARAZGJEDHUR);

// Menaxhimi i gabimeve te patrajtuar
process.on('unhandledRejection', (err) => {
  console.error(`❌ Gabim i patrajtuar: ${err.message}`);
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});
