// routes/loginAttemptRoutes.js
const express = require('express');
const router = express.Router();
const loginAttemptController = require('../controllers/loginAttemptController');

// Route för att skapa ett inloggningsförsök
router.post('/login-attempts', loginAttemptController.createLoginAttempt);

// Route för att hämta alla inloggningsförsök
router.get('/login-attempts', loginAttemptController.getAllLoginAttempts);

module.exports = router;
