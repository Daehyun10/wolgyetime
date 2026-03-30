const router = require('express').Router();
const { pool } = require('../models/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { invalidateCache } = require('../services/filter');

router.use(authenticate, requireAdmin);

/* ── 통계 ── */
router.get('/stats', async (req, res, next) => {
  try {
    const uRows = await pool.query('SELECT COUNT(*) AS c FROM users');
    const pRows = await pool.query('SELECT COUNT(*) AS c FROM posts WHERE is_deleted=FALSE');
    const cRows = await pool.query('SELECT COUNT(*) AS c FROM comments WHERE is_deleted=FALSE');
    const rRows = await pool.query('SELECT COUNT(*) AS c FROM reports WHERE is_reviewed=FALSE');
    const bRows = await pool.query('SELECT COUNT(*) AS c FROM users WHERE is_banned=TRUE');
    const oRows = await pool.query(
      "SELECT COUNT(*) AS c FROM users WHERE last_seen IS NOT NULL AND last_seen >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'"
    );
    res.json({
      users: parseInt(uRows.rows[0].c),
      posts: parseInt(pRows.rows[0].c),
      comments: parseInt(cRows.rows[0].c),
      pendingReports: parseInt(rRows.rows[0].c),
      banned: parseInt(bRows.rows[0].c),
      online: parseInt(oRows.rows[0].c),
    });
  } catch (err) { next(err); }
});

/* ── 신고 목록 ── */
router.get('/reports', async (req, res, next) => {
  try {
    const { reviewed = 'false', page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * 20;

    const reports = await pool.query(`
      SELECT r.id, r.target_type, r.target_id, r.reason, r.detail,
             r.is_reviewed, r.created_at,
             u.grade, u.class_num, u.student_num, u.name AS reporter_name,
             CASE
               WHEN r.target_type='post'
                 THEN (SELECT p.title || '||' || p.content
                       FROM posts p WHERE p.id=r.target_id AND p.is_deleted=FALSE)
               ELSE
                 (SELECT c.content FROM comments c
                  WHERE c.id=r.target_id AND c.is_deleted=FALSE)
             END AS target_preview
      FROM reports r
      JOIN users u ON u.id = r.reporter_id
      WHERE r.is_reviewed = $1
      ORDER BY r.created_at DESC
      LIMIT 20 OFFSET $2
    `, [reviewed === 'true', offset]);

    for (const r of reports.rows) {
      try {
        let authorQuery = '';
        if (r.target_type === 'post') {
          authorQuery = `SELECT u.id, u.grade, u.class_num, u.student_num, u.name
                         FROM posts p JOIN users u ON u.id=p.user_id
                         WHERE p.id=$1 LIMIT 1`;
        } else {
          authorQuery = `SELECT u.id, u.grade, u.class_num, u.student_num, u.name
                         FROM comments c JOIN users u ON u.id=c.user_id
                         WHERE c.id=$1 LIMIT 1`;
        }
        const authors = await pool.query(authorQuery, [r.target_id]);
        r.author_info = authors.rows[0] || null;
      } catch {
        r.author_info = null;
      }
    }

    const normalizedReports = reports.rows.map(r => ({ ...r, is_reviewed: !!r.is_reviewed }));
    res.json({ reports: normalizedReports });
  } catch (err) { next(err); }
});

/* ── 신고 대상 원문 조회 ── */
router.get("/reports/:id/content", async (req, res, next) => {
  try {
    const reportRows = await pool.query("SELECT * FROM reports WHERE id=$1", [req.params.id]);
    const report = reportRows.rows[0];
    if (!report) return res.status(404).json({ error: '신고를 찾을 수 없습니다.' });

    if (report.target_type === 'post') {
      const postRows = await pool.query(
        `SELECT p.*, b.name AS board_name, b.icon AS board_icon,
                u.grade, u.class_num, u.student_num, u.name AS author_name, u.last_ip AS author_ip
         FROM posts p JOIN boards b ON b.id=p.board_id
         JOIN users u ON u.id=p.user_id
         WHERE p.id=$1 AND p.is_deleted=FALSE`,
        [report.target_id]
      );
      const comments = await pool.query(
        'SELECT * FROM comments WHERE post_id=$1 AND is_deleted=FALSE ORDER BY created_at ASC',
        [report.target_id]
      );
      res.json({ type: 'post', post: postRows.rows[0] || null, comments: comments.rows });
    } else {
      const commentRows = await pool.query(
        `SELECT c.*, p.title AS post_title, p.id AS post_id,
                u.grade, u.class_num, u.student_num, u.name AS author_name, u.last_ip AS author_ip
         FROM comments c JOIN posts p ON p.id=c.post_id
         JOIN users u ON u.id=c.user_id
         WHERE c.id=$1 AND c.is_deleted=FALSE`,
        [report.target_id]
      );
      res.json({ type: 'comment', comment: commentRows.rows[0] || null });
    }
  } catch (err) { next(err); }
});

/* ── 신고 검토 ── */
router.patch("/reports/:id/review", async (req, res, next) => {
  try {
    const { action } = req.body;
    const reportRows = await pool.query("SELECT * FROM reports WHERE id=$1", [req.params.id]);
    const report = reportRows.rows[0];
    if (!report) return res.status(404).json({ error: '신고를 찾을 수 없습니다.' });

    const table = report.target_type === 'post' ? 'posts' : 'comments';

    if (action === 'delete') {
      await pool.query(`UPDATE ${table} SET is_deleted=TRUE WHERE id=$1::integer`, [report.target_id]);
      await pool.query(
        'UPDATE reports SET is_reviewed=TRUE, reviewed_by=$1, reviewed_at=CURRENT_TIMESTAMP WHERE target_type=$2::report_target AND target_id=$3::integer',
        [req.user.id, report.target_type, report.target_id]
      );
    } else if (action === 'restore') {
      await pool.query(
        `UPDATE ${table} SET is_hidden=FALSE, is_reported_locked=FALSE, report_count=0 WHERE id=$1::integer`,
        [report.target_id]
      );
      await pool.query(
        'UPDATE reports SET is_reviewed=TRUE, reviewed_by=$1, reviewed_at=CURRENT_TIMESTAMP WHERE id=$2::integer',
        [req.user.id, req.params.id]
      );
    } else if (action === 'dismiss') {
      await pool.query(
        'UPDATE reports SET is_reviewed=TRUE, reviewed_by=$1, reviewed_at=CURRENT_TIMESTAMP WHERE id=$2::integer',
        [req.user.id, req.params.id]
      );
    } else {
      return res.status(400).json({ error: '알 수 없는 액션입니다.' });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 유저 목록 ── */
router.get("/users", async (req, res, next) => {
  try {
    const { search, grade, class_num, role } = req.query;
    let where = '1=1';
    const params = [];

    if (search)    { where += ` AND name LIKE $${params.length + 1}`;   params.push(`%${search}%`); }
    if (role)      { where += ` AND role = $${params.length + 1}`;      params.push(role); }
    else if (grade){ where += ` AND grade = $${params.length + 1} AND role != 'alumni'`; params.push(parseInt(grade)); }

    if (class_num && grade) { where += ` AND class_num = $${params.length + 1}`; params.push(parseInt(class_num)); }

    const users = await pool.query(
      `SELECT id, uid, grade, class_num, student_num, name, plain_password, role, is_banned,
              school_year, banned_reason, last_ip, last_seen, created_at
       FROM users WHERE ${where}
       ORDER BY
         CASE WHEN role = 'alumni' THEN 1 ELSE 0 END ASC,
         grade ASC, class_num ASC, student_num ASC`,
      params
    );
    const now = new Date();
    const mapped = users.rows.map(u => ({
      ...u,
      grade:       parseInt(u.grade),
      class_num:   parseInt(u.class_num),
      student_num: parseInt(u.student_num),
      school_year: u.school_year instanceof Date ? u.school_year.getFullYear() : parseInt(u.school_year),
      online: u.last_seen ? (now - new Date(u.last_seen)) < 5 * 60 * 1000 : false,
    }));
    res.json({ users: mapped.map(u => ({ ...u, is_banned: !!u.is_banned })) });
  } catch (err) { next(err); }
});

/* ── 유저 차단/해제 ── */
router.patch("/users/:id/ban", async (req, res, next) => {
  try {
    const { ban, reason } = req.body;
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '자기 자신을 차단할 수 없습니다.' });
    const targetRows = await pool.query("SELECT role FROM users WHERE id=$1", [req.params.id]);
    const target = targetRows.rows[0];
    if (target?.role === 'admin') return res.status(400).json({ error: '관리자 계정은 차단할 수 없습니다.' });
    await pool.query(
      'UPDATE users SET is_banned=$1, banned_at=$2, banned_reason=$3, ban_until=$4 WHERE id=$5',
      [ban, ban ? new Date() : null, ban ? (reason || '관리자 차단') : null, null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 유저 기간 차단 ── */
router.patch("/users/:id/ban-duration", async (req, res, next) => {
  try {
    const { days, reason } = req.body;
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '자기 자신을 차단할 수 없습니다.' });
    const targetRows = await pool.query("SELECT role FROM users WHERE id=$1", [req.params.id]);
    const target = targetRows.rows[0];
    if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    if (target.role === 'admin') return res.status(400).json({ error: '관리자 계정은 차단할 수 없습니다.' });

    const banUntil = days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null; // 0이면 영구 차단

    await pool.query(
      'UPDATE users SET is_banned=TRUE, banned_at=$1, banned_reason=$2, ban_until=$3 WHERE id=$4',
      [new Date(), reason || '관리자 차단', banUntil, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 유저 계정 삭제 ── */
router.delete("/users/:id", async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '자기 자신의 계정은 삭제할 수 없습니다.' });
    const targetRows = await pool.query("SELECT role FROM users WHERE id=$1", [req.params.id]);
    const target = targetRows.rows[0];
    if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    if (target.role === 'admin') return res.status(400).json({ error: '관리자 계정은 삭제할 수 없습니다.' });
    await pool.query("UPDATE posts    SET is_deleted=TRUE WHERE user_id=$1", [req.params.id]);
    await pool.query("UPDATE comments SET is_deleted=TRUE WHERE user_id=$1", [req.params.id]);
    await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 필터 로그 ── */
router.get("/filter-logs", async (req, res, next) => {
  try {
    const logs = await pool.query(`
      SELECT fl.*, u.grade, u.class_num, u.student_num, u.name
      FROM filter_logs fl JOIN users u ON u.id=fl.user_id
      ORDER BY fl.created_at DESC LIMIT 100
    `);
    res.json({ logs: logs.rows });
  } catch (err) { next(err); }
});

/* ── 필터 로그 초기화 ── */
router.delete("/filter-logs", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM filter_logs");
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 검토완료 신고 전체 삭제 ── */
router.delete("/reports/reviewed", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM reports WHERE is_reviewed=TRUE");
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 경고 목록 조회 ── */
router.get("/users/:id/warnings", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_warnings WHERE user_id=$1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json({ warnings: result.rows });
  } catch (err) { next(err); }
});

/* ── 경고 추가 ── */
router.post("/users/:id/warn", async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: '자기 자신에게 경고를 줄 수 없습니다.' });

    await pool.query(
      "INSERT INTO user_warnings (user_id, reason, created_by) VALUES ($1, $2, $3)",
      [req.params.id, reason || '관리자 경고', req.user.id]
    );

    const countRows = await pool.query("SELECT COUNT(*) AS cnt FROM user_warnings WHERE user_id=$1", [req.params.id]);
    const warningCount = parseInt(countRows.rows[0].cnt);

    // 경고 3회 이상 시 자동 차단
    if (warningCount >= 3) {
      await pool.query(
        "UPDATE users SET is_banned=TRUE, banned_at=$1, banned_reason=$2 WHERE id=$3",
        [new Date(), `경고 누적 ${warningCount}회`, req.params.id]
      );
    }

    res.json({ success: true, warningCount });
  } catch (err) { next(err); }
});

/* ── 경고 삭제 ── */
router.delete("/users/:id/warnings/:warnId", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM user_warnings WHERE id=$1 AND user_id=$2", [req.params.warnId, req.params.id]);
    const countRows = await pool.query("SELECT COUNT(*) AS cnt FROM user_warnings WHERE user_id=$1", [req.params.id]);
    res.json({ success: true, warningCount: parseInt(countRows.rows[0].cnt) });
  } catch (err) { next(err); }
});

/* ── 차단사유 조회 ── */
router.get("/users/:id/ban-info", async (req, res, next) => {
  try {
    const userRows = await pool.query(
      'SELECT is_banned, banned_reason, banned_at, ban_until FROM users WHERE id=$1',
      [req.params.id]
    );
    const user = userRows.rows[0];
    res.json({ ...user, is_banned: !!user?.is_banned });
  } catch (err) { next(err); }
});

/* ── 건의 상태 변경 ── */
router.patch("/suggestions/:id", async (req, res, next) => {
  try {
    const { status } = req.body;
    await pool.query("UPDATE suggestions SET status=$1 WHERE id=$2", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── DB 백업 (테이블별 카운트 + 최근 데이터) ── */
router.get("/backup/stats", async (req, res, next) => {
  try {
    const tables = ['users', 'posts', 'comments', 'boards', 'reports', 'likes', 'comment_likes', 'poll_votes', 'notices', 'suggestions'];
    const stats = {};
    for (const t of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
        stats[t] = parseInt(result.rows[0].cnt);
      } catch { stats[t] = 0; }
    }
    res.json({ stats, exportedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

/* ── 점검 모드 현재 상태 조회 ── */
router.get("/maintenance", (req, res) => {
  res.json({ maintenance: !!global.maintenanceMode });
});

/* ── 점검 모드 토글 ── */
router.post("/maintenance", async (req, res, next) => {
  try {
    const { on } = req.body;
    global.maintenanceMode = !!on;
    await pool.query(
      "INSERT INTO site_settings (key, value) VALUES ('maintenance_mode', $1) " +
      "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP",
      [global.maintenanceMode ? 'true' : 'false']
    );
    res.json({
      maintenance: global.maintenanceMode,
      message: global.maintenanceMode
        ? '점검 모드가 활성화되었습니다. 관리자 외 접속이 차단됩니다.'
        : '점검 모드가 해제되었습니다. 서비스가 정상 운영됩니다.',
    });
  } catch (err) { next(err); }
});

/* ── 금지어 목록 조회 ── */
router.get('/banned-words', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM banned_words ORDER BY created_at DESC');
    res.json({ words: result.rows });
  } catch (err) { next(err); }
});

/* ── 금지어 추가 ── */
router.post('/banned-words', async (req, res, next) => {
  try {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: '단어를 입력해주세요.' });
    await pool.query(
      'INSERT INTO banned_words (word) VALUES ($1::text) ON CONFLICT DO NOTHING',
      [word]
    );
    invalidateCache();
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 금지어 삭제 ── */
router.delete('/banned-words/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM banned_words WHERE id=$1::integer', [req.params.id]);
    invalidateCache();
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 건의사항 목록 조회 ── */
router.get('/suggestions', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.content, s.is_read, s.created_at,
             s.admin_reply, s.replied_at, s.is_replied, s.status,
             u.grade, u.class_num, u.student_num, u.name, u.role
      FROM suggestions s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);
    res.json({ suggestions: result.rows });
  } catch (err) { next(err); }
});

/* ── 건의사항 답변 ── */
router.post('/suggestions/:id/reply', async (req, res, next) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: '답변 내용을 입력해주세요.' });
    await pool.query(
      'UPDATE suggestions SET admin_reply=$1, replied_at=CURRENT_TIMESTAMP, is_replied=TRUE, is_read=TRUE WHERE id=$2',
      [reply, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;