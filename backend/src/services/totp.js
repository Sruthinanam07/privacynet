/**
 * TOTP (Time-based One-Time Password) — Google Authenticator compatible
 * Uses speakeasy library for RFC 6238 compliant TOTP
 */

const speakeasy = require('speakeasy');
const qrcode    = require('qrcode');

function generateSecret(userEmail) {
  const secret = speakeasy.generateSecret({
    name:   `PrivacyNet (${userEmail})`,
    issuer: 'PrivacyNet',
    length: 20,
  });
  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

async function generateQRCode(otpauthUrl) {
  return await qrcode.toDataURL(otpauthUrl);
}

function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // allow 30s clock drift
  });
}

module.exports = { generateSecret, generateQRCode, verifyToken };
