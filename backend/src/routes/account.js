/**
 * Account management routes
 * - 2FA setup/disable
 * - Audit log
 * - GDPR data export
 * - Account deletion
 * - Change password
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { getDB } = require('../db/database');
const { auth }  = require('../middleware/auth');
const { log, getUserAuditLog, EVENTS } = require('../services/audit');
const { generateSecret, generateQRCode, verifyToken } = require('../services/totp');

// ── GET audit log ─────────────────────────────────────
router.get('/audit-log', auth, async (req, res) => {
  try {
    const entries = await getUserAuditLog(req.user.id);
    res.json({ entries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ── SETUP 2FA — Step 1: generate secret + QR code ────
router.post('/2fa/setup', auth, async (req, res) => {
  try {
    const db   = getDB();
    const user = (await db.query('SELECT email FROM users WHERE id = $1', [req.user.id])).rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { base32, otpauth_url } = generateSecret(user.email);
    const qrCode = await generateQRCode(otpauth_url);

    // Store secret temporarily — confirmed when user verifies a code
    await db.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [base32, req.user.id]);

    res.json({ qrCode, secret: base32, message: 'Scan the QR code in Google Authenticator, then verify with a code' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '2FA setup failed' });
  }
});

// ── SETUP 2FA — Step 2: verify and enable ────────────
router.post('/2fa/verify', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const db   = getDB();
    const user = (await db.query('SELECT totp_secret FROM users WHERE id = $1', [req.user.id])).rows[0];
    if (!user?.totp_secret) return res.status(400).json({ error: 'Run setup first' });

    const valid = verifyToken(user.totp_secret, code);
    if (!valid) return res.status(401).json({ error: 'Invalid code — try again' });

    await db.query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [req.user.id]);
    await log(EVENTS.TOTP_ENABLED, { actorId: req.user.id, ip: req.ip });

    res.json({ ok: true, message: '2FA enabled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// ── DISABLE 2FA ───────────────────────────────────────
router.post('/2fa/disable', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required to disable 2FA' });

    const db   = getDB();
    const user = (await db.query('SELECT password FROM users WHERE id = $1', [req.user.id])).rows[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });

    await db.query('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE id = $1', [req.user.id]);
    await log(EVENTS.TOTP_DISABLED, { actorId: req.user.id, ip: req.ip });

    res.json({ ok: true, message: '2FA disabled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// ── CHANGE PASSWORD ───────────────────────────────────
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const db   = getDB();
    const user = (await db.query('SELECT password FROM users WHERE id = $1', [req.user.id])).rows[0];
    const ok   = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    await log(EVENTS.PASSWORD_RESET, { actorId: req.user.id, ip: req.ip });

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ── GDPR DATA EXPORT ──────────────────────────────────
router.get('/export', auth, async (req, res) => {
  try {
    const db = getDB();
    const id = req.user.id;

    const [user, posts, comments, piiVault, auditLog] = await Promise.all([
      db.query('SELECT id,name,email,headline,bio,avatar_color,email_verified,created_at FROM users WHERE id = $1', [id]),
      db.query('SELECT * FROM posts    WHERE author_id = $1 ORDER BY created_at DESC', [id]),
      db.query('SELECT * FROM comments WHERE author_id = $1 ORDER BY created_at DESC', [id]),
      db.query('SELECT token,pii_type,created_at FROM pii_vault WHERE author_id = $1', [id]),
      db.query('SELECT event,created_at,ip_address,metadata FROM audit_log WHERE actor_id = $1 ORDER BY created_at DESC', [id]),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      notice: 'This is all data PrivacyNet holds about you. PII vault values are not included for your security.',
      profile: user.rows[0],
      posts: posts.rows,
      comments: comments.rows,
      pii_tokens_submitted: piiVault.rows.length,
      audit_log: auditLog.rows,
    };

    await log(EVENTS.DATA_EXPORTED, { actorId: id, ip: req.ip });

    res.setHeader('Content-Disposition', `attachment; filename="privacynet-data-${id}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ── DELETE ACCOUNT (GDPR) ─────────────────────────────
router.delete('/delete', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required to delete account' });

    const db   = getDB();
    const user = (await db.query('SELECT * FROM users WHERE id = $1', [req.user.id])).rows[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });

    // Log before deleting (cascade will remove audit entries too)
    await log(EVENTS.ACCOUNT_DELETED, {
      actorId: req.user.id,
      ip: req.ip,
      metadata: { email: user.email, name: user.name, deleted_at: new Date().toISOString() }
    });

    // CASCADE deletes handle: posts, comments, post_likes,
    // comment_likes, pii_vault, email_tokens automatically
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);

    res.json({ ok: true, message: 'Account and all associated data permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;
