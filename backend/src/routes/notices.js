const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* ── 공지사항 목록 조회 ── */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.id, n.title, n.content, n.is_fixed, n.is_fixed AS is_urgent,
             n.start_date, n.end_date, n.is_deleted, n.created_at, n.updated_at,
             u.name as author_name
      FROM notices n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.is_deleted = false
      ORDER BY n.is_fixed DESC, n.created_at DESC
    `);
    res.json({ notices: result.rows || [] });
  } catch (err) {
    console.error('공지사항 조회 에러:', err);
    res.status(500).json({ notices: [] });
  }
});

/* ── 공지사항 상세 조회 ── */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, n.is_fixed AS is_urgent, u.name as author_name
      FROM notices n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = $1::integer AND n.is_deleted = false
    `, [req.params.id]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('공지사항 상세 조회 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/* ── 공지사항 작성 (관리자 전용) ── */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { title, content, isUrgent, is_fixed, startDate, endDate } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }
  try {
    const urgent = isUrgent ?? is_fixed ?? false;
    const result = await pool.query(
      'INSERT INTO notices (title, content, is_fixed, start_date, end_date, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, content, urgent, startDate || null, endDate || null, req.user.id]
    );
    const row = result.rows[0];
    res.status(201).json({ ...row, is_urgent: row.is_fixed });
  } catch (err) {
    console.error('공지사항 작성 에러:', err);
    res.status(500).json({ error: '공지사항 저장 중 서버 오류가 발생했습니다.' });
  }
});

/* ── 공지사항 수정 (관리자 전용) ── */
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { title, content, isUrgent, is_fixed } = req.body;
  try {
    const urgent = isUrgent ?? is_fixed ?? null;
    const result = await pool.query(
      `UPDATE notices SET
        title    = COALESCE($1, title),
        content  = COALESCE($2, content),
        is_fixed = COALESCE($3, is_fixed),
        updated_at = CURRENT_TIMESTAMP
       WHERE id=$4 AND is_deleted=false RETURNING *`,
      [title || null, content || null, urgent, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    const row = result.rows[0];
    res.json({ ...row, is_urgent: row.is_fixed });
  } catch (err) {
    console.error('공지사항 수정 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/* ── 공지사항 삭제 (관리자 전용) ── */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE notices SET is_deleted=true WHERE id=$1::integer', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('공지사항 삭제 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
