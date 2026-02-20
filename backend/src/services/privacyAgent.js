const { getDB } = require('../db/database');
const { v4: uuid } = require('uuid');

const SYSTEM_PROMPT = `You are a Privacy Agent. Detect ALL personally identifiable information (PII) including obfuscated forms.

Types: email (including "alice dot chen at gmail dot com"), phone (including spoken), social handles used as contact info, physical addresses.

Return ONLY valid JSON, no markdown:
{
  "hasPII": boolean,
  "piiItems": [
    { "type": "email|phone|handle|address", "original_value": "exact matched text", "start_index": 0, "end_index": 20, "confidence": 0.99 }
  ],
  "riskLevel": "none|low|medium|high"
}`;

async function scanText(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set — skipping PII scan');
    return { hasPII: false, piiItems: [] };
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Scan for PII:\n"${text}"` }],
      }),
    });
    const data = await res.json();
    const raw  = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch (err) {
    console.error('Privacy Agent error:', err.message);
    return { hasPII: false, piiItems: [] };
  }
}

async function tokenizeComment(text, commentId, authorId) {
  const result = await scanText(text);
  if (!result.hasPII || !result.piiItems?.length)
    return { tokenizedText: text, vaultEntries: [], piiCount: 0 };

  const spans = [...result.piiItems]
    .sort((a, b) => a.start_index - b.start_index)
    .filter((item, i, arr) => i === 0 || item.start_index >= arr[i - 1].end_index);

  let tokenizedText = '', pos = 0;
  const vaultEntries = [];

  for (const item of spans) {
    const s = Math.max(0, Math.min(item.start_index, text.length));
    const e = Math.max(s, Math.min(item.end_index, text.length));
    tokenizedText += text.slice(pos, s);
    const token = `[PII:${item.type}:${uuid()}]`;
    tokenizedText += token;
    vaultEntries.push({ token, piiType: item.type, value: item.original_value || text.slice(s, e), commentId, authorId });
    pos = e;
  }
  tokenizedText += text.slice(pos);
  return { tokenizedText, vaultEntries, piiCount: vaultEntries.length };
}

async function saveVaultEntries(entries) {
  const db = getDB();
  for (const e of entries) {
    await db.query(
      'INSERT INTO pii_vault (token, pii_type, value, comment_id, author_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [e.token, e.piiType, e.value, e.commentId, e.authorId]
    );
  }
}

async function resolveComment(comment, viewerId, postAuthorId) {
  const isSelf  = viewerId === comment.author_id;
  const isOwner = viewerId === postAuthorId;
  const canSee  = isSelf || isOwner;
  const db      = getDB();

  const tokenRegex = /\[PII:[a-z]+:[0-9a-f\-]+\]/g;
  const tokens = comment.text.match(tokenRegex) || [];

  let resolvedText = comment.text;
  for (const token of tokens) {
    let replacement;
    if (canSee) {
      const row = (await db.query('SELECT value, pii_type FROM pii_vault WHERE token = $1', [token])).rows[0];
      replacement = row ? row.value : '[hidden]';
    } else {
      const typeMatch = token.match(/\[PII:([a-z]+):/);
      replacement = `[${typeMatch ? typeMatch[1] : 'info'} hidden]`;
    }
    resolvedText = resolvedText.replace(token, replacement);
  }

  return {
    ...comment,
    text: resolvedText,
    visibility: isSelf ? 'self' : isOwner ? 'owner' : 'masked',
    has_pii: comment.pii_count > 0,
  };
}

async function getOwnerInbox(postId) {
  const db = getDB();
  const result = await db.query(`
    SELECT pv.value, pv.pii_type, pv.created_at,
           u.name as author_name, u.headline as author_headline,
           u.avatar_color, c.id as comment_id
    FROM pii_vault pv
    JOIN comments c ON pv.comment_id = c.id
    JOIN users u    ON pv.author_id  = u.id
    WHERE c.post_id = $1
    ORDER BY pv.created_at ASC
  `, [postId]);
  return result.rows;
}

module.exports = { tokenizeComment, saveVaultEntries, resolveComment, getOwnerInbox };
