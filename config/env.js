const dotenv = require('dotenv');
const path = require('path');

// 🧩 Bestäm vilken .env-fil som ska användas
// Om NODE_ENV är 'production' → använd .env.production
// Annars (dev, test) → använd .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(__dirname, '..', envFile);

// 🧠 Ladda miljövariabler från rätt fil (om den finns)
dotenv.config({ path: envPath });

// Logga endast i utveckling (för att inte läcka info i prod)
if (process.env.NODE_ENV !== 'production') {
  console.log(`✅ Miljövariabler laddade från: ${envFile}`);
}

// 🧩 Hjälpfunktion för säkra värden
const getEnv = (key, fallback = undefined) => {
  const value = process.env[key];
  if (typeof value === 'undefined' || value === '') {
    if (fallback === undefined) {
      console.warn(`⚠️  Saknad miljövariabel: ${key}`);
    }
    return fallback;
  }
  return value;
};

// 🧱 Exportera samlade miljövariabler
module.exports = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnv('PORT', 5000),

  // HTTPS-inställningar (för lokal cert)
  HTTPS: getEnv('HTTPS', 'false') === 'true',
  SSL_CRT_FILE: getEnv('SSL_CRT_FILE'),
  SSL_KEY_FILE: getEnv('SSL_KEY_FILE'),

  // Frontend & API
  FRONTEND_URL: getEnv('FRONTEND_URL', 'https://localhost:3000'),
  ALLOWED_ORIGINS: getEnv('ALLOWED_ORIGINS', 'https://localhost:3000'),
  API_URL: getEnv('API_URL') || getEnv('VITE_API_URL'),

  // Databas
  DB_USER: getEnv('DB_USER'),
  DB_PASS: String(getEnv('DB_PASS', '')), // alltid string
  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_NAME: getEnv('DB_NAME', 'testdb'),
  DB_PORT: Number(getEnv('DB_PORT', 5432)),

  // JWT / säkerhet
  JWT_SECRET: getEnv('JWT_SECRET', 'fallback_secret_for_dev'),
};
