const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* ── 건의하기 제출 ── */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: '내용을 입력해주세요.' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '500자 이내로 입력해주세요.' });
    }

    await pool.query(
      'INSERT INTO suggestions (user_id, content) VALUES ($1, $2)',
      [req.user.id, content.trim()]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/* ── 사용자 건의 조회 ── */
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const { rows: suggestions } = await pool.query(`
      SELECT s.id, s.content, s.created_at,
             s.admin_reply, s.replied_at, s.is_replied, s.status
      FROM suggestions s
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

/* ── 관리자 건의 목록 ── */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows: suggestions } = await pool.query(`
      SELECT s.id, s.content, s.is_read, s.created_at,
             s.admin_reply, s.replied_at, s.is_replied,
             u.grade, u.class_num, u.student_num, u.name
      FROM suggestions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

/* ── 건의 답변 ── */
router.post('/:id/reply', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: '답변 내용을 입력해주세요.' });
    }

    const { rowCount } = await pool.query(
      `UPDATE suggestions
       SET admin_reply = $1, is_replied = TRUE, replied_at = CURRENT_TIMESTAMP, is_read = TRUE
       WHERE id = $2`,
      [reply.trim(), id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: '해당 건의 없음' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error('reply error:', err);
    next(err);
  }
});

/* ── 건의 읽음 처리 ── */
router.patch('/:id/read', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE suggestions SET is_read = TRUE WHERE id = $1',
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;