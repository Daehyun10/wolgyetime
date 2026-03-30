const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');


/* ── DB 백업 다운로드 ── */
router.get('/download', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // 주요 테이블 데이터 수집 (PostgreSQL: { rows } 구조 사용)
    const { rows: users } = await pool.query('SELECT id,uid,grade,class_num,student_num,name,role,school_year,is_banned,banned_reason,created_at FROM users');
    const { rows: boards } = await pool.query('SELECT * FROM boards');
    const { rows: posts } = await pool.query('SELECT * FROM posts WHERE is_deleted=FALSE');
    const { rows: comments } = await pool.query('SELECT * FROM comments WHERE is_deleted=FALSE');
    
    const { rows: notices } = await pool.query('SELECT * FROM notices WHERE is_deleted=FALSE').catch(() => ({ rows: [] }));
    const { rows: banned_words } = await pool.query('SELECT * FROM banned_words').catch(() => ({ rows: [] }));


    const backup = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables: {
        users:        users.length,
        boards:       boards.length,
        posts:        posts.length,
        comments:     comments.length,
        notices:      notices.length,
        banned_words: banned_words.length,
      },
      data: { users, boards, posts, comments, notices, banned_words },
    };


    const json = JSON.stringify(backup, null, 2);
    const filename = `backup_${new Date().toISOString().slice(0,10)}.json`;


    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(json);
  } catch (err) { next(err); }
});


/* ── 백업 요약 정보 ── */
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows: uRows } = await pool.query('SELECT COUNT(*) AS c FROM users');
    const { rows: pRows } = await pool.query('SELECT COUNT(*) AS c FROM posts WHERE is_deleted=FALSE');
    const { rows: cRows } = await pool.query('SELECT COUNT(*) AS c FROM comments WHERE is_deleted=FALSE');
    const { rows: bwRows } = await pool.query('SELECT COUNT(*) AS c FROM banned_words').catch(() => ({ rows: [{c:0}] }));

    const u = uRows[0];
    const p = pRows[0];
    const c = cRows[0];
    const bw = bwRows[0];

    res.json({
      users:        parseInt(u.c),
      posts:        parseInt(p.c),
      comments:     parseInt(c.c),
      banned_words: parseInt(bw.c),
      db_size_note: 'Supabase 대시보드(Settings -> Database)에서 확인 가능',
    });
  } catch (err) { next(err); }
});


module.exports = router;