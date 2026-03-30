const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

/* ── 북마크 토글 ── */
router.post('/:postId', authenticate, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const { rows: exist } = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id=$1 AND post_id=$2::integer', [userId, postId]
    );
    if (exist.length) {
      await pool.query('DELETE FROM bookmarks WHERE user_id=$1 AND post_id=$2::integer', [userId, postId]);
      return res.json({ bookmarked: false });
    }
    await pool.query('INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2::integer)', [userId, postId]);
    res.json({ bookmarked: true });
  } catch (err) { next(err); }
});

/* ── 내 북마크 목록 ── */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows: posts } = await pool.query(`
      SELECT p.id, p.title, p.content, p.like_count, p.view_count, p.anon_color,
             p.created_at, b.name AS board_name, b.icon AS board_icon,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.is_deleted=FALSE) AS comment_count,
             bm.created_at AS bookmarked_at
      FROM bookmarks bm
      JOIN posts p ON p.id = bm.post_id
      JOIN boards b ON b.id = p.board_id
      WHERE bm.user_id=$1 AND p.is_deleted=FALSE AND p.is_hidden=FALSE
      ORDER BY bm.created_at DESC
    `, [req.user.id]);
    res.json({ posts });
  } catch (err) { next(err); }
});

module.exports = router;