const cors = require('cors');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Sanera URL
const sanitizeUrl = (req, res, next) => {
  req.url = req.url.replace(/%0A/g, '');
  next();
};

// Extrahera user från JWT
const attachUser = (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.headers['authorization'];

  if (!token) return next();

  try {
    const cleanToken = token.startsWith('Bearer ')
      ? token.slice(7)
      : token;

    const payload = jwt.verify(cleanToken, env.JWT_SECRET);

    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      admin: payload.admin,
    };
  } catch (err) {
    console.warn('Ogiltig JWT:', err.message);
  }

  next();
};

// Felhantering
const errorHandler = (err, req, res, next) => {
  console.error('🔥 ERROR:', err.message);
  res.status(500).json({ message: 'Internt serverfel' });
};

module.exports = (app) => {
  // 🔥 HÅRDKODA (för att eliminera env-buggar)
  const allowedOrigins = [
    'https://wisemap.netlify.app'
  ];

  app.use(cors({
    origin: function (origin, callback) {
      console.log("🌍 Origin:", origin);

      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ BLOCKED:", origin);
      return callback(new Error('CORS blockerad'));
    },
    credentials: true,
  }));

  // ❌ TA BORT DENNA RAD HELT
  // app.options('*', cors(corsOptions));

  app.use(express.json());
  app.use(passport.initialize());
  app.use(sanitizeUrl);
  app.use(attachUser);
  app.use(errorHandler);
};