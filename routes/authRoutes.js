// In authRoutes.js
const express = require('express');
const passport = require('passport');
const { loginUser, registerUser, loginRateLimiter } = require('../controllers/userController'); // Importera controller-funktioner

const router = express.Router();

// Rate limiter för login
router.post('/login', loginRateLimiter, loginUser); // POST-rutt för login

// Registrering
router.post('/register', registerUser); // POST-rutt för registrering


router.get('/userinfo', passport.authenticate('jwt', { session: false }), (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { id, username, role, participant_id } = req.user;
  res.json({ id, username, role, participant_id }); 
});



module.exports = router;
