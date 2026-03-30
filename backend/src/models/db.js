const { Pool } = require("pg");
require("dotenv").config();

// ✅ Supabase 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Vercel/Supabase 연결 시 필수 설정
  }
});

// ✅ MySQL의 query 함수와 호환되도록 만든 커스텀 함수
const query = (text, params) => pool.query(text, params);

// ✅ 연결 테스트 함수
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Supabase PostgreSQL 연결 성공!");
    client.release();
  } catch (err) {
    console.error("❌ DB 연결 실패:", err.message);
    throw err; // 에러를 던져서 서버가 왜 죽는지 로그에 남게 합니다.
  }
};

module.exports = {
  pool,
  query, // 👈 여기서 query를 내보내줘야 다른 파일에서 에러가 안 납니다!
  testConnection
};
