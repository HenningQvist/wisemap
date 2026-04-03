const { Pool } = require('pg');
require('dotenv').config();  // Ladda miljövariabler från .env

// Kontrollera att alla miljövariabler finns
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASS', 'DB_PORT', 'JWT_SECRET'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Saknad miljövariabel: ${varName}`);
    process.exit(1);  // Avsluta processen om en miljövariabel saknas
  }
}

// PostgreSQL anslutning med miljövariabler
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

console.log('🔹 PostgreSQL anslutning skapad.');

// Funktion för att hämta alla användare från `users`-tabellen
const getAllUsers = async () => {
  try {
    const result = await pool.query('SELECT * FROM users');
    return result.rows; // Returnera alla användare
  } catch (err) {
    throw new Error('Error fetching users: ' + err.message);
  }
};

/// Funktion för att uppdatera användardata
const updateUser = async (id, username, email, admin, role) => {
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, admin = $3, role = $4 WHERE id = $5 RETURNING *',
      [username, email, admin, role, id]
    );

    // Om inget resultat, betyder det att användaren inte fanns eller inte uppdaterades
    if (result.rows.length === 0) {
      throw new Error('Användaren kunde inte uppdateras');
    }

    return result.rows[0]; // Returnera den uppdaterade användaren
  } catch (err) {
    console.error('Error updating user in model:', err);
    throw err;
  }
};


// Hämta användare baserat på ID
const getUserById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null; // Om ingen användare hittades, returnera null istället för att försöka använda en undefined variabel
    }

    return result.rows[0]; // Returnera användaren
  } catch (err) {
    console.error('Fel vid hämtning av användare med ID:', err);
    throw new Error('Fel vid hämtning av användare med ID'); // Hantera fel
  }
};


// Funktion för att ta bort en användare baserat på ID
const deleteUser = async (id) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    // Om resultatet är tomt, betyder det att användaren inte fanns i databasen
    if (result.rows.length === 0) {
      throw new Error('Användare inte hittad');
    }

    return result.rows[0]; // Returnera den borttagna användaren (kan användas för loggning)
  } catch (err) {
    console.error('Error deleting user:', err);
    throw new Error('Databasfel vid borttagning av användare');
  }
};

  
module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  getUserById,
};
