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

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/mainRouter');
const applyMiddleware = require('./middlewares/middleware');

// 🌱 Ladda .env i utveckling
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('🌱 Miljövariabler laddade från .env');
}

// 🔍 Kontrollera env
const requiredVars = ['DB_USER', 'DB_PASS', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];
requiredVars.forEach((v) => {
  if (!process.env[v]) {
    console.error(`❌ Saknad miljövariabel: ${v}`);
    process.exit(1);
  }
});

const app = express();

// ✅ Trust proxy (Railway)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🛡️ Säkerhet & logg
app.use(helmet());

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
);

// ✅ CORS (🔥 FIXAD VERSION)
const allowedOrigins = [
  'https://wisemap.netlify.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman etc.

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn('⛔ Blockerad origin:', origin);
      return callback(new Error('CORS blockerad'));
    }
  },
  credentials: true, // ⭐ KRITISKT för cookies
}));

// 🔍 DEBUG (ta bort senare om du vill)
app.use((req, res, next) => {
  console.log('🌍 Origin:', req.headers.origin);
  console.log('🍪 Incoming cookies:', req.headers.cookie);
  next();
});

// ✅ Body & cookies
app.use(express.json());
app.use(cookieParser());

// ✅ Passport
require('./config/passport')(passport);
app.use(passport.initialize());

// ✅ Custom middleware
applyMiddleware(app);

// 📁 Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// 🚀 Routes
app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

// ❌ Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 ERROR:', err.message);
  res.status(500).json({ error: err.message || 'Något gick fel!' });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  // 🔒 Lokal HTTPS
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_FILE || 'localhost-key.pem'),
    cert: fs.readFileSync(process.env.SSL_CRT_FILE || 'localhost.pem'),
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🚀 HTTPS-server körs på https://localhost:${PORT}`);
  });
} else {
  // 🌍 Railway production
  app.listen(PORT, () => {
    console.log(`🚀 Server körs i produktion på port ${PORT}`);
  });
}