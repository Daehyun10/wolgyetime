/**
 * 콘텐츠 검열 서비스
 * - DB 금지어 연동 (5분 캐시, 서버 시작 시 즉시 로드)
 */

const { pool } = require("../models/db");

const PROFANITY_LIST = [
  "애미","애미야","니애미","느금마","느그엄마",
  "니애비","느개비","니아빠","ㄴㅇㅂ",
  "꺼져","닥쳐","뒤져","뒤지",
  "찐따","썅","쌍년","쌍놈",
  "섹스","섹x","sex",
  "야동","포르노","porn",
  "잡년","잡놈","창녀","창년","걸레년",
  "꼴통","머저리","돌대가리",
];

const SENSITIVE_PATTERNS = [
  { rule:"student_targeting", label:"특정 학생 저격",
    regex:/[1-3]학년\s*\d+반\s*[가-힣]{2,4}/g },
  { rule:"teacher_defamation", label:"교사 비방",
    regex:/[가-힣]{1,4}(쌤|선생님|교사|교수)\s*(이상해|나쁘|최악|짜증|별로|싫어|죽어|꺼져|미쳤|병신|새끼|썅)/g },
  { rule:"phone_number", label:"개인정보 (전화번호)",
    regex:/01[016789]-?\d{3,4}-?\d{4}/g },
  { rule:"email", label:"개인정보 (이메일)",
    regex:/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { rule:"rrn", label:"개인정보 (주민번호)",
    regex:/\d{6}-[1-4]\d{6}/g },
  { rule:"sexual_content", label:"음란물/성적 콘텐츠",
    regex:/(야동|포르노|porn|섹스|sex|몸캠|불법촬영|몰카)/gi },
];

const NUM_MAP = { "0":"ㅇ","1":"ㅣ","2":"ㄹ","3":"ㅋ","4":"ㅅ","5":"ㅎ","6":"ㅂ","7":"ㄱ","8":"ㅍ","9":"ㄷ" };
const JAMO_COMBINE = [
  [/ㅅㅣ/g,"시"],[/ㅆㅣ/g,"씨"],[/ㅂㅏ/g,"바"],[/ㅂㅓ/g,"버"],[/ㅂㅡ/g,"브"],[/ㅂㅜ/g,"부"],
  [/ㅁㅣ/g,"미"],[/ㅊㅣ/g,"치"],[/ㅇㅐ/g,"애"],[/ㅇㅣ/g,"이"],[/ㄴㅡ/g,"느"],[/ㄴㅏ/g,"나"],
  [/ㅅㅐ/g,"새"],[/ㄲㅣ/g,"끼"],[/ㅈㅣ/g,"지"],[/ㄱㅏ/g,"가"],[/ㅂㅕ/g,"벼"],[/ㄷㅗ/g,"도"],
  [/ㅈㅗ/g,"조"],[/ㄹㅏ/g,"라"],[/ㅍㅏ/g,"파"],[/ㅍㅓ/g,"퍼"],[/ㅎㅏ/g,"하"],[/ㅎㅡ/g,"흐"],
];

// ✅ DB 금지어 캐시
let _dbWords = [];
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function refreshCache() {
  try {
    // PostgreSQL: db.js의 래핑 덕분에 [rows] 구조 사용 가능
    const result = await pool.query("SELECT word FROM banned_words");
    const rows = result.rows;
    _dbWords = rows.map(r => r.word);
    _cacheTime = Date.now();
    console.log(`✅ 금지어 캐시 갱신: ${_dbWords.length}개`);
  } catch (e) {
    console.error("❌ 금지어 캐시 갱신 실패:", e.message);
    _dbWords = [];
  }
}

// 서버 시작 시 즉시 로드
refreshCache().catch(() => {});
// 5분마다 자동 갱신
setInterval(refreshCache, CACHE_TTL);

function normalize(text) {
  let t = text;
  for (const [n, c] of Object.entries(NUM_MAP)) t = t.split(n).join(c);
  // 정규표현식 내 백틱 제거 및 특수문자 이스케이프 처리 강화
  t = t.replace(/\s|\u200b|\u00ad|\u3000|!|@|#|$|%|^|&|\*|\(|\)|-|_|=|\+|\\|\/|<|>|,|\.|\?|~|`|\'|\"|;|\[|\]|\{|\}|·|•/g, "");
  t = t.toLowerCase();
  for (const [from, to] of JAMO_COMBINE) t = t.replace(from, to);
  return t;
}

function _check(text) {
  if (!text) return { passed: true };
  const raw  = text.replace(/\s+/g, " ").trim();
  const norm = normalize(text);

  for (const p of SENSITIVE_PATTERNS) {
    p.regex.lastIndex = 0;
    if (p.regex.test(raw)) return { passed: false, rule: p.rule, label: p.label };
  }
  for (const word of PROFANITY_LIST) {
    if (norm.includes(normalize(word)))
      // 템플릿 리터럴 대신 일반 문자열 결합 사용
      return { passed: false, rule: "profanity", label: "욕설 포함 (" + word + ")" };
  }
  // ✅ DB 금지어 (캐시)
  for (const word of _dbWords) {
    if (word && norm.includes(normalize(word)))
      // 템플릿 리터럴 대신 일반 문자열 결합 사용
      return { passed: false, rule: "banned_word", label: "금지어 포함 (" + word + ")" };
  }
  return { passed: true };
}

function filterContent(text) { return _check(text); }
function filterContentSync(text) { return _check(text); }
function filterPost(title, content) {
  const t = _check(title);
  if (!t.passed) return t;
  return _check(content);
}

// 캐시 강제 갱신 (금지어 추가/삭제 후 호출)
async function invalidateCache() {
  await refreshCache();
}

module.exports = { filterContent, filterContentSync, filterPost, invalidateCache, PROFANITY_LIST };
