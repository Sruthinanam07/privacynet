# PrivacyNet

**Privacy-first professional networking platform** — where a Claude AI agent automatically detects and masks personal contact information in comments, ensuring only the right people can see it.

**Live Demo:** [privacynet-production.up.railway.app](https://privacynet-production.up.railway.app)

---

## The Problem

On LinkedIn, when someone posts a job and asks applicants to share their email in comments — that email is visible to **everyone**. Strangers, competitors, scrapers. No control over who sees your contact information.

## The Solution

PrivacyNet's AI agent intercepts every comment before it's saved:

- Claude scans the comment for PII (emails, phone numbers, social handles)
- The real value is **never stored in the comment** — replaced with a token `[PII:email:uuid]`
- The real value is AES-256 encrypted and stored in a separate vault
- When reading, the backend resolves tokens differently per viewer:
  - **Post author** → sees real contact info
  - **Commenter** → sees their own info
  - **Everyone else** → sees `[email hidden]`

Enforced entirely server-side. Impossible to bypass from the frontend.

---

## Why AI and Not Regex?

Regex catches `sruthi@gmail.com` but misses natural language obfuscation:
> *"reach me at sruthi dot nanam at gmail"*
> *"DM me on Instagram at sruthi_nanam"*

Claude understands context — catching what regex never could.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Context API |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| AI | Claude Sonnet (Anthropic API) |
| Deployment | Railway |

---

## Security

- Token-vault pattern — raw PII never touches the comments table
- AES-256 encryption on all vault values
- JWT blacklist — tokens revoked on logout
- Rate limiting, Helmet headers, input validation
- Audit log — every PII access recorded with IP and timestamp
- GDPR compliant — full data export and account deletion
- Google Authenticator 2FA support
- Password reset via email

---

## License

MIT © 2026 Sruthi Nanam
