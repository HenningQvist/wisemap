const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/mainRouter');
const applyMiddleware = require('./middlewares/middleware');

// 🌱 ENV
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

// 🔥 Railway fix
app.set('trust proxy', 1);

// 🛡️ Security & logging
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 🔥 CORS – SIMPEL OCH KORREKT
app.use(cors({
  origin: 'https://wisemap.netlify.app',
  credentials: true,
}));

// 🔥 EXTRA (tvingar headers – fixar edge cases)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://wisemap.netlify.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// 🔍 DEBUG (kan tas bort senare)
app.use((req, res, next) => {
  console.log('🌍 Origin:', req.headers.origin);
  console.log('🍪 Incoming cookies:', req.headers.cookie);
  next();
});

// 📦 Body & cookies
app.use(express.json());
app.use(cookieParser());

// 🔐 Passport
require('./config/passport')(passport);
app.use(passport.initialize());

// ⚙️ Middleware
applyMiddleware(app);

// 📁 Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🚀 Routes
app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

// ❌ Error handler
app.use((err, req, res, next) => {
  console.error('🔥 ERROR:', err.message);
  res.status(500).json({ error: err.message || 'Serverfel' });
});

// 🚀 Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server körs på port ${PORT}`);
});