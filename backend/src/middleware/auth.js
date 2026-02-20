const jwt     = require('jsonwebtoken');
const { getDB } = require('../db/database');

const SECRET = process.env.JWT_SECRET || 'privacynet_secret_change_in_prod';

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Not authenticated' });

  const token = header.slice(7);

  try {
    // Check blacklist first (logged out tokens)
    const db = getDB();
    const blacklisted = await db.query(
      'SELECT 1 FROM jwt_blacklist WHERE token = $1', [token]
    );
    if (blacklisted.rows.length)
      return res.status(401).json({ error: 'Token revoked — please log in again' });

    req.user  = jwt.verify(token, SECRET);
    req.token = token; // needed for logout blacklisting
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '24h' }
  );
}

function getTokenExpiry(token) {
  try {
    const decoded = jwt.decode(token);
    return new Date(decoded.exp * 1000);
  } catch {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

module.exports = { auth, signToken, getTokenExpiry };
