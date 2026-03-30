const jwt = require("jsonwebtoken");
const { pool } = require("../models/db");

function getYear(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getFullYear();
  return parseInt(val);
}

// ✅ last_seen 캐시 — 1분에 1번만 DB write
const lastSeenCache = new Map();
const LAST_SEEN_INTERVAL = 60 * 1000; // 1분

function updateLastSeen(userId) {
  const now = Date.now();
  const last = lastSeenCache.get(userId) || 0;
  if (now - last < LAST_SEEN_INTERVAL) return;
  lastSeenCache.set(userId, now);
  // PostgreSQL: ? -> $1, NOW() -> CURRENT_TIMESTAMP
  pool.query("UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1", [userId]).catch(() => {});
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "로그인이 필요합니다." });
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // PostgreSQL: ? -> $1
    const result = await pool.query(
      "SELECT id, uid, grade, class_num, student_num, name, role, is_banned, banned_reason, ban_until, school_year FROM users WHERE id = $1",
      [payload.id]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    if (user.is_banned) {
      return res.status(403).json({ 
        error: "이용이 정지된 계정입니다.", 
        reason: user.banned_reason || "사유 미지정" 
      });
    }

    // ✅ 숫자형 데이터 타입 캐스팅 (PostgreSQL은 엄격합니다)
    req.user = {
      ...user,
      id: parseInt(user.id),
      grade: parseInt(user.grade),
      class_num: parseInt(user.class_num),
      student_num: parseInt(user.student_num)
    };
    
    // ✅ 1분에 1번만 last_seen 업데이트
    updateLastSeen(user.id);

    // 🔧 점검 모드: 관리자 외 모든 API 차단 (index.js global.maintenanceMode 참조)
    if (global.maintenanceMode && req.user.role !== "admin") {
      return res.status(503).json({ error: "점검 중입니다. 잠시 후 다시 시도해주세요.", maintenance: true });
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." });
    }
    return res.status(401).json({ error: "인증에 실패했습니다." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "관리자 권한이 필요합니다." });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
