// src/controllers/documentsController.js
const path = require('path');
const fs = require('fs');
const Document = require('../models/documentsModel'); // modellen med singular "document"

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const documentsController = {
  // Hämta alla dokument
  async getAllDocuments(req, res) {
    try {
      const docs = await Document.getAll();
      res.json(docs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kunde inte hämta dokument' });
    }
  },

  // Ladda upp dokument
  async uploadDocument(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'Ingen fil uppladdad' });

      const { originalname, filename, mimetype, size } = req.file;
      const doc = await Document.create({ name: originalname, filename, mimetype, size });
      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kunde inte ladda upp dokument' });
    }
  },

  // Ladda ner dokument
  async downloadDocument(req, res) {
    try {
      const { id } = req.params;
      const doc = await Document.getById(id);
      if (!doc) return res.status(404).json({ error: 'Dokument hittades inte' });

      const filePath = path.join(UPLOAD_DIR, doc.filename);
      res.download(filePath, doc.name);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kunde inte ladda ner dokument' });
    }
  },

  // Uppdatera taggar
  async updateTags(req, res) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      const updated = await Document.updateTags(id, tags);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kunde inte uppdatera taggar' });
    }
  },

  // Ta bort dokument
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const doc = await Document.delete(id);
      if (!doc) return res.status(404).json({ error: 'Dokument hittades inte' });

      // Ta bort fil från disk
      const filePath = path.join(UPLOAD_DIR, doc.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.json({ message: 'Dokument borttaget', doc });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kunde inte ta bort dokument' });
    }
  },
};

module.exports = documentsController;
