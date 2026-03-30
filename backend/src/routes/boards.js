const express = require('express');
const router = express.Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

/* ── 게시판 목록 조회 ── */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id AND p.is_deleted = FALSE)::int AS post_count
      FROM boards b
      ORDER BY b.sort_order ASC, b.id ASC
    `);
    res.json({ boards: result.rows || [] });
  } catch (err) {
    console.error('게시판 조회 에러:', err);
    res.status(500).json({ boards: [] });
  }
});

/* ── 게시판 순서 변경 (관리자 전용) — /:slug보다 먼저 등록 ── */
router.patch('/reorder', authenticate, requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ error: '잘못된 요청입니다.' });
    for (const { id, sort_order } of orders) {
      await pool.query('UPDATE boards SET sort_order=$1 WHERE id=$2::integer', [sort_order, id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('게시판 순서 변경 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/* ── 게시판 상세 조회 ── */
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id AND p.is_deleted = FALSE)::int AS post_count
      FROM boards b WHERE b.slug = $1::text
    `, [req.params.slug]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '게시판을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('게시판 상세 조회 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/* ── 게시판 생성 (관리자 전용) ── */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: '게시판 이름을 입력해주세요.' });

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `board-${Date.now()}`;

    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM boards');
    const sortOrder = parseInt(maxOrder.rows[0].max) + 1;

    const result = await pool.query(
      'INSERT INTO boards (name, slug, description, icon, sort_order, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, slug, description || '', icon || '📌', sortOrder, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: '이미 존재하는 게시판 이름입니다.' });
    console.error('게시판 생성 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/* ── 게시판 잠금/해제 (관리자 전용) ── */
router.patch('/:id/lock', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE boards SET is_locked = NOT is_locked WHERE id=$1::integer RETURNING is_locked',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: '게시판을 찾을 수 없습니다.' });
    res.json({ success: true, is_locked: result.rows[0].is_locked });
  } catch (err) {
    console.error('게시판 잠금 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

/* ── 게시판 삭제 (관리자 전용) ── */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM boards WHERE id=$1::integer', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('게시판 삭제 에러:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
