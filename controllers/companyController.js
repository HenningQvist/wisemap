const model = require("../models/companyModel");

// =====================
// GET ALL COMPANIES
// =====================
exports.getAll = async (req, res) => {
  try {
    const companies = await model.getAll();
    res.json(companies);
  } catch (err) {
    console.error("getAll ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta företag" });
  }
};

// =====================
// CREATE COMPANY
// =====================
exports.create = async (req, res) => {
  try {
    const result = await model.create(req.body);
    res.json(result);
  } catch (err) {
    console.error("create ERROR:", err);
    res.status(500).json({ error: "Kunde inte skapa företag" });
  }
};

// =====================
// UPDATE COMPANY
// =====================
exports.update = async (req, res) => {
  try {
    const result = await model.update(req.params.id, req.body);

    if (!result) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    res.json(result);
  } catch (err) {
    console.error("update ERROR:", err);
    res.status(500).json({ error: "Kunde inte uppdatera företag" });
  }
};

// =====================
// DELETE COMPANY
// =====================
exports.remove = async (req, res) => {
  try {
    const deleted = await model.remove(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    res.json({ success: true, deleted });
  } catch (err) {
    console.error("remove ERROR:", err);
    res.status(500).json({ error: "Kunde inte ta bort företag" });
  }
};

// =====================================================
// ANALYSIS - FIX: UUID FROM JWT (NOT FRONTEND STRING!)
// =====================================================

// Lägg till analys
exports.addAnalysis = async (req, res) => {
  const { title, analysis, requireLicense } = req.body;

  if (!title || !analysis) {
    return res.status(400).json({ error: "Titel och analys krävs" });
  }

  try {
    const result = await model.addAnalysis(req.params.id, {
      title,
      description: req.body.description || "",
      analysis,
      requireLicense: requireLicense || false,

      // 🔥 FIX: alltid från JWT (UUID)
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });

    if (!result) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    res.json(result);
  } catch (err) {
    console.error("addAnalysis ERROR:", err);
    res.status(500).json({ error: "Kunde inte spara analys" });
  }
};

// =====================
// GET ALL ANALYSES
// =====================
exports.getAllAnalyses = async (req, res) => {
  try {
    const all = await model.getAllAnalyses();
    res.json(all || []);
  } catch (err) {
    console.error("getAllAnalyses ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta analyser" });
  }
};

// =====================
// GET COMPANY ANALYSES
// =====================
exports.getCompanyAnalyses = async (req, res) => {
  try {
    const analyses = await model.getCompanyAnalyses(req.params.id);
    res.json(analyses || []);
  } catch (err) {
    console.error("getCompanyAnalyses ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta analyser" });
  }
};

// =====================
// DELETE ANALYSIS
// =====================
exports.removeAnalysis = async (req, res) => {
  const companyId = req.params.id;
  const index = Number(req.params.analysisIndex);

  if (!companyId || Number.isNaN(index)) {
    return res.status(400).json({ error: "Företags-ID och index krävs" });
  }

  try {
    const result = await model.removeAnalysis(companyId, index);

    if (!result) {
      return res.status(404).json({ error: "Företag eller analys hittades inte" });
    }

    res.json({ success: true, company: result });
  } catch (err) {
    console.error("removeAnalysis ERROR:", err);
    res.status(500).json({ error: "Kunde inte ta bort analys" });
  }
};