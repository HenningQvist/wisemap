// config/db.js
const { Pool } = require('pg');
const env = require('./env.js');  // Centraliserade miljövariabler

const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_NAME,
  password: String(env.DB_PASS || ''), // ✅ Tvinga alltid string
  port: (() => {
    const port = Number(env.DB_PORT);
    if (isNaN(port)) {
      console.warn('❌ Ogiltig DB_PORT:', env.DB_PORT, '– använder standard 5432');
      return 5432;
    }
    return port;
  })(),
});

// Testa databasanslutning
pool.connect()
  .then(() => console.log('✅ PostgreSQL är ansluten'))
  .catch(err => console.error('⛔ Fel vid anslutning:', err.message));

// Stäng pool vid Ctrl+C
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('Databasanslutning stängd');
    process.exit(0);
  });
});

module.exports = pool;
