// server.js
const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const applyMiddleware = require('./middlewares/middleware');

// Ladda .env lokalt
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('🌱 Miljövariabler laddade från .env');
}

// Kontrollera obligatoriska miljövariabler
const requiredVars = ['DB_USER', 'DB_PASS', 'DB_HOST', 'DB_NAME', 'JWT_SECRET', 'ALLOWED_ORIGINS'];
requiredVars.forEach(v => {
  if (!process.env[v]) {
    console.error(`❌ Saknad miljövariabel: ${v}`);
    process.exit(1);
  } else {
    console.log(`✅ ${v} laddad`);
  }
});

const app = express();

// Trust proxy (Railway)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Säkerhet & logg
app.use(helmet());
app.use(process.env.NODE_ENV !== 'production' ? morgan('dev') : morgan('combined'));


// 🔍 GLOBAL REQUEST LOGGER (SUPER VIKTIG)
app.use((req, res, next) => {
  console.log('\n==============================');
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  console.log('🌍 Origin:', req.headers.origin);
  console.log('🧠 Headers:', req.headers);
  console.log('==============================');
  next();
});


// 🔥 HÅRDKODAD CORS (DEBUG / PRODUKTION SAFE)
const FRONTEND_URL = 'https://wisemap.netlify.app';

app.use((req, res, next) => {
  const origin = req.headers.origin;

  console.log('\n🌐 CORS CHECK');
  console.log('➡️ Request origin:', origin);

  // Tillåt endast din frontend
  if (origin === FRONTEND_URL) {
    console.log('✅ Origin tillåten');
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  } else if (origin) {
    console.log('❌ Origin blockerad:', origin);
  } else {
    console.log('ℹ️ Ingen origin (server-to-server request)');
  }

  // Viktigt för cookies / auth
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Headers som tillåts
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  // Metoder som tillåts
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  // 🔥 Viktigt för caching/CDN
  res.setHeader('Vary', 'Origin');

  // Hantera preflight requests
  if (req.method === 'OPTIONS') {
    console.log('⚡ Preflight request → 200 OK');
    return res.sendStatus(200);
  }

  next();
});

// JSON & cookies
app.use(express.json());
app.use(cookieParser());

// Passport
require('./config/passport')(passport);
app.use(passport.initialize());

// Middleware
applyMiddleware(app);

// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/favicon.ico", express.static(path.join(__dirname, "public", "favicon.ico")));


// 🔍 TEST ROUTE (för att isolera CORS)
app.get('/api/test', (req, res) => {
  console.log('✅ TEST ROUTE TRÄFFAD');
  res.json({ success: true });
});


// 🔍 LOGGA ATT ROUTES LADDAS
console.log('📦 Laddar /api/auth routes...');
app.use('/api/auth', (req, res, next) => {
  console.log('➡️ /api/auth route nådd');
  next();
}, authRoutes);

console.log('📦 Laddar /api routes...');
app.use('/api', protectedRoutes);


// Global felhantering
app.use((err, req, res, next) => {
  console.error('💥 GLOBAL ERROR:', err.stack);
  res.status(500).json({ error: err.message || 'Något gick fel!' });
});


// Start server
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_FILE || 'localhost-key.pem'),
    cert: fs.readFileSync(process.env.SSL_CRT_FILE || 'localhost.pem')
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🚀 HTTPS lokalt: https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Produktion på port ${PORT}`);
  });
}