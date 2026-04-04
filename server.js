const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/mainRouter'); // Skyddade routes
const applyMiddleware = require('./middlewares/middleware');

// Ladda .env
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('🌱 Miljövariabler laddade från .env');
}

// Kontrollera obligatoriska miljövariabler
const requiredVars = ['DB_USER', 'DB_PASS', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];
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

// 🔥 CORS (alla routes)
const FRONTEND_URL = 'https://wisemap.netlify.app';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true, // cookies / auth
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Origin','X-Requested-With','Content-Type','Accept','Authorization']
}));

// JSON & cookies
app.use(express.json());
app.use(cookieParser());

// Passport
require('./config/passport')(passport);
app.use(passport.initialize());

// Middleware
applyMiddleware(app);

// Static filer
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/favicon.ico", express.static(path.join(__dirname, "public", "favicon.ico")));

// 🔍 TEST ROUTE
app.get('/api/test', (req, res) => {
  res.json({ success: true });
});

// 🔍 Routes
app.use('/api/auth', authRoutes);
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