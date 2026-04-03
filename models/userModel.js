const pool = require('../config/database'); // Se till att poolen är rätt konfigurerad för din databas

// Hämta användare baserat på e-postadress
const getUserByEmail = async (email) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0]; // Om användaren finns, returnera den
  } catch (err) {
    console.error('Fel vid hämtning av användare med e-post:', err);
    throw new Error('Fel vid hämtning av användare med e-post'); // Bättre felhantering
  }
};

// Hämta användare baserat på användarnamn
const getUserByUsername = async (username) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0]; // Om användaren finns, returnera den
  } catch (err) {
    console.error('Fel vid hämtning av användare med användarnamn:', err);
    throw new Error('Fel vid hämtning av användare med användarnamn'); // Bättre felhantering
  }
};

// Skapa en ny användare
async function createUser({ email, username, hashedPassword, role, personalNumber = null }) {
  const client = await pool.connect();
  try {
    const query = personalNumber
      ? `
        INSERT INTO users (email, username, password, role, personalnumber)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `
      : `
        INSERT INTO users (email, username, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

    const values = personalNumber
      ? [email, username, hashedPassword, role, personalNumber]
      : [email, username, hashedPassword, role];

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}


// Uppdatera användarens data (t.ex. när användaren uppdaterar sitt lösenord)
const updateUser = async (id, updatedData) => {
  try {
    const query = 'UPDATE users SET email = $1, username = $2, password = $3, role = $4 WHERE id = $5 RETURNING id, email, username, role';
    const values = [updatedData.email, updatedData.username, updatedData.password, updatedData.role, id];
    const result = await pool.query(query, values);
    return result.rows[0]; // Returnera den uppdaterade användaren
  } catch (err) {
    console.error('Fel vid uppdatering av användare:', err);
    throw new Error('Fel vid uppdatering av användare'); // Bättre felhantering
  }
};

// Ta bort en användare
const deleteUser = async (id) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return null; // Om användaren inte hittades, returnera null
    }
    return result.rows[0]; // Returnera den borttagna användaren
  } catch (err) {
    console.error('Fel vid borttagning av användare:', err);
    throw new Error('Fel vid borttagning av användare'); // Bättre felhantering
  }
};

// Hämta användare baserat på ID
const getUserById = async (id) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null; // Om ingen användare hittas, returnera null
    }
    return result.rows[0]; // Returnera användaren, inklusive "admin" status
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    throw err;  // Kasta felet så att det kan hanteras av middleware
  }
};


// Exportera modeller
module.exports = { getUserByEmail, getUserByUsername, createUser, updateUser, deleteUser, getUserById  };
