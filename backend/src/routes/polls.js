const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

/* ── 투표 생성 ── */
router.post('/:postId/create', authenticate, async (req, res, next) => {
  try {
    const { question, options } = req.body;
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: '질문과 항목을 2개 이상 입력해주세요.' });
    }
    // 이미 투표가 있으면 삭제 후 재생성
    const { rows: existingRows } = await pool.query('SELECT id FROM polls WHERE post_id=$1', [req.params.postId]);
    const existing = existingRows[0];
    if (existing) {
      await pool.query('DELETE FROM polls WHERE post_id=$1', [req.params.postId]);
    }
    
    // PostgreSQL: RETURNING id 사용
    const { rows: pollRows } = await pool.query(
      'INSERT INTO polls (post_id, question) VALUES ($1,$2) RETURNING id',
      [req.params.postId, question]
    );
    const pollId = pollRows[0].id;

    for (let i = 0; i < options.length; i++) {
      await pool.query(
        'INSERT INTO poll_options (poll_id, label, sort_order) VALUES ($1,$2,$3)',
        [pollId, options[i], i]
      );
    }
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

/* ── 투표 조회 (postId 기준) ── */
router.get('/:postId', authenticate, async (req, res, next) => {
  try {
    const { rows: pollRows } = await pool.query(
      'SELECT * FROM polls WHERE post_id=$1', [req.params.postId]
    );
    const poll = pollRows[0];
    if (!poll) return res.json({ poll: null });

    // PostgreSQL: SUM(v.user_id = ?) 대신 CASE WHEN 사용 또는 FILTER 사용
    const { rows: options } = await pool.query(`
      SELECT o.id, o.label, o.sort_order,
             COUNT(v.id) AS vote_count,
             SUM(CASE WHEN v.user_id = $1 THEN 1 ELSE 0 END) AS voted
      FROM poll_options o
      LEFT JOIN poll_votes v ON v.option_id = o.id
      WHERE o.poll_id = $2
      GROUP BY o.id
      ORDER BY o.sort_order ASC
    `, [req.user.id, poll.id]);

    const totalVotes = options.reduce((s, o) => s + Number(o.vote_count), 0);
    const myVote = options.find(o => Number(o.voted) > 0)?.id || null;

    res.json({
      poll: {
        ...poll,
        options: options.map(o => ({
          ...o,
          vote_count: Number(o.vote_count),
          voted: Number(o.voted) > 0,
          percent: totalVotes > 0 ? Math.round((Number(o.vote_count) / totalVotes) * 100) : 0,
        })),
        totalVotes,
        myVote,
      }
    });
  } catch (err) { next(err); }
});

/* ── 투표 하기 ── */
router.post('/:postId/vote', authenticate, async (req, res, next) => {
  try {
    const { optionId } = req.body;
    const { rows: pollRows } = await pool.query('SELECT * FROM polls WHERE post_id=$1', [req.params.postId]);
    const poll = pollRows[0];
    if (!poll) return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });

    // 이미 투표했으면 취소
    const { rows: existing } = await pool.query(
      `SELECT v.id, v.option_id FROM poll_votes v
       JOIN poll_options o ON o.id = v.option_id
       WHERE o.poll_id=$1 AND v.user_id=$2`,
      [poll.id, req.user.id]
    );
    if (existing.length) {
      await pool.query('DELETE FROM poll_votes WHERE id=$1', [existing[0].id]);
      if (existing[0].option_id === optionId) {
        return res.json({ voted: false });
      }
    }
    await pool.query('INSERT INTO poll_votes (option_id, user_id) VALUES ($1,$2)', [optionId, req.user.id]);
    res.json({ voted: true });
  } catch (err) { next(err); }
});

module.exports = router;