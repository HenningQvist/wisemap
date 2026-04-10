const cors = require('cors');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const env = require('../config/env');

// ==============================
// 🧹 SANERA URL
// ==============================
const sanitizeUrl = (req, res, next) => {
  if (req.url.includes('%0A')) {
    console.warn('⚠️ URL contains newline encoding:', req.url);
  }

  req.url = req.url.replace(/%0A/g, '');
  next();
};

// ==============================
// 🔐 ATTACH USER (SPA + BEARER + COOKIE)
// ==============================
const attachUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;

  let token = null;

  // 1. Bearer token (SPA standard)
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 2. fallback cookie (SSR / legacy)
  if (!token && cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return next(); // public route
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      admin: payload.admin || false,
    };

    console.log('🔐 JWT OK → user attached:', {
      id: req.user.id,
      role: req.user.role,
      admin: req.user.admin,
    });

  } catch (err) {
    console.warn('❌ Invalid JWT:', err.message);

    // Viktigt: blockera inte requesten här
    req.user = null;
  }

  next();
};

// ==============================
// ❌ ERROR HANDLER
// ==============================
const errorHandler = (err, req, res, next) => {
  console.error('💥 SERVER ERROR:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internt serverfel'
        : err.message,
  });
};

// ==============================
// 🚀 EXPORT MIDDLEWARE SETUP
// ==============================
module.exports = (app) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // 🔥 DEV FIX (VIKTIGT)
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'https://localhost:3000',
      'http://localhost:3000',
      'https://127.0.0.1:3000',
      'http://127.0.0.1:3000'
    );
  }

  console.log('🌍 Allowed origins:', allowedOrigins);

  const corsOptions = {
    origin: function (origin, callback) {
      console.log('🌍 CORS request from:', origin);

      // allow server-to-server requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn('❌ CORS BLOCKED:', origin);
      return callback(new Error(`CORS blocked: ${origin}`));
    },

    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  };

  // ==============================
  // 🧩 ORDER (KRITISKT)
  // ==============================

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use(passport.initialize());

  app.use(sanitizeUrl);
  app.use(attachUser);

  // ❗ error handler ska vara sist i hela appen egentligen
  app.use(errorHandler);
};