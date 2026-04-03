const { Strategy, ExtractJwt } = require('passport-jwt');
const pool = require('./database');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');  // Importera cookie-parser om du vill använda den direkt här

dotenv.config();

const options = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      // Logga för att kontrollera om cookies finns på request
      console.log('🔹 Alla cookies i request:', req.cookies);  // Logga alla cookies för att se om token finns
      if (!req.cookies.token) {
        console.log('⚠️ Ingen token hittades i cookies');
      }
      return req.cookies.token;  // Extrahera token från cookies
    }
  ]),
  secretOrKey: process.env.JWT_SECRET,
  algorithms: ['HS256'],
};

const jwtStrategy = new Strategy(options, async (jwtPayload, done) => {
  try {
    console.log('🔹 Token extraherad från cookies, payload:', jwtPayload);  // Logga hela JWT-payload

    // Hämta användare från databasen med användarens ID i JWT-payload
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [jwtPayload.id]);
    console.log('🔹 Resultat från DB query:', rows);  // Logga resultatet från databasen

    // Om användaren finns, sätt in användaren i req.user
    if (rows.length > 0) {
      console.log('✅ User found in DB:', rows[0]);
      return done(null, rows[0]);
    } else {
      console.log('❌ User not found with ID:', jwtPayload.id);
      return done(null, false, { message: 'User not found' });
    }
  } catch (err) {
    console.error('⚠️ Error querying the database:', err);
    return done(err, false);
  }
});

// Exportera Passport-strategin
module.exports = (passport) => {
  passport.use('jwt', jwtStrategy);
};
