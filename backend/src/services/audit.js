/**
 * Audit Log Service
 * Records every sensitive action — PII access, login, logout, deletion
 * Users can view their own audit trail in Settings
 */

const { getDB } = require('../db/database');
const { v4: uuid } = require('uuid');

const EVENTS = {
  // Auth
  USER_REGISTERED:    'user.registered',
  USER_LOGIN:         'user.login',
  USER_LOGOUT:        'user.logout',
  USER_LOGIN_2FA:     'user.login.2fa',
  EMAIL_VERIFIED:     'user.email.verified',
  PASSWORD_RESET:     'user.password.reset',
  ACCOUNT_DELETED:    'user.account.deleted',
  DATA_EXPORTED:      'user.data.exported',

  // PII
  PII_SUBMITTED:      'pii.submitted',
  PII_ACCESSED:       'pii.accessed',     // post author opened inbox
  PII_VAULT_READ:     'pii.vault.read',   // individual token resolved

  // 2FA
  TOTP_ENABLED:       'totp.enabled',
  TOTP_DISABLED:      'totp.disabled',
};

async function log(event, { actorId, targetId, postId, commentId, ip, metadata = {} } = {}) {
  try {
    const db = getDB();
    await db.query(
      `INSERT INTO audit_log (id, event, actor_id, target_id, post_id, comment_id, ip_address, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uuid(), event, actorId || null, targetId || null, postId || null, commentId || null, ip || null, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Never crash the app because of an audit log failure
    console.error('Audit log failed:', err.message);
  }
}

async function getUserAuditLog(userId, limit = 50) {
  const db = getDB();
  const result = await db.query(`
    SELECT a.event, a.created_at, a.ip_address, a.metadata,
           u.name as actor_name
    FROM audit_log a
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.actor_id = $1 OR a.target_id = $1
    ORDER BY a.created_at DESC
    LIMIT $2
  `, [userId, limit]);
  return result.rows;
}

module.exports = { log, getUserAuditLog, EVENTS };
