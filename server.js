const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const rateLimit = require('express-rate-limit'); 

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/mainRouter');
const applyMiddleware = require('./middlewares/middleware');

// Ladda .env i utveckling
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('🌱 Miljövariabler laddade från .env');
}

// Kontrollera obligatoriska miljövariabler
const requiredVars = ['DB_USER', 'DB_PASS', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];
requiredVars.forEach((v) => {
  if (!process.env[v]) {
    console.error(`❌ Saknad miljövariabel: ${v}`);
    process.exit(1);
  }
});

const app = express();

// ✅ Trust proxy (viktigt för rate limit i production)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ==========================
// 🔒 RATE LIMITERS
// ==========================

// Global limiter (hela API)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // max requests per IP
  message: {
    error: "För många requests, försök igen senare."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Striktare limiter för auth (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // bara 10 försök
  message: {
    error: "För många inloggningsförsök. Vänta 15 minuter."
  }
});

// ==========================
// 🛡️ Säkerhet & logg
// ==========================

app.use(helmet());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==========================
// 🌍 CORS
// ==========================

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('CORS-förfrågan blockerad av servern.'));
    }
  },
  credentials: true,
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// ==========================
// 📦 BODY + COOKIES
// ==========================

// 🔒 Limit på request size (skydd mot stora payloads)
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// ==========================
// 🔐 RATE LIMIT (PLACERING VIKTIG)
// ==========================

app.use(globalLimiter); // 👉 gäller allt under

// ==========================
// 🔑 PASSPORT
// ==========================

require('./config/passport')(passport);
app.use(passport.initialize());

// ==========================
// ⚙️ CUSTOM MIDDLEWARE
// ==========================

applyMiddleware(app);

// ==========================
// 📁 STATIC FILES
// ==========================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/favicon.ico", express.static(path.join(__dirname, "public", "favicon.ico")));

// ==========================
// 🚀 ROUTES
// ==========================

// 🔐 extra skydd på auth (login brute force)
app.use('/api/auth', authLimiter, authRoutes);

// 🔒 resten av API
app.use('/api', protectedRoutes);

// ==========================
// ❌ ERROR HANDLER (SÄKRARE)
// ==========================

app.use((err, req, res, next) => {
  console.error(err.stack);

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// 🚀 START SERVER
// ==========================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_FILE || 'localhost-key.pem'),
    cert: fs.readFileSync(process.env.SSL_CRT_FILE || 'localhost.pem')
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🚀 HTTPS-servern körs lokalt på https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Servern körs i produktion på port ${PORT}`);
  });
}