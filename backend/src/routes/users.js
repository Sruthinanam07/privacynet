const router = require('express').Router();
const { getDB } = require('../db/database');
const { auth }  = require('../middleware/auth');

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const db  = getDB();
    const result = await db.query(
      'SELECT id, name, email, headline, bio, avatar_color, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];

    const postCount    = (await db.query('SELECT COUNT(*) FROM posts    WHERE author_id = $1', [req.params.id])).rows[0].count;
    const commentCount = (await db.query('SELECT COUNT(*) FROM comments WHERE author_id = $1', [req.params.id])).rows[0].count;

    res.json({ user: { ...row, post_count: parseInt(postCount), comment_count: parseInt(commentCount) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/users/me
router.patch('/me', auth, async (req, res) => {
  try {
    const { name, headline, bio } = req.body;
    const db = getDB();

    const sets = [], vals = [];
    if (name)                { sets.push(`name = $${sets.length+1}`);     vals.push(name.trim()); }
    if (headline !== undefined) { sets.push(`headline = $${sets.length+1}`); vals.push(headline.trim()); }
    if (bio      !== undefined) { sets.push(`bio = $${sets.length+1}`);      vals.push(bio.trim()); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(req.user.id);
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);

    const updated = (await db.query(
      'SELECT id,name,email,headline,bio,avatar_color FROM users WHERE id = $1', [req.user.id]
    )).rows[0];
    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
