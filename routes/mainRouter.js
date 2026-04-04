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

// Hårdkodad frontend URL för CORS
const FRONTEND_URL = "https://wisemap.netlify.app";

// ==============================
// 🎯 LOGIN (utanför auth)
// ==============================
router.use('/auth', loginRouter);

// ==============================
// 🔐 SKYDDADE ROUTER
// ==============================

// TEMP: Öppen testroute utan auth
router.get("/test-open", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.json({ message: "Öppen route fungerar! CORS OK" });
});

// Skyddad route med JWT
router.get(
  "/protected",
  passport.authenticate("jwt", { session: false, failWithError: true }),
  (req, res) => {
    // Returnerar alltid CORS-header
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.json({ message: "Skyddad resurs", user: req.user });
  },
  (err, req, res, next) => {
    // Auth misslyckades → returnera JSON + CORS
    res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (err) {
      return res.status(401).json({ error: "Ogiltig token eller ingen token" });
    }
    next(err);
  }
);

// Overpass-router (JWT + roller)
router.use(
  "/overpass",
  passport.authenticate("jwt", { session: false }),
  requireRoles(["admin", "handläggare"]),
  overpassRouter
);

// Companies-router (JWT + roller)
router.use(
  "/companies",
  passport.authenticate("jwt", { session: false }),
  requireRoles(["user", "handläggare"]),
  companiesRouter
);

module.exports = router;