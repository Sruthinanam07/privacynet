const BASE_URL = process.env.BASE_URL || 'https://privacynet-production.up.railway.app';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email to', to);
    return;
  }
  if (!from) {
    console.warn('RESEND_FROM_EMAIL not set — skipping email to', to);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('Resend error:', err);
    throw new Error('Failed to send email');
  }
}

function verifyEmailTemplate(name, token) {
  const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  return {
    subject: 'Verify your PrivacyNet email',
    html: `
      <div style="font-family:monospace;max-width:480px;margin:40px auto;background:#111119;color:#ebe9e3;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.07)">
        <h2 style="font-family:Georgia,serif;color:#ebe9e3;margin-bottom:8px">PrivacyNet <span style="color:#e07d3c">•</span></h2>
        <h3 style="color:#ebe9e3">Hi ${name},</h3>
        <p style="color:#8f8d99;line-height:1.6">Click below to verify your email. This link expires in <strong style="color:#ebe9e3">24 hours</strong>.</p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#e07d3c;color:#fff;border-radius:8px;text-decoration:none;font-weight:500">Verify Email</a>
        <p style="color:#4a4858;font-size:12px;margin-top:24px">If you didn't create a PrivacyNet account, ignore this email.</p>
      </div>
    `,
  };
}

function passwordResetTemplate(name, token) {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  return {
    subject: 'Reset your PrivacyNet password',
    html: `
      <div style="font-family:monospace;max-width:480px;margin:40px auto;background:#111119;color:#ebe9e3;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.07)">
        <h2 style="font-family:Georgia,serif;color:#ebe9e3;margin-bottom:8px">PrivacyNet <span style="color:#e07d3c">•</span></h2>
        <h3 style="color:#ebe9e3">Hi ${name},</h3>
        <p style="color:#8f8d99;line-height:1.6">Click below to reset your password. Expires in <strong style="color:#ebe9e3">1 hour</strong>, single use only.</p>
        <a href="${link}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#e07d3c;color:#fff;border-radius:8px;text-decoration:none;font-weight:500">Reset Password</a>
        <p style="color:#4a4858;font-size:12px;margin-top:24px">If you didn't request this, your account is safe — ignore this email.</p>
      </div>
    `,
  };
}

function piiAccessedTemplate(name, accessedBy, postTitle) {
  return {
    subject: 'Your contact info was accessed on PrivacyNet',
    html: `
      <div style="font-family:monospace;max-width:480px;margin:40px auto;background:#111119;color:#ebe9e3;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.07)">
        <h2 style="font-family:Georgia,serif;color:#ebe9e3;margin-bottom:8px">PrivacyNet <span style="color:#e07d3c">•</span></h2>
        <h3 style="color:#ebe9e3">Hi ${name},</h3>
        <p style="color:#8f8d99;line-height:1.6">Post author <strong style="color:#ebe9e3">${accessedBy}</strong> viewed your contact info on:</p>
        <p style="background:#16161f;padding:12px;border-radius:8px;color:#ebe9e3;border-left:3px solid #e07d3c">${postTitle}</p>
        <p style="color:#4a4858;font-size:12px;margin-top:24px">This is part of PrivacyNet's transparency commitment.</p>
      </div>
    `,
  };
}

module.exports = { sendEmail, verifyEmailTemplate, passwordResetTemplate, piiAccessedTemplate };
