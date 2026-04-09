const model = require("../models/companyModel");

// GET
exports.getAll = async (req, res) => {
  try {
    res.json(await model.getAll());
  } catch (err) {
    res.status(500).json({ error: "Kunde inte hämta företag" });
  }
};

// POST
exports.create = async (req, res) => {
  try {
    res.json(await model.create(req.body));
  } catch (err) {
    res.status(500).json({ error: "Kunde inte skapa företag" });
  }
};

// PUT
exports.update = async (req, res) => {
  try {
    res.json(await model.update(req.params.id, req.body));
  } catch (err) {
    res.status(500).json({ error: "Kunde inte uppdatera företag" });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const deleted = await model.remove(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: "Kunde inte ta bort företag" });
  }
};

// ANALYSIS
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
      requireLicense: requireLicense || false, // ✅ default false
      createdBy: req.body.createdBy || "Okänd",
      updatedBy: req.body.updatedBy || "Okänd",
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

exports.getAllAnalyses = async (req, res) => {
  try {
    const all = await model.getAllAnalyses();
    res.json(all); // kan vara tom array
  } catch (err) {
    console.error("getAllAnalyses ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta analyser" });
  }
};

// Hämta analyser för ett företag
exports.getCompanyAnalyses = async (req, res) => {
  try {
    const analyses = await model.getCompanyAnalyses(req.params.id);
    res.json(analyses); // ✅ returnerar alltid array
  } catch (err) {
    console.error("getCompanyAnalyses ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta analyser" });
  }
};

// Ta bort analys
exports.removeAnalysis = async (req, res) => {
  const companyId = req.params.id;
  const index = parseInt(req.params.analysisIndex);

  if (!companyId || isNaN(index)) {
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