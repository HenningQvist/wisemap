const cors = require('cors');
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const cookieParser = require('cookie-parser');

// Sanera URL
const sanitizeUrl = (req, res, next) => {
  req.url = req.url.replace(/%0A/g, '');
  next();
};

// Extrahera user från JWT
const attachUser = (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.headers['x-access-token'] ||
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
    // Endast fel, ingen spam
    console.warn('Ogiltig JWT:', err.message);
  }

  next();
};

// Felhanterings-middleware
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.message);
  }
  res.status(500).json({ message: 'Internt serverfel' });
};

module.exports = (app) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // Endast varning vid dramatisk misskonfiguration
  if (allowedOrigins.length === 0) {
    console.warn('Ingen ALLOWED_ORIGINS satt — CORS kan blockera alla requests.');
  }

  const corsOptions = {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS-förfrågan blockerad.'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json());
  app.use(passport.initialize());
  app.use(sanitizeUrl);
  app.use(cookieParser());
  app.use(attachUser);
  app.use(errorHandler);
};
