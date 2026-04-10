const express = require('express');
const passport = require('passport');

const router = express.Router();

const FRONTEND_URL = "https://wisemap.netlify.app";

router.get(
  '/',
  passport.authenticate('jwt', { session: false, failWithError: true }),
  (req, res) => {
    console.log('📌 JWT-Test route nådd');
    console.log('🔹 req.user:', req.user);

    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.json({
      message: 'Token är giltig!',
      user: req.user,
      note: 'Om detta fungerar → backend verifierar JWT korrekt.'
    });
  },
  (err, req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (err) {
      return res.status(401).json({ error: 'Ogiltig token eller ingen token' });
    }
    next(err);
  }
);

module.exports = router;