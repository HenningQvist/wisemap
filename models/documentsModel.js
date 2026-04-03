const { Pool } = require('pg');
require('dotenv').config();  // Ladda miljövariabler från .env

// Kontrollera att alla miljövariabler finns
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASS', 'DB_PORT', 'JWT_SECRET'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`❌ Saknad miljövariabel: ${varName}`);
    process.exit(1);
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

const Document = {
  async getAll() {
    const res = await pool.query('SELECT * FROM document ORDER BY created_at DESC');
    return res.rows;
  },

  async getById(id) {
    const res = await pool.query('SELECT * FROM document WHERE id = $1', [id]);
    return res.rows[0];
  },

  async create({ name, filename, mimetype, size, tags }) {
    const res = await pool.query(
      `INSERT INTO document (name, filename, mimetype, size, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, filename, mimetype, size, tags || []]
    );
    return res.rows[0];
  },

  async updateTags(id, tags) {
    const res = await pool.query(
      `UPDATE document SET tags = $1 WHERE id = $2 RETURNING *`,
      [tags, id]
    );
    return res.rows[0];
  },

  async delete(id) {
    const res = await pool.query('DELETE FROM document WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },
};

module.exports = Document;
