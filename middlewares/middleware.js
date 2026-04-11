const jwt = require('jsonwebtoken');
const env = require('../config/env');

const sanitizeUrl = (req, res, next) => {
  req.url = req.url.replace(/%0A/g, '');
  next();
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Ingen token' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token ogiltig' });
  }
};

// ✅ VIKTIGT: FUNKTION EXPORT
const applyMiddleware = (app) => {
  app.use(sanitizeUrl);
};

module.exports = applyMiddleware;
module.exports.authenticate = authenticate;