const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * 🔐 Bearer JWT Authentication Middleware
 * Used ONLY for routes (not app-level middleware)
 */
module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // ❌ No token
  if (!authHeader) {
    return res.status(401).json({
      error: "No authorization header",
    });
  }

  // ❌ Wrong format
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Invalid authorization format",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      admin: payload.admin || false,
    };

    next();
  } catch (err) {
    console.warn("❌ JWT ERROR:", err.message);

    return res.status(401).json({
      error: "Token invalid or expired",
    });
  }
};