const pool = require("../config/database");

// Helper: normalisera kontakter
const normalizeContacts = (contacts, username) => {
  if (!Array.isArray(contacts)) return [];
  return contacts.map(c => ({
    note: c.note || c.text || "",
    status: c.status || c.outcome || "neutral",
    date: c.date || new Date().toISOString(),
    user: c.user || username || "Okänd"
  }));
};

// GET alla företag
const getAll = async () => {
  const result = await pool.query("SELECT * FROM companies ORDER BY id ASC");
  return result.rows;
};

// CREATE
const create = async (body) => {
  const safeContacts = JSON.stringify(normalizeContacts(body.contacts, body.createdBy));

  const result = await pool.query(
    `INSERT INTO companies
     (name, description, contact, phone, status, type, lat, lon, contacts, matched,
      need_start_date, need_end_date, totalSlots, filledSlots, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
      body.needStartDate || null,
      body.needEndDate || null,
      body.totalSlots || 0,
      body.filledSlots || 0,
      body.createdBy || "Okänd",
      body.updatedBy || "Okänd"
    ]
  );

  return result.rows[0];
};

// UPDATE (med UPSERT fallback)
const update = async (id, body) => {
  const safeContacts = JSON.stringify(normalizeContacts(body.contacts, body.updatedBy));

  const updateResult = await pool.query(
    `UPDATE companies
     SET name=$1, description=$2, contact=$3, phone=$4,
         status=$5, type=$6, lat=$7, lon=$8,
         contacts=$9, matched=$10,
         need_start_date=$11, need_end_date=$12,
         totalSlots=$13, filledSlots=$14,
         updated_by=$15, updated_at=NOW()
     WHERE id=$16
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
      body.needStartDate || null,
      body.needEndDate || null,
      body.totalSlots || 0,
      body.filledSlots || 0,
      body.updatedBy || "Okänd",
      id
    ]
  );

  if (updateResult.rows.length) return updateResult.rows[0];
  return await create(body); // UPSERT fallback
};

// DELETE
const remove = async (id) => {
  const result = await pool.query(
    "DELETE FROM companies WHERE id=$1 RETURNING *",
    [id]
  );
  return result.rows[0];
};

// ==============================
// ANALYSIS
// ==============================
// Lägg till analys
const addAnalysis = async (id, body) => {
  const companyResult = await pool.query(
    "SELECT analysis FROM companies WHERE id=$1",
    [id]
  );

  if (!companyResult.rows.length) return null;

  let current = companyResult.rows[0].analysis || [];
  if (!Array.isArray(current)) current = [current];

  const newAnalysis = {
    title: body.title,
    description: body.description || "",
    data: body.analysis,
    requireLicense: body.requireLicense || false, // ✅ alltid med
    createdAt: new Date().toISOString(),
    createdBy: body.createdBy || "Okänd",
    updatedBy: body.updatedBy || "Okänd",
  };

  const updated = [...current, newAnalysis];

  const result = await pool.query(
    `UPDATE companies SET analysis=$1 WHERE id=$2 RETURNING *`,
    [JSON.stringify(updated), id]
  );

  return result.rows[0];
};
const getAllAnalyses = async () => {
  const result = await pool.query(
    "SELECT id, name, analysis FROM companies ORDER BY id ASC"
  );

  return result.rows.flatMap(c => {
    if (!c.analysis) return []; // null → tom array

    // Om analysen är JSON-sträng → parse
    let analyses;
    if (typeof c.analysis === "string") {
      try {
        analyses = JSON.parse(c.analysis);
      } catch (err) {
        console.error("JSON parse error for companyId", c.id, err);
        analyses = [];
      }
    } else {
      analyses = c.analysis;
    }

    // säkerställ array
    if (!Array.isArray(analyses)) analyses = [analyses];

    return analyses.map(a => ({
      companyId: c.id,
      companyName: c.name,
      ...a,
      requireLicense: a.requireLicense || false
    }));
  });
};

const getCompanyAnalyses = async (id) => {
  const result = await pool.query(
    "SELECT analysis FROM companies WHERE id=$1",
    [id]
  );
  const row = result.rows[0];
  if (!row) return []; // alltid array

  const analyses = row.analysis || [];
  return (Array.isArray(analyses) ? analyses : [analyses]).map(a => ({
    ...a,
    requireLicense: a.requireLicense || false, // ✅ säkerställ alltid
  }));
};

// Ta bort analys
const removeAnalysis = async (companyId, index) => {
  const companyResult = await pool.query(
    "SELECT analysis FROM companies WHERE id=$1",
    [companyId]
  );

  if (!companyResult.rows.length) return null;

  let analyses = companyResult.rows[0].analysis || [];
  if (!Array.isArray(analyses)) analyses = [analyses];

  if (index < 0 || index >= analyses.length) return null;

  analyses.splice(index, 1); // ta bort analysen

  const result = await pool.query(
    "UPDATE companies SET analysis=$1 WHERE id=$2 RETURNING *",
    [JSON.stringify(analyses), companyId]
  );

  return result.rows[0];
};

module.exports = {
  ...module.exports,
  removeAnalysis
};

module.exports = {
  getAll,
  create,
  update,
  remove,
  addAnalysis,
  removeAnalysis,
  getAllAnalyses,
  getCompanyAnalyses
};