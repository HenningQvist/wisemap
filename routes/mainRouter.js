// routes/mainRouter.js
const express = require("express");
const passport = require("passport");
const cookieParser = require("cookie-parser");

// Routrar
const loginRouter = require("./loginRouter");
const overpassRouter = require("./overpass");
const companiesRouter = require("./companies");

// Middleware för rollkontroll
const requireRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// ==============================
// 🔐 GLOBAL AUTH
// ==============================
router.use(cookieParser());
router.use(passport.authenticate('jwt', { session: false }));

// ==============================
// 🎯 LOGIN (måste ligga utanför rollstyrning)
// ==============================
router.use('/auth', loginRouter);

// ==============================
// 🔐 SKYDDADE ROUTER
// ==============================

// Enkel testroute
router.get('/protected', (req, res) => {
  res.json({ message: 'Skyddad resurs', user: req.user });
});

// Overpass-router
router.use(
  '/overpass',
  requireRoles(['admin', 'handläggare']),
  overpassRouter
);

// Companies-router
router.use(
  '/companies',
  requireRoles(['user', 'handläggare']),
  companiesRouter
);

module.exports = router;