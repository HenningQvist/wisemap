const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const userModel = require('../models/userModel');
const loginAttemptModel = require('../models/loginAttempt');

// 🛡️ RATE LIMITER för login
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 5,
  message: 'För många inloggningsförsök. Försök igen om 15 minuter.',
  keyGenerator: (req) => req.ip + ':' + req.body.email,
  skipSuccessfulRequests: true,
});

// 🔐 Hjälpfunktion: skapa JWT-token
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

// 🔐 Hjälpfunktion: sätt cookies
const setAuthCookies = (res, token, participant_id = null) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,           // ✅ HTTPS krävs i produktion
    sameSite: isProd ? 'None' : 'Lax', // ✅ cross-site cookies
    maxAge: 8 * 60 * 60 * 1000, // 8 timmar
    path: '/',                 // viktigt för att cookie ska skickas på alla endpoints
  };

  console.log('🍪 Sätter cookies med inställningar:', cookieOptions);

  res.cookie('token', token, cookieOptions);

  if (participant_id != null) {
    res.cookie('participant_id', participant_id, cookieOptions);
  }
};

// 🟢 LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email och lösenord krävs' });

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      await loginAttemptModel.logLoginAttempt(email, false);
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await loginAttemptModel.logLoginAttempt(email, false);
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    await loginAttemptModel.logLoginAttempt(email, true);

    const token = createToken(user);
    setAuthCookies(res, token, user.participant_id || null);

    return res.json({
      message: 'Inloggning lyckades!',
      username: user.username,
      role: user.role,
      admin: user.admin || false,
      participant_id: user.participant_id || null,
    });
  } catch (err) {
    console.error('❌ Fel vid inloggning:', err);
    return res.status(500).json({ error: 'Serverfel vid inloggning' });
  }
};

// 🟢 REGISTER
const registerUser = async (req, res) => {
  try {
    const { email, username, password, role, personalNumber } = req.body;

    if (!email || !username || !password)
      return res.status(400).json({ error: 'Email, användarnamn och lösenord krävs' });

    // 🧩 Valideringar
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Ogiltig e-postadress' });

    const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
    if (!usernameRegex.test(username))
      return res.status(400).json({ error: 'Ogiltigt användarnamn (minst 3 tecken, inga specialtecken)' });

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password))
      return res.status(400).json({
        error: 'Lösenordet måste innehålla minst 8 tecken, en stor bokstav, en siffra och ett specialtecken',
      });

    const existingUserByUsername = await userModel.getUserByUsername(username);
    const existingUserByEmail = await userModel.getUserByEmail(email);

    if (existingUserByUsername || existingUserByEmail)
      return res.status(409).json({ error: 'Användarnamnet eller e-posten är redan registrerad' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUserData = {
      email,
      username,
      password: hashedPassword,
      role: role || 'user',
    };

    if (role === 'deltagare' && personalNumber)
      newUserData.personalNumber = personalNumber;

    const newUser = await userModel.createUser(newUserData);

    if (role === 'deltagare') {
      const participantId = newUser.id;
      await userModel.updateParticipantId(newUser.id, participantId);
      newUser.participant_id = participantId;
    }

    const token = createToken(newUser);
    setAuthCookies(res, token, newUser.participant_id || null);

    return res.status(201).json({
      message: 'Registrering lyckades',
      username: newUser.username,
      role: newUser.role,
      participant_id: newUser.participant_id || null,
    });
  } catch (err) {
    console.error('❌ Fel vid registrering:', err);
    return res.status(500).json({ error: 'Serverfel vid registrering' });
  }
};

// 🟡 LOGOUT
const logoutUser = (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('participant_id', { path: '/' });
  return res.json({ message: 'Utloggning lyckades' });
};

module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  loginRateLimiter,
};
