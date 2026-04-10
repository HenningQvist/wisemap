const { Strategy, ExtractJwt } = require('passport-jwt');
const pool = require('./database');
const dotenv = require('dotenv');

dotenv.config();

const options = {
  jwtFromRequest: ExtractJwt.fromExtractors([

    // 🔥 HEADER FIRST
    (req) => {
      const authHeader = req.headers.authorization;
      console.log('🔐 Authorization header:', authHeader || '❌ none');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log('✅ Token från header:', token ? '✔️ finns' : '❌ saknas');
        return token;
      }
      return null;
    },

    // 🔥 COOKIE FALLBACK
    (req) => {
      console.log('🍪 Cookies i passport:', req.cookies || '❌ inga cookies');

      if (req && req.cookies && req.cookies.token) {
        console.log('✅ Token från cookie:', '✔️ finns');
        return req.cookies.token;
      }

      console.log('❌ Ingen token i cookies');
      return null;
    }
  ]),

  secretOrKey: process.env.JWT_SECRET,
  algorithms: ['HS256'],
};

const jwtStrategy = new Strategy(options, async (jwtPayload, done) => {
  try {
    console.log('\n==============================');
    console.log('🧩 JWT STRATEGY TRIGGERED');
    console.log('📦 Payload:', jwtPayload);
    console.log('==============================\n');

    if (!jwtPayload || !jwtPayload.id) {
      console.log('❌ Ogiltig payload');
      return done(null, false);
    }

    // 🔍 DB lookup
    console.log('🔍 Hämtar user från DB med ID:', jwtPayload.id);

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [jwtPayload.id]
    );

    console.log('📊 DB result:', rows);

    if (rows.length > 0) {
      console.log('✅ User hittad:', {
        id: rows[0].id,
        role: rows[0].role,
        admin: rows[0].admin
      });

      return done(null, rows[0]);
    } else {
      console.log('❌ User NOT found i DB');
      return done(null, false);
    }

  } catch (err) {
    console.error('💥 JWT ERROR:', err);
    return done(err, false);
  }
});

// Export
module.exports = (passport) => {
  passport.use('jwt', jwtStrategy);
};