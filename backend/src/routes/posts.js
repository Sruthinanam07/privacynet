const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB } = require('../db/database');
const { auth }  = require('../middleware/auth');

function formatPost(row, viewerId) {
  return {
    id: row.id,
    content: row.content,
    tag: row.tag,
    created_at: row.created_at,
    likes_count: parseInt(row.likes_count) || 0,
    comments_count: parseInt(row.comments_count) || 0,
    liked_by_me: !!row.liked_by_me,
    author: {
      id: row.author_id,
      name: row.author_name,
      headline: row.author_headline || '',
      avatar_color: row.avatar_color,
    },
    is_mine: row.author_id === viewerId,
  };
}

// GET /api/posts
router.get('/', auth, async (req, res) => {
  try {
    const db = getDB();
    const result = await db.query(`
      SELECT p.*,
             u.name as author_name, u.headline as author_headline, u.avatar_color,
             (SELECT COUNT(*) FROM post_likes    WHERE post_id    = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments      WHERE post_id    = p.id) as comments_count,
             (SELECT 1        FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as liked_by_me
      FROM posts p
      JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({ posts: result.rows.map(r => formatPost(r, req.user.id)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts
router.post('/', auth, async (req, res) => {
  try {
    const { content, tag = '' } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const db = getDB();
    const id = uuid();
    await db.query('INSERT INTO posts (id, author_id, content, tag) VALUES ($1,$2,$3,$4)',
      [id, req.user.id, content.trim(), tag.trim()]);

    const result = await db.query(`
      SELECT p.*, u.name as author_name, u.headline as author_headline, u.avatar_color,
             0 as likes_count, 0 as comments_count, false as liked_by_me
      FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1
    `, [id]);

    res.status(201).json({ post: formatPost(result.rows[0], req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const db = getDB();
    const existing = await db.query(
      'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, req.params.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.user.id, req.params.id]);
    } else {
      await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
    }
    const likes = (await db.query('SELECT COUNT(*) FROM post_likes WHERE post_id = $1', [req.params.id])).rows[0].count;
    res.json({ liked: !existing.rows.length, likes_count: parseInt(likes) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const db   = getDB();
    const post = (await db.query('SELECT author_id FROM posts WHERE id = $1', [req.params.id])).rows[0];
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Not your post' });
    await db.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
