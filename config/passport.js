const { Strategy, ExtractJwt } = require('passport-jwt');
const pool = require('./database');
const dotenv = require('dotenv');

dotenv.config();

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 👈 ENDA KÄLLAN
  secretOrKey: process.env.JWT_SECRET,
  algorithms: ['HS256'],
};

const jwtStrategy = new Strategy(options, async (jwtPayload, done) => {
  try {
    console.log('🔐 JWT payload:', jwtPayload);

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [jwtPayload.id]
    );

    if (!rows.length) {
      console.log('❌ User not found');
      return done(null, false);
    }

    console.log('✅ Auth OK user:', rows[0].username);

    return done(null, rows[0]);
  } catch (err) {
    console.error('💥 JWT ERROR:', err);
    return done(err, false);
  }
});

module.exports = (passport) => {
  passport.use('jwt', jwtStrategy);
};