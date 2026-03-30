const router = require('express').Router();
const https  = require('https');
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const NEIS_KEY   = process.env.NEIS_API_KEY || 'f35f22669187415797945114c9111c2e';
const ATPT_CODE  = 'B10';
const SCHUL_CODE = '7010735';

/* ── 알레르기 번호 제거 ── */
function cleanMenu(raw) {
  return raw
    .replace(/[\d.]+\./g, '')
    .replace(/\d+\)/g, '')
    .replace(/\(\d[\d.,]*\)/g, '')
    .replace(/\s*\(\s*$/g, '')
    .replace(/\(+/g, '')
    .replace(/\)+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── 지난 날짜 캐시 삭제 ── */
async function cleanOldCache() {
  try {
    await pool.query('DELETE FROM meal_cache WHERE meal_date < CURRENT_DATE');
  } catch (e) {
    console.error('캐시 삭제 실패:', e.message);
  }
}

/* ── 나이스 API 호출 ── */
function fetchNeis(date) {
  return new Promise((resolve, reject) => {
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo`
      + `?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=10`
      + `&ATPT_OFCDC_SC_CODE=${ATPT_CODE}`
      + `&SD_SCHUL_CODE=${SCHUL_CODE}`
      + `&MLSV_YMD=${date}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON 파싱 실패')); }
      });
    }).on('error', reject);
  });
}

/* ── 날짜 파싱 ── */
function parseDate(dateStr) {
  const clean = dateStr.replace(/-/g, '');
  if (!/^\d{8}$/.test(clean)) return null;
  return clean;
}

function toDisplay(yyyymmdd) {
  return `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`;
}

/* ── 급식 조회 ── */
router.get('/', authenticate, async (req, res, next) => {
  try {
    cleanOldCache();
    const rawDate = req.query.date || new Date().toISOString().slice(0, 10);
    const date = parseDate(rawDate);
    if (!date) return res.status(400).json({ error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' });

    const displayDate = toDisplay(date);

    // ── 1. 캐시 확인 ──
    const { rows: cachedRows } = await pool.query(
      'SELECT * FROM meal_cache WHERE meal_date = $1', [displayDate]
    );
    const cached = cachedRows[0];
    if (cached) {
      return res.json({
        date: displayDate,
        mealType: cached.meal_type,
        menu: JSON.parse(cached.menu || '[]'),
        calories: cached.calories,
        cached: true,
      });
    }

    // ── 2. 나이스 API 호출 ──
    let menu = [];
    let mealType = '중식';
    let calories = null;

    try {
      const data = await fetchNeis(date);

      if (data.mealServiceDietInfo) {
        const rows = data.mealServiceDietInfo[1]?.row || [];
        if (rows.length > 0) {
          const row = rows[0];
          mealType = row.MMEAL_SC_NM || '중식';
          calories = row.CAL_INFO || null;
          menu = (row.DDISH_NM || '')
            .split('<br/>')
            .map(item => cleanMenu(item))
            .filter(item => item.length > 0);
        }
      }
    } catch (apiErr) {
      console.error('나이스 API 오류:', apiErr.message);
      return res.json({
        date: displayDate,
        mealType,
        menu: [],
        calories: null,
        cached: false,
        error: 'API 호출 실패',
      });
    }

    // ── 3. DB에 캐시 저장 (PostgreSQL: ON CONFLICT 사용)
    try {
      await pool.query(
        `INSERT INTO meal_cache (meal_date, meal_type, menu, calories)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (meal_date) DO UPDATE SET
           meal_type = EXCLUDED.meal_type,
           menu = EXCLUDED.menu,
           calories = EXCLUDED.calories,
           updated_at = CURRENT_TIMESTAMP`,
        [displayDate, mealType, JSON.stringify(menu), calories]
      );
    } catch (dbErr) {
      console.error('급식 캐시 저장 실패:', dbErr.message);
    }

    res.json({
      date: displayDate,
      mealType,
      menu,
      calories,
      cached: false,
    });
  } catch (err) { next(err); }
});

/* ── 이번 주 급식 전체 조회 ── */
router.get('/week', authenticate, async (req, res, next) => {
  try {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

    const week = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d.toISOString().slice(0, 10));
    }

    // PostgreSQL: WHERE meal_date = ANY($1) 사용
    const { rows: cached } = await pool.query(
      'SELECT * FROM meal_cache WHERE meal_date = ANY($1) ORDER BY meal_date ASC',
      [week]
    );

    const result = week.map(date => {
      const found = cached.find(c => {
        const cd = c.meal_date instanceof Date
          ? c.meal_date.toISOString().slice(0, 10)
          : String(c.meal_date).slice(0, 10);
        return cd === date;
      });
      return {
        date,
        mealType: found?.meal_type || '중식',
        menu: found ? JSON.parse(found.menu || '[]') : null,
        calories: found?.calories || null,
        cached: !!found,
      };
    });

    res.json({ week: result });
  } catch (err) { next(err); }
});

module.exports = router;