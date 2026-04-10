const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const userModel = require('../models/userModel');

// 🛡️ LOGIN RATE LIMIT
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'För många inloggningsförsök. Försök igen senare.',
  keyGenerator: (req) => req.ip + ':' + (req.body.email || ''),
  skipSuccessfulRequests: true,
});

// 🔐 CREATE JWT
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

// ==========================
// 🟢 LOGIN (BEARER ONLY)
// ==========================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email och lösenord krävs' });
    }

    const user = await userModel.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    const token = createToken(user);

    console.log('🔐 LOGIN OK:', {
      user: user.username,
      role: user.role,
      hasToken: !!token,
    });

    return res.json({
      message: 'Inloggning lyckades!',
      token, // 👈 VIKTIGT
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        admin: user.admin || false,
        participant_id: user.participant_id || null,
      },
    });

  } catch (err) {
    console.error('❌ LOGIN ERROR:', err);
    return res.status(500).json({ error: 'Serverfel vid inloggning' });
  }
};

// ==========================
// 🟢 REGISTER
// ==========================
const registerUser = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, användarnamn och lösenord krävs' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUserData = {
      email,
      username,
      hashedPassword,
      role: role || 'user',
    };

    const newUser = await userModel.createUser(newUserData);

    if (role === 'deltagare') {
      const participantId = newUser.id;
      await userModel.updateParticipantId(newUser.id, participantId);
      newUser.participant_id = participantId;
    }

    const token = createToken(newUser);

    console.log('🟢 REGISTER OK:', newUser.username);

    return res.status(201).json({
      message: 'Registrering lyckades',
      token, // 👈 VIKTIGT
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });

  } catch (err) {
    console.error('❌ REGISTER ERROR:', err);
    return res.status(500).json({ error: 'Serverfel vid registrering' });
  }
};

// ==========================
// 🔴 LOGOUT (CLIENT SIDE ONLY)
// ==========================
const logoutUser = (req, res) => {
  return res.json({
    message: 'Utloggning lyckades (ta bort token i frontend)',
  });
};

module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  loginRateLimiter,
};