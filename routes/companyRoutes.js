const express = require("express");
const controller = require("../controllers/companyController");

const router = express.Router();

// CRUD
router.get("/", controller.getAll);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

// Analyses
router.get("/analyses", controller.getAllAnalyses);
router.get("/:id/analysis", controller.getCompanyAnalyses);
router.post("/:id/analysis", controller.addAnalysis);
router.delete("/:id/analysis/:analysisIndex", controller.removeAnalysis);

module.exports = router;