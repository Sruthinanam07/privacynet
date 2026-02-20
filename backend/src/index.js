require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const helmet    = require('helmet');
const { initDB } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Trust Railway's proxy (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);

// ── Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS
app.use(cors());

// ── Body parsing
app.use(express.json());

// ── Logging
app.use(morgan('dev'));

// ── Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests — slow down' },
}));
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts — try again later' },
}));

// ── API Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/posts',    require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/account',  require('./routes/account'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const build = path.join(__dirname, '../../frontend/build');
  app.use(express.static(build));
  app.get('*', (req, res) => res.sendFile(path.join(build, 'index.html')));
}

// ── Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start
initDB().then(() => {
  app.listen(PORT, () => console.log(`\n🚀 PrivacyNet running on port ${PORT}\n`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
