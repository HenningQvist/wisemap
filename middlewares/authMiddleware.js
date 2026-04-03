// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Ingen token, åtkomst nekad' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 💥 Här ligger participantId, username, osv.
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Ogiltig token' });
  }
};

module.exports = authenticateUser;
