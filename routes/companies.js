const express = require("express");
const pool = require("../config/database"); 

const router = express.Router();

// Hjälpfunktion: normalize contacts
const normalizeContacts = (contacts) => {
  if (!Array.isArray(contacts)) return [];
  return contacts.map(c => ({
    note: c.note || c.text || "",
    status: c.status || c.outcome || "neutral",
    date: c.date || new Date().toISOString(),
    user: c.user || "Okänd"
  }));
};

// ========================
// 🏢 CRUD FÖRETAG
// ========================

// GET alla företag
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM companies ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kunde inte hämta företag" });
  }
});

// POST nytt företag
router.post("/", async (req, res) => {
  const {
    name, description, contact, phone, status, type,
    lat, lon, contacts, matched,
    needStartDate, needEndDate,
    totalSlots, filledSlots
  } = req.body;

  console.log("📥 POST /companies body:", req.body);

  try {
    const safeContacts = JSON.stringify(normalizeContacts(contacts));
    const result = await pool.query(
      `INSERT INTO companies
       (name, description, contact, phone, status, type, lat, lon, contacts, matched,
        need_start_date, need_end_date, totalSlots, filledSlots, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'user')
       RETURNING *`,
      [
        name, description, contact, phone, status || "neutral", type || "neutral",
        lat || null, lon || null, safeContacts, matched || false,
        needStartDate || null, needEndDate || null,
        totalSlots || 0, filledSlots || 0
      ]
    );

    console.log("✅ POST /companies result:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST ERROR:", err);
    res.status(500).json({ error: "Kunde inte lägga till företag" });
  }
});

// PUT /companies/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  console.log("📥 PUT /companies/:id body:", body);

  const safeContacts = JSON.stringify(normalizeContacts(body.contacts));
  const needStartDate = body.needStartDate || null;
  const needEndDate = body.needEndDate || null;

  try {
    // 🔹 Försök uppdatera först
    const updateResult = await pool.query(
      `UPDATE companies
       SET name=$1,
           description=$2,
           contact=$3,
           phone=$4,
           status=$5,
           type=$6,
           lat=$7,
           lon=$8,
           contacts=$9,
           matched=$10,
           need_start_date=$11,
           need_end_date=$12,
           totalSlots=$13,
           filledSlots=$14,
           updated_at=NOW()
       WHERE id=$15
       RETURNING *`,
      [
        body.name,
        body.description,
        body.contact,
        body.phone,
        body.status || "neutral",
        body.type || "neutral",
        body.lat || null,
        body.lon || null,
        safeContacts,
        body.matched || false,
        needStartDate,
        needEndDate,
        body.totalSlots || 0,
        body.filledSlots || 0,
        id
      ]
    );

    // ✅ OM FINNS → returnera direkt
    if (updateResult.rows.length) {
      console.log("✅ Uppdaterade företag:", updateResult.rows[0]);
      return res.json(updateResult.rows[0]);
    }

    // 🔥 OM INTE FINNS → skapa istället (UPSERT)
    console.log("⚠️ Företag hittades inte, skapar nytt...");

    const insertResult = await pool.query(
      `INSERT INTO companies
       (name, description, contact, phone, status, type, lat, lon, contacts, matched,
        need_start_date, need_end_date, totalSlots, filledSlots, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'user')
       RETURNING *`,
      [
        body.name,
        body.description,
        body.contact,
        body.phone,
        body.status || "neutral",
        body.type || "neutral",
        body.lat || null,
        body.lon || null,
        safeContacts,
        body.matched || false,
        needStartDate,
        needEndDate,
        body.totalSlots || 0,
        body.filledSlots || 0
      ]
    );

    console.log("✅ Skapade nytt företag:", insertResult.rows[0]);
    res.json(insertResult.rows[0]);

  } catch (err) {
    console.error("PUT UPSERT ERROR:", err);
    res.status(500).json({ error: "Kunde inte spara företag" });
  }
});

// DELETE företag
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM companies WHERE id=$1 RETURNING *",
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Företag hittades inte" });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Kunde inte ta bort företag" });
  }
});

// ========================
// 🧠 ANALYS
// ========================

router.post("/:id/analysis", async (req, res) => {
  const { id } = req.params;
  const { title, description, analysis } = req.body;

  if (!title || !analysis) {
    return res.status(400).json({ error: "Titel och analysdata krävs" });
  }

  try {
    const companyResult = await pool.query(
      "SELECT analysis FROM companies WHERE id=$1",
      [id]
    );

    if (!companyResult.rows.length) {
      return res.status(404).json({ error: "Företag hittades inte" });
    }

    let currentAnalyses = companyResult.rows[0].analysis || [];
    if (!Array.isArray(currentAnalyses)) currentAnalyses = [currentAnalyses];

    const newAnalysis = {
      title,
      description: description || "",
      data: analysis,
      createdAt: new Date().toISOString()
    };

    const updatedAnalyses = [...currentAnalyses, newAnalysis];

    const updateResult = await pool.query(
      `UPDATE companies SET analysis = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(updatedAnalyses), id]
    );

    res.status(200).json(updateResult.rows[0]);
  } catch (err) {
    console.error("ANALYSIS POST ERROR:", err);
    res.status(500).json({ error: "Kunde inte spara analys" });
  }
});

router.get("/analyses", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, analysis FROM companies WHERE analysis IS NOT NULL ORDER BY id ASC"
    );

    const allAnalyses = result.rows.flatMap(company =>
      company.analysis.map(a => ({
        companyId: company.id,
        companyName: company.name,
        ...a
      }))
    );

    res.json(allAnalyses);
  } catch (err) {
    console.error("GET ALL ANALYSES ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta analyser" });
  }
});

router.get("/:id/analysis", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, name, analysis FROM companies WHERE id=$1",
      [id]
    );

    if (!result.rows.length || !result.rows[0].analysis?.length) {
      return res.status(404).json({ error: "Ingen analys hittades för företaget" });
    }

    res.json(result.rows[0].analysis);
  } catch (err) {
    console.error("GET COMPANY ANALYSIS ERROR:", err);
    res.status(500).json({ error: "Kunde inte hämta analys" });
  }
});

module.exports = router;