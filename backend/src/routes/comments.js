const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB } = require('../db/database');
const { auth }  = require('../middleware/auth');
const { tokenizeComment, saveVaultEntries, resolveComment, getOwnerInbox } = require('../services/privacyAgent');
const { log, EVENTS } = require('../services/audit');

// GET /api/comments/:postId
router.get('/:postId', auth, async (req, res) => {
  try {
    const db   = getDB();
    const post = (await db.query('SELECT author_id FROM posts WHERE id = $1', [req.params.postId])).rows[0];
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const result = await db.query(`
      SELECT c.*, u.name as author_name, u.headline as author_headline, u.avatar_color,
             (SELECT COUNT(*) FROM comment_likes    WHERE comment_id = c.id) as likes_count,
             (SELECT 1        FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $1) as liked_by_me
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = $2
      ORDER BY c.created_at ASC
    `, [req.user.id, req.params.postId]);

    const resolved = await Promise.all(
      result.rows.map(row => resolveComment(row, req.user.id, post.author_id))
    );

    res.json({
      comments: resolved.map(c => ({
        id: c.id, text: c.text, pii_count: c.pii_count,
        visibility: c.visibility, has_pii: c.has_pii,
        created_at: c.created_at,
        liked_by_me: !!c.liked_by_me,
        likes_count: parseInt(c.likes_count) || 0,
        author: { id: c.author_id, name: c.author_name, headline: c.author_headline || '', avatar_color: c.avatar_color },
      })),
      post_author_id: post.author_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/comments
router.post('/', auth, async (req, res) => {
  try {
    const { postId, text } = req.body;
    if (!postId || !text?.trim()) return res.status(400).json({ error: 'postId and text required' });

    const db   = getDB();
    const post = (await db.query('SELECT author_id FROM posts WHERE id = $1', [postId])).rows[0];
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const commentId = uuid();
    const { tokenizedText, vaultEntries, piiCount } = await tokenizeComment(text.trim(), commentId, req.user.id);

    await db.query(
      'INSERT INTO comments (id, post_id, author_id, text, pii_count) VALUES ($1,$2,$3,$4,$5)',
      [commentId, postId, req.user.id, tokenizedText, piiCount]
    );

    if (vaultEntries.length) {
    await saveVaultEntries(vaultEntries);
    await log(EVENTS.PII_SUBMITTED, { actorId: req.user.id, postId, commentId, ip: req.ip, metadata: { pii_count: piiCount } });
  }

    const saved = (await db.query(`
      SELECT c.*, u.name as author_name, u.headline as author_headline, u.avatar_color,
             0 as likes_count, false as liked_by_me
      FROM comments c JOIN users u ON c.author_id = u.id WHERE c.id = $1
    `, [commentId])).rows[0];

    const comment = await resolveComment(saved, req.user.id, post.author_id);

    res.status(201).json({
      comment: {
        id: comment.id, text: comment.text, pii_count: comment.pii_count,
        visibility: 'self', has_pii: piiCount > 0,
        created_at: comment.created_at, liked_by_me: false, likes_count: 0,
        author: { id: req.user.id, name: req.user.name, headline: saved.author_headline || '', avatar_color: saved.avatar_color },
      },
      pii_masked: piiCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// POST /api/comments/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const db = getDB();
    const existing = (await db.query(
      'SELECT 1 FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
      [req.user.id, req.params.id]
    )).rows;

    if (existing.length) {
      await db.query('DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2', [req.user.id, req.params.id]);
    } else {
      await db.query('INSERT INTO comment_likes (user_id, comment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
    }
    const likes = (await db.query('SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1', [req.params.id])).rows[0].count;
    res.json({ liked: !existing.length, likes_count: parseInt(likes) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// GET /api/comments/:postId/inbox
router.get('/:postId/inbox', auth, async (req, res) => {
  try {
    const db   = getDB();
    const post = (await db.query('SELECT author_id FROM posts WHERE id = $1', [req.params.postId])).rows[0];
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Only the post author can access this' });
    const inbox = await getOwnerInbox(req.params.postId);
    await log(EVENTS.PII_ACCESSED, { actorId: req.user.id, postId: req.params.postId, ip: req.ip, metadata: { inbox_size: inbox.length } });
    res.json({ inbox });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

module.exports = router;
