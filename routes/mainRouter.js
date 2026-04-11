const express = require("express");

// Routrar
const loginRouter = require("./loginRouter");
const overpassRouter = require("./overpass");
const companiesRouter = require("./companyRoutes");
const jobAdsRouter = require("./jobAdsRouter");

// 🔐 ROUTE MIDDLEWARES (FIXED)
const authenticate = require("../middlewares/authenticate");
const requireRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// ==============================
// 🎯 AUTH (public)
// ==============================
router.use("/auth", loginRouter);

// ==============================
// 🧪 TEST ROUTE (public)
// ==============================
router.get("/test-open", (req, res) => {
  res.json({ message: "Öppen route fungerar!" });
});

// ==============================
// 🔐 PROTECTED ROUTE
// ==============================
router.get("/protected", authenticate, (req, res) => {
  res.json({
    message: "Skyddad resurs",
    user: req.user,
  });
});

// ==============================
// 🔐 ROLE-BASED ROUTES
// ==============================

// Overpass
router.use(
  "/overpass",
  authenticate,
  requireRoles({ roles: ["admin", "handläggare"] }),
  overpassRouter
);

// Companies
router.use(
  "/companies",
  authenticate,
  requireRoles({ roles: ["admin", "handläggare"] }),
  companiesRouter
);

// Job search
router.use(
  "/jobsearch",
  authenticate,
  requireRoles({ roles: ["admin", "handläggare"] }),
  jobAdsRouter
);

module.exports = router;