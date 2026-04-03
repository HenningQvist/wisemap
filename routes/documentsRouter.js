// src/routes/documentRouter.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentsController');

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Routes
router.get('/', documentController.getAllDocuments);
router.post('/', upload.single('file'), documentController.uploadDocument);
router.get('/:id/download', documentController.downloadDocument);
router.put('/:id/tags', documentController.updateTags);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
