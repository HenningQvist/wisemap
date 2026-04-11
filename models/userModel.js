const pool = require('../config/database');
const crypto = require('crypto');

// ==========================
// 🔐 HELPERS
// ==========================
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ==========================
// 👤 USERS
// ==========================

// Hämta användare via email
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Fel vid hämtning av användare med e-post:', err);
    throw err;
  }
};

// Hämta via username
const getUserByUsername = async (username) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Fel vid hämtning av användare med användarnamn:', err);
    throw err;
  }
};

// Hämta via ID
const getUserById = async (id) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('Fel vid hämtning av användare via ID:', err);
    throw err;
  }
};

// Skapa användare
const createUser = async ({ email, username, hashedPassword, role }) => {
  const query = `
    INSERT INTO users (email, username, password, role)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [email, username, hashedPassword, role];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Uppdatera användare
const updateUser = async (id, updatedData) => {
  const query = `
    UPDATE users
    SET email=$1, username=$2, password=$3, role=$4
    WHERE id=$5
    RETURNING *
  `;

  const values = [
    updatedData.email,
    updatedData.username,
    updatedData.password,
    updatedData.role,
    id,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Ta bort användare
const deleteUser = async (id) => {
  const result = await pool.query(
    'DELETE FROM users WHERE id=$1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
};

// ==========================
// 🔁 REFRESH TOKEN SYSTEM
// ==========================

// Spara refresh token (HASHAD)
const saveRefreshToken = async ({ userId, tokenHash, expiresAt, ip, userAgent }) => {
  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_by_ip, user_agent)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [userId, tokenHash, expiresAt, ip, userAgent];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Hitta refresh token
const findRefreshToken = async (tokenHash) => {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1',
    [tokenHash]
  );

  return result.rows[0] || null;
};

// Revoke en token
const revokeToken = async (tokenHash) => {
  const result = await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1 RETURNING *',
    [tokenHash]
  );

  return result.rows[0] || null;
};

// Revoke ALL tokens för user (reuse attack protection)
const revokeAllUserTokensByToken = async (tokenHash) => {
  const userResult = await pool.query(
    'SELECT user_id FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );

  const userId = userResult.rows[0]?.user_id;

  if (!userId) return;

  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
    [userId]
  );
};

// ==========================
// 📦 EXPORTS
// ==========================
module.exports = {
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createUser,
  updateUser,
  deleteUser,

  // 🔐 refresh tokens
  saveRefreshToken,
  findRefreshToken,
  revokeToken,
  revokeAllUserTokensByToken,
};