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

// ==========================
// 🌱 ENV
// ==========================

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('🌱 Miljövariabler laddade från .env');
}

console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

// ==========================
// ❗ REQUIRED ENV CHECK
// ==========================

const requiredVars = ['DB_USER', 'DB_PASS', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];
requiredVars.forEach((v) => {
  if (!process.env[v]) {
    console.error(`❌ Saknad miljövariabel: ${v}`);
    process.exit(1);
  }
});

// ==========================
// 🚀 APP
// ==========================

const app = express();

// Trust proxy (Railway behövs)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ==========================
// 🔒 RATE LIMIT
// ==========================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "För många requests" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "För många loginförsök" },
});

// ==========================
// 🛡️ SECURITY & LOGGING
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

console.log('🌍 ALLOWED ORIGINS:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    console.log('🌍 CORS request från:', origin);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS tillåten');
      return callback(null, true);
    } else {
      console.log('❌ CORS BLOCKERAD:', origin);
      return callback(new Error('CORS blockerad'));
    }
  },
  credentials: true,
}));

// ==========================
// 📦 BODY + COOKIES
// ==========================

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// ==========================
// 🔥 GLOBAL DEBUG LOGGER
// ==========================

app.use((req, res, next) => {
  console.log('\n==============================');
  console.log('📥 REQUEST');
  console.log('➡️ Method:', req.method);
  console.log('➡️ URL:', req.originalUrl);
  console.log('➡️ Origin:', req.headers.origin);
  console.log('➡️ Authorization:', req.headers.authorization || '❌ none');
  console.log('➡️ Cookies:', req.cookies || '❌ none');
  console.log('==============================\n');

  next();
});

// ==========================
// 🔐 RATE LIMIT GLOBAL
// ==========================

app.use(globalLimiter);

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
// 📁 STATIC
// ==========================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==========================
// 🚀 ROUTES
// ==========================

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', protectedRoutes);

// ==========================
// ❌ ERROR HANDLER
// ==========================

app.use((err, req, res, next) => {
  console.error('💥 ERROR:', err.message);

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
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
    console.log(`🚀 HTTPS lokal: https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Production server på port ${PORT}`);
  });
}