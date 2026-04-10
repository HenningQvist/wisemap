// routes/mainRouter.js
const express = require("express");
const passport = require("passport");

// Routrar
const loginRouter = require("./loginRouter");
const overpassRouter = require("./overpass");
const companiesRouter = require("./companyRoutes");
const jobAdsRouter = require("./jobAdsRouter");

// Middleware för rollkontroll
const requireRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// ==============================
// 🎯 LOGIN (public)
// ==============================
router.use("/auth", loginRouter);

// ==============================
// 🧪 TEST ROUTE (public)
// ==============================
router.get("/test-open", (req, res) => {
  res.json({ message: "Öppen route fungerar!" });
});

// ==============================
// 🔐 SKYDDADE ROUTES
// ==============================

// Protected route (JWT)
router.get(
  "/protected",
  passport.authenticate("jwt", { session: false, failWithError: true }),
  (req, res) => {
    res.json({
      message: "Skyddad resurs",
      user: req.user,
    });
  },
  (err, req, res, next) => {
    if (err) {
      return res.status(401).json({
        error: "Ogiltig token eller ingen token",
      });
    }
    next(err);
  }
);

// ==============================
// 🔐 ROLE-BASED ROUTES
// ==============================

router.use(
  "/overpass",
  passport.authenticate("jwt", { session: false }),
  requireRoles({ roles: ["admin", "handläggare"] }),
  overpassRouter
);

router.use(
  "/companies",
  passport.authenticate("jwt", { session: false }),
  requireRoles({ roles: ["admin", "handläggare"] }),
  companiesRouter
);

router.use(
  "/jobsearch",
  passport.authenticate("jwt", { session: false }),
  requireRoles({ roles: ["admin", "handläggare"] }),
  jobAdsRouter
);

module.exports = router;