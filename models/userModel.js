const pool = require('../config/database');

// Hämta användare via email
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Fel vid hämtning av användare med e-post:', err);
    throw err;
  }
};

// Hämta användare via username
const getUserByUsername = async (username) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Fel vid hämtning av användare med användarnamn:', err);
    throw err;
  }
};

// Skapa ny användare
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
  const query =
    'UPDATE users SET email=$1, username=$2, password=$3, role=$4 WHERE id=$5 RETURNING *';
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
  const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING *', [id]);
  return result.rows[0] || null;
};

// Hämta användare via ID
const getUserById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

module.exports = {
  getUserByEmail,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
};