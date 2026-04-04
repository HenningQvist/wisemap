const { Strategy, ExtractJwt } = require('passport-jwt');
const pool = require('./database'); // din PostgreSQL pool
const dotenv = require('dotenv');
dotenv.config();

const options = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => req?.cookies?.token
  ]),
  secretOrKey: process.env.JWT_SECRET,
  algorithms: ['HS256'],
};

const jwtStrategy = new Strategy(options, async (jwtPayload, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [jwtPayload.id]);
    if (rows.length > 0) return done(null, rows[0]);
    return done(null, false, { message: 'User not found' });
  } catch (err) {
    console.error('⚠️ Error querying the database:', err);
    return done(err, false);
  }
});

module.exports = (passport) => {
  passport.use('jwt', jwtStrategy);
};