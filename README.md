# PrivacyNet 

A privacy-first professional networking platform where people share job opportunities and a **Claude AI agent** automatically masks personal contact info in comments — so only the right people can see it.

**Live demo → [privacynet-production.up.railway.app](https://privacynet-production.up.railway.app)**

---

## The Problem

When someone posts a job opportunity online and asks people to drop their email in the comments, that email becomes visible to **everyone** — strangers, scrapers, competitors. There's no control over who sees your contact info.

## The Solution

PrivacyNet runs a Claude AI agent on every comment before it's saved. Your email never touches the comments table. Instead:

- Real value (`sruthi@gmail.com`) → stored encrypted in a private vault
- Comment text → stores a token (`[PII:email:uuid]`) instead
- **Post author** → sees all real emails to follow up with applicants
- **Commenter** → sees only their own contact info
- **Everyone else** → sees `[email hidden]`

This is enforced server-side. There's no way to bypass it from the frontend.

---

## Why AI and not Regex?

Regex catches `sruthi@gmail.com` but misses obfuscated forms like:
- `sruthi dot nanam at gmail dot com`
- `reach me on instagram at sruthi_nanam`

Claude understands context and natural language — it catches everything.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| AI Agent | Claude Sonnet (Anthropic API) |
| Hosting | Railway |

---

## Architecture

```
Browser
   ↓
Express Server (Node.js)
   ├── /api/auth     → register, login (JWT)
   ├── /api/posts    → create, like, delete
   ├── /api/comments → privacy agent runs here
   └── /             → serves built React app
           ↓
      Privacy Agent (Claude AI)
           ↓
      PostgreSQL
        ├── comments  (tokenized text only)
        └── pii_vault (AES-256 encrypted values)
```

---

## Privacy & Security

- Raw PII never stored in comments table — token-vault pattern
- PII vault encrypted with AES-256-CBC
- Rate limiting on all API routes
- HTTP security headers via Helmet
- Input validation on all endpoints
- JWT authentication with bcrypt password hashing
- User enumeration prevention

---

## Local Development

**Requirements:** Node.js 18+, PostgreSQL, Anthropic API key

```bash
# Clone
git clone https://github.com/Sruthinanam07/privacynet.git
cd privacynet

# Backend setup
cd backend
npm install
```

Create `backend/.env`:
```
ANTHROPIC_API_KEY=your_key_here
JWT_SECRET=any_long_random_string
ENCRYPTION_KEY=exactly_32_characters_here
DATABASE_URL=postgresql://localhost:5432/privacynet
```

```bash
# Start backend (Terminal 1)
cd backend && npm start

# Start frontend (Terminal 2)
cd frontend && npm install && npm start
```

App runs at **http://localhost:3000**

---

## License

MIT © 2026 Sruthi Nanam
