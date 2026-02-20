require('dotenv').config();
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const { v4: uuid }  = require('uuid');
const { getDB }     = require('../db/database');
const { auth, signToken, getTokenExpiry } = require('../middleware/auth');
const { sendEmail, verifyEmailTemplate, passwordResetTemplate } = require('../services/email');
const { log, EVENTS } = require('../services/audit');
const { verifyToken } = require('../services/totp');

const COLORS = ['#1e3a6e','#1a3d2e','#3d1a1a','#2d1a4a','#1a1a3d','#3d2d1a','#1a3d3d','#2d3d1a'];

// ── REGISTER ──────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, headline = '' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db = getDB();
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const hash  = await bcrypt.hash(password, 10);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const id    = uuid();

    await db.query(
      'INSERT INTO users (id, name, email, password, headline, avatar_color) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, name.trim(), email.toLowerCase(), hash, headline.trim(), color]
    );

    // Send verification email
    const emailToken = uuid();
    await db.query(
      'INSERT INTO email_tokens (token, user_id, type, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL \'24 hours\')',
      [emailToken, id, 'verify']
    );
    const { subject, html } = verifyEmailTemplate(name.trim(), emailToken);
    sendEmail({ to: email.toLowerCase(), subject, html }).catch(err => {
    console.warn('Verification email failed (non-critical):', err.message);
    });
    await log(EVENTS.USER_REGISTERED, { actorId: id, ip: req.ip });

    const user  = { id, name: name.trim(), email: email.toLowerCase(), headline: headline.trim(), avatar_color: color, email_verified: false };
    const token = signToken(user);
    res.status(201).json({ token, user, message: 'Account created — check your email to verify' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── VERIFY EMAIL ─────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Invalid link');

    const db  = getDB();
    const row = (await db.query(
      'SELECT * FROM email_tokens WHERE token = $1 AND type = $2 AND used = FALSE AND expires_at > NOW()',
      [token, 'verify']
    )).rows[0];

    if (!row) return res.status(400).send('Link expired or already used');

    await db.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [row.user_id]);
    await db.query('UPDATE email_tokens SET used = TRUE WHERE token = $1', [token]);
    await log(EVENTS.EMAIL_VERIFIED, { actorId: row.user_id, ip: req.ip });

    // Redirect to frontend with success
    res.redirect('/?verified=true');
  } catch (err) {
    console.error(err);
    res.status(500).send('Verification failed');
  }
});

// ── LOGIN ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, totpToken } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });

    const db  = getDB();
    const row = (await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])).rows[0];

    // Same error for wrong email OR wrong password (prevent user enumeration)
    if (!row || !(await bcrypt.compare(password, row.password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    // Check 2FA if enabled
    if (row.totp_enabled) {
      if (!totpToken)
        return res.status(200).json({ requires2FA: true });
      const valid = verifyToken(row.totp_secret, totpToken);
      if (!valid)
        return res.status(401).json({ error: 'Invalid authenticator code' });
      await log(EVENTS.USER_LOGIN_2FA, { actorId: row.id, ip: req.ip });
    }

    await log(EVENTS.USER_LOGIN, { actorId: row.id, ip: req.ip });

    const user  = { id: row.id, name: row.name, email: row.email, headline: row.headline, avatar_color: row.avatar_color, email_verified: row.email_verified, totp_enabled: row.totp_enabled };
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── LOGOUT (revoke token) ─────────────────────────────
router.post('/logout', auth, async (req, res) => {
  try {
    const db      = getDB();
    const expires = getTokenExpiry(req.token);
    await db.query(
      'INSERT INTO jwt_blacklist (token, user_id, expires_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [req.token, req.user.id, expires]
    );
    await log(EVENTS.USER_LOGOUT, { actorId: req.user.id, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const db  = getDB();
    const row = (await db.query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()])).rows[0];

    // Always return success — never reveal if email exists
    if (row) {
      const token = uuid();
      await db.query(
        'INSERT INTO email_tokens (token, user_id, type, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL \'1 hour\')',
        [token, row.id, 'reset']
      );
      const { subject, html } = passwordResetTemplate(row.name, token);
      await sendEmail({ to: email.toLowerCase(), subject, html });
    }

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ── RESET PASSWORD ────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db  = getDB();
    const row = (await db.query(
      'SELECT * FROM email_tokens WHERE token = $1 AND type = $2 AND used = FALSE AND expires_at > NOW()',
      [token, 'reset']
    )).rows[0];

    if (!row) return res.status(400).json({ error: 'Link expired or already used' });

    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, row.user_id]);
    await db.query('UPDATE email_tokens SET used = TRUE WHERE token = $1', [token]);
    await log(EVENTS.PASSWORD_RESET, { actorId: row.user_id, ip: req.ip });

    res.json({ ok: true, message: 'Password reset successfully — please log in' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
