const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, query } = require('../models/db');
const { authenticate } = require('../middleware/auth');

function currentSchoolYear() {
  const now = new Date();
  return now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
}
function getYear(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getFullYear();
  return parseInt(val);
}
function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
function safeUser(u) {
  return {
    id: u.id,
    uid: u.uid,
    grade: parseInt(u.grade) || 0,
    classNum: parseInt(u.class_num) || 0,
    studentNum: parseInt(u.student_num) || 0,
    name: String(u.name || '').trim(),
    role: u.role,
    schoolYear: getYear(u.school_year),
    is_banned: !!u.is_banned,
    bannedReason: u.banned_reason || null,
    banUntil: u.ban_until || null,
  };
}

/* ── 회원가입 ── */
router.post('/register', async (req, res, next) => {
  try {
    const isAlumni = !!req.body.isAlumni;
    const name = String(req.body.name || '').trim();
    const password = req.body.password || '';
    const adminCode = req.body.adminCode || '';

    // ── 졸업생 가입 ──────────────────────────────────────────
    if (isAlumni) {
      if (!name || !password) return res.status(400).json({ error: '이름과 비밀번호를 입력해주세요.' });
      if (password.length < 6) return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = `alumni-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const existResult = await pool.query(
        "SELECT id, password FROM users WHERE grade=0 AND class_num=0 AND student_num=0 AND name=$1 AND role='alumni'",
        [name]
      );
      for (const u of existResult.rows) {
        if (await bcrypt.compare(password, u.password)) {
          return res.status(409).json({ error: '이미 가입된 졸업생 계정입니다. 로그인해주세요.' });
        }
      }

      const sy = currentSchoolYear();
      const insertAlumniResult = await pool.query(
        "INSERT INTO users (uid, grade, class_num, student_num, name, password, plain_password, role, school_year) VALUES ($1, 0, 0, 0, $2, $3, $4, 'alumni', $5) RETURNING id",
        [uid, name, hashedPassword, password, sy]
      );
      const insertId = insertAlumniResult.rows[0].id;
      const newAlumniUserResult = await pool.query('SELECT * FROM users WHERE id=$1', [insertId]);

      try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        await pool.query('UPDATE users SET last_ip=$1 WHERE id=$2', [ip, insertId]);
      } catch {}

      return res.status(201).json({ token: makeToken(newAlumniUserResult.rows[0]), user: safeUser(newAlumniUserResult.rows[0]) });
    }

    // ── 재학생 가입 ──────────────────────────────────────────
    const grade = parseInt(req.body.grade) || 0;
    const classNum = parseInt(req.body.classNum) || 0;
    const studentNum = parseInt(req.body.studentNum) || 0;

    if (!grade || !classNum || !studentNum || !name || !password) {
      return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const sy = currentSchoolYear();
    const hash = await bcrypt.hash(password, 10);
    const role = (adminCode && adminCode === process.env.ADMIN_INVITE_CODE) ? 'admin' : 'student';
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const existStudentResult = await pool.query(
      'SELECT id, password, school_year FROM users WHERE grade=$1 AND class_num=$2 AND student_num=$3 AND name=$4',
      [grade, classNum, studentNum, name]
    );

    if (existStudentResult.rows.length) {
      const match = await bcrypt.compare(password, existStudentResult.rows[0].password);
      if (match) {
        const existYear = getYear(existStudentResult.rows[0].school_year);
        if (existYear === sy) {
          return res.status(409).json({ error: '이미 이번 학년도에 가입된 계정입니다. 로그인해주세요.' });
        }
        await pool.query('UPDATE users SET school_year=$1 WHERE id=$2', [sy, existStudentResult.rows[0].id]);
        const updatedStudentResult = await pool.query('SELECT * FROM users WHERE id=$1', [existStudentResult.rows[0].id]);
        return res.json({ token: makeToken(updatedStudentResult.rows[0]), user: safeUser(updatedStudentResult.rows[0]) });
      }
    }

    const insertStudentResult = await pool.query(
      'INSERT INTO users (uid, grade, class_num, student_num, name, password, plain_password, role, school_year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [uid, grade, classNum, studentNum, name, hash, password, role, sy]
    );
    const insertId = insertStudentResult.rows[0].id;
    const newStudentUserResult = await pool.query('SELECT * FROM users WHERE id=$1', [insertId]);

    try {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
      await pool.query('UPDATE users SET last_ip=$1 WHERE id=$2', [ip, insertId]);
    } catch {}

    res.status(201).json({ token: makeToken(newStudentUserResult.rows[0]), user: safeUser(newStudentUserResult.rows[0]) });
  } catch (err) { next(err); }
});

/* ── 로그인 ── */
router.post('/login', async (req, res, next) => {
  try {
    const isAlumni = !!req.body.isAlumni;
    const name = String(req.body.name || '').trim();
    const password = req.body.password || '';

    // ── 졸업생 로그인 ─────────────────────────────────────────
    if (isAlumni) {
      if (!name || !password) return res.status(400).json({ error: '이름과 비밀번호를 입력해주세요.' });

      const loginAlumniResult = await pool.query(
        "SELECT * FROM users WHERE grade=0 AND class_num=0 AND student_num=0 AND name=$1 AND role='alumni'",
        [name]
      );

      let matched = null;
      for (const u of loginAlumniResult.rows) {
        if (await bcrypt.compare(password, u.password)) { matched = u; break; }
      }
      if (!matched) return res.status(401).json({ error: '이름 또는 비밀번호가 올바르지 않습니다.' });
      if (matched.is_banned) return res.status(403).json({ error: '이용이 정지된 계정입니다.', banned_reason: matched.banned_reason || null });

      try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        await pool.query('UPDATE users SET last_ip=$1, plain_password=$2, last_seen=CURRENT_TIMESTAMP WHERE id=$3', [ip, password, matched.id]);
      } catch {}

      return res.json({ token: makeToken(matched), user: safeUser(matched) });
    }

    // ── 재학생 로그인 ─────────────────────────────────────────
    const grade = parseInt(req.body.grade) || 0;
    const classNum = parseInt(req.body.classNum) || 0;
    const studentNum = parseInt(req.body.studentNum) || 0;

    if (!grade || !classNum || !studentNum || !name || !password) {
      return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
    }

    const loginStudentResult = await pool.query(
      'SELECT * FROM users WHERE grade=$1 AND class_num=$2 AND student_num=$3 AND name=$4',
      [grade, classNum, studentNum, name]
    );

    let matched = null;
    for (const u of loginStudentResult.rows) {
      if (await bcrypt.compare(password, u.password)) { matched = u; break; }
    }
    if (!matched) return res.status(401).json({ error: '정보가 일치하는 계정이 없습니다.' });
    if (matched.is_banned) return res.status(403).json({ error: '이용이 정지된 계정입니다.', banned_reason: matched.banned_reason || null });

    if (getYear(matched.school_year) !== currentSchoolYear()) {
      return res.status(200).json({ needsRenewal: true });
    }

    try {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
      await pool.query('UPDATE users SET last_ip=$1, plain_password=$2, last_seen=CURRENT_TIMESTAMP WHERE id=$3', [ip, password, matched.id]);
    } catch {}

    res.json({ token: makeToken(matched), user: safeUser(matched) });
  } catch (err) { next(err); }
});

/* ── 내 정보 ── */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;