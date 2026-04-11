const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const https = require('https');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/mainRouter');
const applyMiddleware = require('./middlewares/middleware');

// ==========================
// ENV
// ==========================
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

// ==========================
// TRUST PROXY
// ==========================
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ==========================
// SECURITY
// ==========================
app.use(helmet());

// ==========================
// CORS
// ==========================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'https://localhost:3000');
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
  credentials: false,
}));

// ==========================
// BODY PARSER (VIKTIGT HÄR)
// ==========================
app.use(express.json({ limit: '10kb' }));

// ==========================
// LOGGING
// ==========================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ==========================
// APPLY CUSTOM MIDDLEWARE
// ==========================
applyMiddleware(app);

// ==========================
// ROUTES
// ==========================
app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

// ==========================
// ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message,
  });
});

// ==========================
// START
// ==========================
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  const httpsOptions = {
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost.pem'),
  };

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🚀 https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Server running ${PORT}`);
  });
}