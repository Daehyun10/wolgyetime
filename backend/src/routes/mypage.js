const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

/* ── 내 게시글 목록 ── */
router.get('/posts', authenticate, async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * 20;
    const { rows: posts } = await pool.query(`
      SELECT p.id, p.title, p.like_count, p.view_count, p.anon_color, p.created_at,
             b.name AS board_name, b.icon AS board_icon,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.is_deleted=FALSE) AS comment_count
      FROM posts p JOIN boards b ON b.id=p.board_id
      WHERE p.user_id=$1 AND p.is_deleted=FALSE
      ORDER BY p.created_at DESC
      LIMIT 20 OFFSET $2
    `, [req.user.id, offset]);
    
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS total FROM posts WHERE user_id=$1 AND is_deleted=FALSE', [req.user.id]
    );
    const total = parseInt(countRows[0].total);
    
    res.json({ posts, total });
  } catch (err) { next(err); }
});

/* ── 내 댓글 목록 ── */
router.get('/comments', authenticate, async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * 20;
    const { rows: comments } = await pool.query(`
      SELECT c.id, c.content, c.anon_name, c.anon_color, c.created_at, c.is_edited,
             p.id AS post_id, p.title AS post_title,
             b.name AS board_name, b.icon AS board_icon
      FROM comments c
      JOIN posts p ON p.id = c.post_id
      JOIN boards b ON b.id = p.board_id
      WHERE c.user_id=$1 AND c.is_deleted=FALSE AND p.is_deleted=FALSE
      ORDER BY c.created_at DESC
      LIMIT 20 OFFSET $2
    `, [req.user.id, offset]);

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS total FROM comments WHERE user_id=$1 AND is_deleted=FALSE', [req.user.id]
    );
    const total = parseInt(countRows[0].total);

    res.json({ comments, total });
  } catch (err) { next(err); }
});

/* ── 비밀번호 변경 ── */
router.patch('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 6자 이상이어야 합니다.' });
    }
    const { rows: users } = await pool.query('SELECT password FROM users WHERE id=$1', [req.user.id]);
    const user = users[0];
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password=$1, plain_password=$2 WHERE id=$3',
      [hash, newPassword, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;