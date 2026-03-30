const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');
const { filterContent } = require('../services/filter');

const ANON_NAMES = ['익명의 고양이','익명의 펭귄','익명의 악어','익명의 오리','익명의 두더지','익명의 기린','익명의 코알라','익명의 해달','익명의 너구리','익명의 도마뱀','익명의 문어','익명의 여우'];
const COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6'];
const rn = () => ANON_NAMES[Math.floor(Math.random() * ANON_NAMES.length)];
const rc = () => COLORS[Math.floor(Math.random() * COLORS.length)];

/* ── 댓글/대댓글 작성 ── */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { postId, content, parentId } = req.body;
    if (!postId || !content?.trim()) return res.status(400).json({ error: '내용을 입력해주세요.' });

    if (parentId) {
      const { rows: parentRows } = await pool.query('SELECT id FROM comments WHERE id=$1 AND is_deleted=FALSE', [parentId]);
      if (!parentRows.length) return res.status(404).json({ error: '원본 댓글을 찾을 수 없습니다.' });
    }

    const f = filterContent(content);
    if (!f.passed) {
      await pool.query('INSERT INTO filter_logs (user_id, content, matched_rule) VALUES ($1, $2, $3)',
        [req.user.id, content.slice(0, 500), f.rule]);
      return res.status(422).json({ error: `댓글이 차단되었습니다: ${f.label}`, rule: f.rule });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';
    await pool.query('UPDATE users SET last_ip=$1 WHERE id=$2', [ip, req.user.id]);

    const { rows: resultRows } = await pool.query(
      'INSERT INTO comments (post_id, user_id, content, anon_name, anon_color, parent_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [postId, req.user.id, content.trim(), rn(), rc(), parentId || null]
    );
    const { rows } = await pool.query('SELECT * FROM comments WHERE id=$1', [resultRows[0].id]);
    res.status(201).json({ comment: rows[0] });
  } catch (err) { next(err); }
});

/* ── 댓글 수정 ── */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: '내용을 입력해주세요.' });

    const { rows } = await pool.query('SELECT * FROM comments WHERE id=$1 AND is_deleted=FALSE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: '본인 댓글만 수정할 수 있습니다.' });

    const f = filterContent(content);
    if (!f.passed) return res.status(422).json({ error: `수정이 차단되었습니다: ${f.label}` });

    await pool.query('UPDATE comments SET content=$1, is_edited=TRUE WHERE id=$2', [content.trim(), req.params.id]);
    const { rows: updated } = await pool.query('SELECT * FROM comments WHERE id=$1', [req.params.id]);
    res.json({ comment: { ...updated[0], is_edited: true } });
  } catch (err) { next(err); }
});

/* ── 댓글 좋아요 토글 ── */
router.post('/:id/like', authenticate, async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user.id;
    const { rows: existing } = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id=$1 AND user_id=$2', [commentId, userId]
    );
    if (existing.length) {
      await pool.query('DELETE FROM comment_likes WHERE comment_id=$1 AND user_id=$2', [commentId, userId]);
    } else {
      await pool.query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [commentId, userId]);
    }
    const { rows: cntRows } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM comment_likes WHERE comment_id=$1', [commentId]
    );
    res.json({ liked: !existing.length, likeCount: Number(cntRows[0].cnt) });
  } catch (err) { next(err); }
});

/* ── 댓글 삭제 ── */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM comments WHERE id=$1 AND is_deleted=FALSE', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '권한이 없습니다.' });
    await pool.query('UPDATE comments SET is_deleted=TRUE WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
