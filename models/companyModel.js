const pool = require("../config/database");

// ==============================
// HELPERS
// ==============================
const normalizeContacts = (contacts, username) => {
  if (!Array.isArray(contacts)) return [];
  return contacts.map(c => ({
    note: c.note || c.text || "",
    status: c.status || c.outcome || "neutral",
    date: c.date || new Date().toISOString(),
    user: c.user || username || "Okänd"
  }));
};

// ==============================
// GET ALL
// ==============================
const getAll = async () => {
  const result = await pool.query(
    "SELECT * FROM companies ORDER BY id ASC"
  );
  return result.rows;
};

// ==============================
// CREATE (🔥 FIXED UUID ISSUE)
// ==============================
const create = async (body, user) => {
  const safeContacts = JSON.stringify(
    normalizeContacts(body.contacts, user?.username)
  );

  const result = await pool.query(
    `INSERT INTO companies
     (name, description, contact, phone, status, type,
      lat, lon, contacts, matched,
      need_start_date, need_end_date,
      totalSlots, filledSlots,
      created_by, updated_by)
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

      // 🔥 FIX: UUID ONLY (NO STRING)
      user?.id,
      user?.id
    ]
  );

  return result.rows[0];
};

// ==============================
// UPDATE
// ==============================
const update = async (id, body, user) => {
  const safeContacts = JSON.stringify(
    normalizeContacts(body.contacts, user?.username)
  );

  const result = await pool.query(
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

      // 🔥 FIX
      user?.id,

      id
    ]
  );

  return result.rows[0];
};

// ==============================
// DELETE
// ==============================
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
const addAnalysis = async (id, body, user) => {
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
    requireLicense: body.requireLicense || false,
    createdAt: new Date().toISOString(),

    // 🔥 FIX UUID SAFE
    createdBy: user?.id,
    updatedBy: user?.id,
  };

  const updated = [...current, newAnalysis];

  const result = await pool.query(
    `UPDATE companies SET analysis=$1 WHERE id=$2 RETURNING *`,
    [JSON.stringify(updated), id]
  );

  return result.rows[0];
};

// ==============================
// GET ANALYSES
// ==============================
const getAllAnalyses = async () => {
  const result = await pool.query(
    "SELECT id, name, analysis FROM companies ORDER BY id ASC"
  );

  return result.rows.flatMap(c => {
    if (!c.analysis) return [];

    let analyses = c.analysis;

    if (typeof analyses === "string") {
      try {
        analyses = JSON.parse(analyses);
      } catch {
        analyses = [];
      }
    }

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
  if (!row) return [];

  let analyses = row.analysis || [];
  if (typeof analyses === "string") {
    try {
      analyses = JSON.parse(analyses);
    } catch {
      analyses = [];
    }
  }

  if (!Array.isArray(analyses)) analyses = [analyses];

  return analyses.map(a => ({
    ...a,
    requireLicense: a.requireLicense || false
  }));
};

// ==============================
// REMOVE ANALYSIS
// ==============================
const removeAnalysis = async (companyId, index) => {
  const companyResult = await pool.query(
    "SELECT analysis FROM companies WHERE id=$1",
    [companyId]
  );

  if (!companyResult.rows.length) return null;

  let analyses = companyResult.rows[0].analysis || [];
  if (!Array.isArray(analyses)) analyses = [analyses];

  if (index < 0 || index >= analyses.length) return null;

  analyses.splice(index, 1);

  const result = await pool.query(
    "UPDATE companies SET analysis=$1 WHERE id=$2 RETURNING *",
    [JSON.stringify(analyses), companyId]
  );

  return result.rows[0];
};

// ==============================
// EXPORT (CLEAN - NO DUPLICATES)
// ==============================
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