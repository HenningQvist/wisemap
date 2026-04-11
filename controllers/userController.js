const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const userModel = require('../models/userModel');

// ==========================
// ⚙️ CONFIG
// ==========================
const ACCESS_TOKEN_EXPIRES = '10m';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

// ==========================
// 🛡️ LOGIN RATE LIMIT
// ==========================
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'För många inloggningsförsök. Försök igen senare.',
  keyGenerator: (req) => req.ip + ':' + (req.body.email || ''),
  skipSuccessfulRequests: true,
});

// ==========================
// 🔐 HELPERS
// ==========================

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// 🔑 ACCESS TOKEN
const createAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      admin: user.admin || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
};

// 🔁 REFRESH TOKEN (DB VERSION)
const createRefreshToken = async (user, req) => {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await userModel.saveRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return token;
};

// ==========================
// 🟢 LOGIN
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

    const accessToken = createAccessToken(user);
    const refreshToken = await createRefreshToken(user, req);

    console.log('🔐 LOGIN OK:', user.username);

    return res.json({
      message: 'Inloggning lyckades!',
      accessToken,
      refreshToken,
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

    const newUser = await userModel.createUser({
      email,
      username,
      hashedPassword,
      role: role || 'user',
    });

    if (role === 'deltagare') {
      const participantId = newUser.id;
      await userModel.updateParticipantId(newUser.id, participantId);
      newUser.participant_id = participantId;
    }

    const accessToken = createAccessToken(newUser);
    const refreshToken = await createRefreshToken(newUser, req);

    console.log('🟢 REGISTER OK:', newUser.username);

    return res.status(201).json({
      message: 'Registrering lyckades',
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        admin: newUser.admin || false,
      },
    });

  } catch (err) {
    console.error('❌ REGISTER ERROR:', err);
    return res.status(500).json({ error: 'Serverfel vid registrering' });
  }
};

// ==========================
// 🔁 REFRESH TOKEN (DB + ROTATION + REUSE DETECTION)
// ==========================
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token saknas' });
    }

    const tokenHash = hashToken(refreshToken);

    const storedToken = await userModel.findRefreshToken(tokenHash);

    // 🚨 REUSE ATTACK
    if (!storedToken) {
      console.warn('🚨 REFRESH TOKEN REUSE DETECTED');

      await userModel.revokeAllUserTokensByToken(tokenHash);

      return res.status(403).json({
        error: 'Security breach detected. Logga in igen.',
      });
    }

    // ❌ revoked
    if (storedToken.revoked) {
      return res.status(403).json({ error: 'Token revoked' });
    }

    // ⏱️ expired
    if (new Date() > storedToken.expires_at) {
      await userModel.revokeToken(tokenHash);
      return res.status(403).json({ error: 'Token expired' });
    }

    const user = await userModel.getUserById(storedToken.user_id);

    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    // 🔥 ROTATION
    await userModel.revokeToken(tokenHash);

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = await createRefreshToken(user, req);

    console.log('🔁 TOKEN REFRESH:', user.username);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (err) {
    console.error('❌ REFRESH ERROR:', err);
    return res.status(500).json({ error: 'Serverfel vid refresh' });
  }
};

// ==========================
// 🔴 LOGOUT
// ==========================
const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await userModel.revokeToken(tokenHash);
    }

    return res.json({
      message: 'Utloggning lyckades',
    });

  } catch (err) {
    console.error('❌ LOGOUT ERROR:', err);
    return res.status(500).json({ error: 'Serverfel vid logout' });
  }
};

// ==========================
// 📦 EXPORTS
// ==========================
module.exports = {
  loginUser,
  registerUser,
  refreshAccessToken,
  logoutUser,
  loginRateLimiter,
};