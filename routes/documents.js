import express from "express";
import pool from "../db.js";
import multer from "multer";

const router = express.Router();

// ⚡️ Lagrar filer i minnet, max 20 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// -----------------------------
// Helper: säkerställ att tags alltid är array
// -----------------------------
function normalizeTags(tags) {
  if (tags == null) return [];
  if (Array.isArray(tags)) return tags;

  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

// -----------------------------
// GET ALL DOCUMENTS (metadata only)
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, type, tags, date FROM documents ORDER BY date DESC"
    );

    const docs = result.rows.map(doc => ({
      ...doc,
      tags: normalizeTags(doc.tags)
    }));

    res.json(docs);
  } catch (err) {
    console.error("Fel vid hämtning av dokument:", err);
    res.status(500).json({ error: "Kunde inte hämta dokument" });
  }
});

// -----------------------------
// DOWNLOAD DOCUMENT
// -----------------------------
router.get("/:id/download", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT name, type, file_data FROM documents WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dokumentet hittades inte" });
    }

    const doc = result.rows[0];

    res.setHeader("Content-Disposition", `attachment; filename="${doc.name}"`);
    res.setHeader("Content-Type", doc.type || "application/octet-stream");
    res.send(doc.file_data);
  } catch (err) {
    console.error("Fel vid nedladdning:", err);
    res.status(500).json({ error: "Kunde inte ladda ner dokument" });
  }
});

// -----------------------------
// UPLOAD DOCUMENT
// -----------------------------
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { file } = req;
    const { name, type, tags } = req.body;

    if (!file) {
      return res.status(400).json({ error: "Ingen fil uppladdad" });
    }

    const parsedTags = normalizeTags(tags);

    const result = await pool.query(
      "INSERT INTO documents (name, type, tags, file_data) VALUES ($1, $2, $3, $4) RETURNING id, name, type, tags, date",
      [name || file.originalname, type || file.mimetype, JSON.stringify(parsedTags), file.buffer]
    );

    const newDoc = result.rows[0];

    res.json({
      ...newDoc,
      tags: normalizeTags(newDoc.tags)
    });

  } catch (err) {
    console.error("Fel vid uppladdning:", err);
    res.status(500).json({ error: "Kunde inte ladda upp dokument" });
  }
});

// -----------------------------
// UPDATE TAGS
// -----------------------------
router.put("/:id/tags", async (req, res) => {
  const { id } = req.params;
  const updatedTags = normalizeTags(req.body.tags);

  try {
    const result = await pool.query(
      "UPDATE documents SET tags = $1 WHERE id = $2 RETURNING id, name, type, tags, date",
      [JSON.stringify(updatedTags), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Dokumentet hittades inte" });
    }

    const doc = result.rows[0];

    res.json({
      ...doc,
      tags: normalizeTags(doc.tags)
    });

  } catch (err) {
    console.error("Fel vid uppdatering av taggar:", err);
    res.status(500).json({ error: "Kunde inte uppdatera taggar" });
  }
});

// -----------------------------
// DELETE DOCUMENT
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Fel vid borttagning av dokument:", err);
    res.status(500).json({ error: "Kunde inte ta bort dokument" });
  }
});

export default router;
