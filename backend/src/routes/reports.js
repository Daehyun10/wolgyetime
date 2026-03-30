const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const REPORT_THRESHOLD = parseInt(process.env.REPORT_THRESHOLD || '3');

// ── 신고 접수 ─────────────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { targetType, targetId, reason, detail } = req.body;
    if (!['post','comment'].includes(targetType) || !targetId || !reason) {
      return res.status(400).json({ error: '신고 정보가 올바르지 않습니다.' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';

    try {
      // PostgreSQL: ? 대신 $1, $2... 사용
      await pool.query(
        'INSERT INTO reports (target_type, target_id, reporter_id, reason, detail, reporter_ip) VALUES ($1,$2,$3,$4,$5,$6)',
        [targetType, targetId, req.user.id, reason, detail || null, ip]
      );
    } catch (insertErr) {
      // PostgreSQL 고유 에러 코드: 23505 (Unique Violation)
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: '이미 신고한 게시물입니다.' });
      }
      // 컬럼 부재 에러(42703) 대응
      if (insertErr.code === '42703') {
        try {
          await pool.query(
            'INSERT INTO reports (target_type, target_id, reporter_id, reason, detail) VALUES ($1,$2,$3,$4,$5)',
            [targetType, targetId, req.user.id, reason, detail || null]
          );
        } catch (dupErr2) {
          if (dupErr2.code === '23505') {
            return res.status(409).json({ error: '이미 신고한 게시물입니다.' });
          }
          throw dupErr2;
        }
      } else {
        throw insertErr;
      }
    }

    const table = targetType === 'post' ? 'posts' : 'comments';
    await pool.query(`UPDATE ${table} SET report_count = report_count + 1 WHERE id=$1`, [targetId]);

    const { rows } = await pool.query(`SELECT report_count FROM ${table} WHERE id=$1`, [targetId]);
    const target = rows[0];
    
    if (target && target.report_count >= REPORT_THRESHOLD) {
      // ✅ 신고 임계치 초과 시 숨김 + 수정 잠금
      try {
        await pool.query(`UPDATE ${table} SET is_hidden=TRUE, is_reported_locked=TRUE WHERE id=$1`, [targetId]);
      } catch {
        await pool.query(`UPDATE ${table} SET is_hidden=TRUE WHERE id=$1`, [targetId]);
      }
    } else {
      // ✅ 임계치 미만이라도 신고 접수 즉시 수정 잠금
      try {
        await pool.query(`UPDATE ${table} SET is_reported_locked=TRUE WHERE id=$1`, [targetId]);
      } catch (_) { /* 컬럼 없으면 무시 */ }
    }

    res.json({ success: true, message: '신고가 접수되었습니다.' });
  } catch (err) { next(err); }
});

module.exports = router;