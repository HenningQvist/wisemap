// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const userModel = require('../models/userModel');

// 🛡️ RATE LIMITER för login
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 5,
  message: 'För många inloggningsförsök. Försök igen om 15 minuter.',
  keyGenerator: (req) => req.ip + ':' + req.body.email,
  skipSuccessfulRequests: true,
});

// 🔐 Skapa JWT-token
const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      admin: user.admin || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

// 🔐 Sätt cookies (FIXAD)
const setAuthCookies = (req, res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: true,         // 🔥 KRITISKT
    sameSite: 'None',     // 🔥 KRITISKT
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  };

  console.log('🍪 Sätter cookie:', cookieOptions);

  res.cookie('token', token, cookieOptions);
};

  console.log('🍪 Sätter cookie:', cookieOptions);

  res.cookie('token', token, cookieOptions);
};
  console.log('🍪 Sätter cookies med inställningar:', cookieOptions);

  res.cookie('token', token, cookieOptions);
};

// 🟢 LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email och lösenord krävs' });

    const user = await userModel.getUserByEmail(email);
    if (!user)
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });

    const token = createToken(user);

    // ⭐ FIX: skicka med req!
    setAuthCookies(req, res, token);

    return res.json({
      message: 'Inloggning lyckades!',
      username: user.username,
      role: user.role,
      admin: user.admin || false,
    });
  } catch (err) {
    console.error('❌ Fel vid inloggning:', err);
    return res.status(500).json({ error: 'Serverfel vid inloggning' });
  }
};

// 🟢 REGISTER
const registerUser = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password)
      return res.status(400).json({ error: 'Email, användarnamn och lösenord krävs' });

    // Valideringar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Ogiltig e-postadress' });

    const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
    if (!usernameRegex.test(username))
      return res.status(400).json({
        error: 'Ogiltigt användarnamn (minst 3 tecken, inga specialtecken)',
      });

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password))
      return res.status(400).json({
        error:
          'Lösenordet måste innehålla minst 8 tecken, en stor bokstav, en siffra och ett specialtecken',
      });

    const existingUserByUsername = await userModel.getUserByUsername(username);
    const existingUserByEmail = await userModel.getUserByEmail(email);

    if (existingUserByUsername || existingUserByEmail)
      return res.status(409).json({
        error: 'Användarnamnet eller e-posten är redan registrerad',
      });

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await userModel.createUser({
      email,
      username,
      hashedPassword,
      role: role || 'user',
    });

    const token = createToken(newUser);

    // ⭐ FIX: skicka med req!
    setAuthCookies(req, res, token);

    return res.status(201).json({
      message: 'Registrering lyckades',
      username: newUser.username,
      role: newUser.role,
    });
  } catch (err) {
    console.error('❌ Fel vid registrering:', err);
    return res.status(500).json({ error: 'Serverfel vid registrering' });
  }
};

// 🟡 LOGOUT
const logoutUser = (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/',
    // ❌ ingen domain här heller
  };

  res.clearCookie('token', cookieOptions);

  return res.json({ message: 'Utloggning lyckades' });
};

module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  loginRateLimiter,
};