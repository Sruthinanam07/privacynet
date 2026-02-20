const { Pool } = require('pg');

let pool;

function getDB() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

async function initDB() {
  const db = getDB();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      email            TEXT UNIQUE NOT NULL,
      password         TEXT NOT NULL,
      headline         TEXT DEFAULT '',
      bio              TEXT DEFAULT '',
      avatar_color     TEXT NOT NULL DEFAULT '#1e3a6e',
      email_verified   BOOLEAN DEFAULT FALSE,
      totp_secret      TEXT DEFAULT NULL,
      totp_enabled     BOOLEAN DEFAULT FALSE,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS posts (
      id         TEXT PRIMARY KEY,
      author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      tag        TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      pii_count  INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, comment_id)
    );

    CREATE TABLE IF NOT EXISTS pii_vault (
      token      TEXT PRIMARY KEY,
      pii_type   TEXT NOT NULL,
      value      TEXT NOT NULL,
      comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      author_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- JWT blacklist (revoked tokens on logout)
    CREATE TABLE IF NOT EXISTS jwt_blacklist (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Email verification tokens
    CREATE TABLE IF NOT EXISTS email_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL, -- 'verify' | 'reset'
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit log — every PII access recorded
    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT PRIMARY KEY,
      event       TEXT NOT NULL,
      actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      target_id   TEXT,
      post_id     TEXT,
      comment_id  TEXT,
      ip_address  TEXT,
      metadata    JSONB DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created  ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post  ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_pii_comment    ON pii_vault(comment_id);
    CREATE INDEX IF NOT EXISTS idx_pii_author     ON pii_vault(author_id);
    CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_log(actor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_log(target_id);
    CREATE INDEX IF NOT EXISTS idx_jwt_expires    ON jwt_blacklist(expires_at);
    CREATE INDEX IF NOT EXISTS idx_email_tokens   ON email_tokens(user_id);
  `);

  // Clean up expired JWT blacklist entries daily
  await db.query(`DELETE FROM jwt_blacklist WHERE expires_at < NOW()`);

  console.log('✅ PostgreSQL ready');
}

module.exports = { getDB, initDB };
