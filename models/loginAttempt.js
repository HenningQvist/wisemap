const { Pool } = require('pg');
require('dotenv').config();

const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASS', 'DB_PORT', 'JWT_SECRET'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Saknad miljövariabel: ${varName}`);
    process.exit(1);
  } else {
    console.log(`✅ Miljövariabel ${varName} är laddad korrekt.`);
  }
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

console.log('🔹 PostgreSQL anslutning skapad med följande konfiguration:');
console.log(`User: ${process.env.DB_USER}, Host: ${process.env.DB_HOST}, Database: ${process.env.DB_NAME}`);

// Funktion för att skapa login attempt
const createLoginAttempt = async (data) => {
  const { username, success, attempted_at, role } = data;

  try {
    const query = `
      INSERT INTO login_attempts (username, success, attempted_at, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [username, success, attempted_at, role];
    const result = await pool.query(query, values);
    return result.rows[0]; // Returnera den skapade posten
  } catch (err) {
    console.error('Fel vid skapande av login attempt:', err);
    throw err;
  }
};


// Funktion för att logga login attempt med role
const logLoginAttempt = async (username, success) => {
  const attempted_at = new Date();

  try {
    // 🔍 Hämta participant_id och createdby från users och participants
    const result = await pool.query(`
      SELECT u.participant_id, p.createdby
      FROM users u
      LEFT JOIN participants p ON u.participant_id = p.id
      WHERE u.email = $1
    `, [username]);

    const { participant_id, createdby } = result.rows[0] || {};

    // 📝 Spara login attempt inklusive participant_id och createdby
    const insertQuery = `
      INSERT INTO login_attempts (username, success, attempted_at, participant_id, createdby)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await pool.query(insertQuery, [username, success, attempted_at, participant_id, createdby]);

  } catch (err) {
    console.error('❌ Fel vid loggning av inloggningsförsök:', err);
    throw err;
  }
};



const getAllLoginAttempts = async () => {
  try {
    const query = `
      SELECT 
        la.username, 
        la.success, 
        la.attempted_at, 
        u.role, 
        u.participant_id,
        la.createdby  -- Hämtar createdby direkt från login_attempts
      FROM login_attempts la
      LEFT JOIN users u ON u.email = la.username
      ORDER BY la.attempted_at DESC;
    `;
    const result = await pool.query(query);
    console.log('Result:', result.rows); // Debugging: Logga resultaten
    return result.rows;
  } catch (err) {
    console.error('❌ Fel vid hämtning av login attempts:', err);
    throw err;
  }
};





// 🟪 Exportera
module.exports = {
  createLoginAttempt,
  logLoginAttempt,
  getAllLoginAttempts, 
};
