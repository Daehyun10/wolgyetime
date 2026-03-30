-- ==========================================
-- Supabase (PostgreSQL) 통합 스키마
-- 모든 migrate 파일(1~9)의 내용이 포함됨
-- ==========================================

-- 1. ENUM 타입 생성
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'admin', 'alumni');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_target AS ENUM ('post', 'comment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_reason AS ENUM ('hate', 'privacy', 'spam', 'sexual', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. users 테이블
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  uid           VARCHAR(36)  NOT NULL UNIQUE,
  grade         SMALLINT     NOT NULL,
  class_num     SMALLINT     NOT NULL,
  student_num   SMALLINT     NOT NULL,
  name          VARCHAR(20)  NOT NULL,
  password      VARCHAR(100) NOT NULL,
  plain_password VARCHAR(100) DEFAULT NULL, -- migrate3 반영
  role          user_role    DEFAULT 'student',
  school_year   INTEGER      NOT NULL, -- YEAR -> INTEGER
  is_banned     BOOLEAN      DEFAULT FALSE,
  banned_at     TIMESTAMP,
  banned_reason VARCHAR(200),
  ban_until     TIMESTAMP    DEFAULT NULL, -- 추가
  last_ip       VARCHAR(45)  DEFAULT NULL, -- migrate 반영
  last_seen     TIMESTAMP    DEFAULT NULL, -- migrate3 반영
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 3. boards 테이블
CREATE TABLE IF NOT EXISTS boards (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  description VARCHAR(200),
  icon        VARCHAR(10)  DEFAULT '📌',
  is_locked   BOOLEAN      DEFAULT FALSE,
  sort_order  INTEGER      DEFAULT 0,
  created_by  INTEGER,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. posts 테이블
CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  board_id     INTEGER      NOT NULL,
  user_id      INTEGER      NOT NULL,
  title        VARCHAR(100) NOT NULL,
  content      TEXT         NOT NULL,
  anon_color   VARCHAR(20)  DEFAULT '#3B82F6',
  like_count   INTEGER      DEFAULT 0,
  view_count   INTEGER      DEFAULT 0, -- migrate 반영
  report_count INTEGER      DEFAULT 0,
  is_hidden    BOOLEAN      DEFAULT FALSE,
  is_deleted   BOOLEAN      DEFAULT FALSE,
  is_reported_locked BOOLEAN DEFAULT FALSE, -- migrate 반영
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- updated_at 트리거 함수
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_posts_modtime ON posts;
CREATE TRIGGER update_posts_modtime
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 5. comments 테이블
CREATE TABLE IF NOT EXISTS comments (
  id           SERIAL PRIMARY KEY,
  post_id      INTEGER      NOT NULL,
  user_id      INTEGER      NOT NULL,
  parent_id    INTEGER      DEFAULT NULL, -- migrate 반영
  content      VARCHAR(500) NOT NULL,
  anon_name    VARCHAR(30)  NOT NULL,
  anon_color   VARCHAR(20)  DEFAULT '#3B82F6',
  report_count INTEGER      DEFAULT 0,
  is_hidden    BOOLEAN      DEFAULT FALSE,
  is_deleted   BOOLEAN      DEFAULT FALSE,
  is_edited    BOOLEAN      DEFAULT FALSE, -- migrate5 반영
  is_reported_locked BOOLEAN DEFAULT FALSE, -- migrate 반영
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE -- migrate 반영
);

-- 6. likes 테이블
CREATE TABLE IF NOT EXISTS likes (
  id       SERIAL PRIMARY KEY,
  post_id  INTEGER NOT NULL,
  user_id  INTEGER NOT NULL,
  UNIQUE (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE
);

-- 7. reports 테이블
CREATE TABLE IF NOT EXISTS reports (
  id          SERIAL PRIMARY KEY,
  target_type report_target NOT NULL,
  target_id   INTEGER NOT NULL,
  reporter_id INTEGER NOT NULL,
  reason      report_reason NOT NULL,
  detail      VARCHAR(300),
  reporter_ip VARCHAR(45)  DEFAULT NULL, -- migrate 반영
  is_reviewed BOOLEAN      DEFAULT FALSE,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (target_type, target_id, reporter_id),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. filter_logs 테이블
CREATE TABLE IF NOT EXISTS filter_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  content      TEXT NOT NULL,
  matched_rule VARCHAR(100) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. daily_hot_posts 테이블 (migrate2 반영)
CREATE TABLE IF NOT EXISTS daily_hot_posts (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL,
  hot_date   DATE NOT NULL,
  like_count INTEGER DEFAULT 0,
  week_no    INTEGER DEFAULT NULL, -- migrate5 반영
  in_top5    BOOLEAN DEFAULT FALSE, -- migrate5 반영
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, hot_date),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 10. meal_cache 테이블 (migrate4 반영)
CREATE TABLE IF NOT EXISTS meal_cache (
  id         SERIAL PRIMARY KEY,
  meal_date  DATE NOT NULL UNIQUE,
  meal_type  VARCHAR(20) DEFAULT '중식',
  menu       TEXT,
  calories   VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_meal_cache_modtime ON meal_cache;
CREATE TRIGGER update_meal_cache_modtime
    BEFORE UPDATE ON meal_cache
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 11. search_logs 테이블 (migrate5 반영)
CREATE TABLE IF NOT EXISTS search_logs (
  id         SERIAL PRIMARY KEY,
  keyword    VARCHAR(100) NOT NULL,
  user_id    INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_search_keyword ON search_logs(keyword);
CREATE INDEX IF NOT EXISTS idx_search_created ON search_logs(created_at);

-- 12. suggestions 테이블 (migrate7 반영)
CREATE TABLE IF NOT EXISTS suggestions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  content     VARCHAR(500) NOT NULL,
  admin_reply TEXT DEFAULT NULL,
  replied_at  TIMESTAMP DEFAULT NULL,
  is_replied  BOOLEAN DEFAULT FALSE,
  is_read     BOOLEAN DEFAULT FALSE,
  status      VARCHAR(20) DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. site_settings 테이블 (index.js 반영)
CREATE TABLE IF NOT EXISTS site_settings (
  key        VARCHAR(50) PRIMARY KEY,
  value      VARCHAR(200) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. notices 테이블
CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_fixed BOOLEAN DEFAULT FALSE,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- 기존 notices 테이블에 컬럼이 없을 경우 추가
ALTER TABLE notices ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

-- 15. bookmarks 테이블
CREATE TABLE IF NOT EXISTS bookmarks (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  post_id    INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 16. comment_likes 테이블
CREATE TABLE IF NOT EXISTS comment_likes (
  id         SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  UNIQUE (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

-- 17. polls 테이블
CREATE TABLE IF NOT EXISTS polls (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL UNIQUE,
  question   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- 18. poll_options 테이블
CREATE TABLE IF NOT EXISTS poll_options (
  id         SERIAL PRIMARY KEY,
  poll_id    INTEGER NOT NULL,
  label      VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

-- 19. poll_votes 테이블
CREATE TABLE IF NOT EXISTS poll_votes (
  id        SERIAL PRIMARY KEY,
  option_id INTEGER NOT NULL,
  user_id   INTEGER NOT NULL,
  UNIQUE (option_id, user_id),
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE
);

-- 20. banned_words 테이블
CREATE TABLE IF NOT EXISTS banned_words (
  id         SERIAL PRIMARY KEY,
  word       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. user_warnings 테이블
CREATE TABLE IF NOT EXISTS user_warnings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  reason     VARCHAR(200),
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 22. 초기 데이터 삽입
INSERT INTO boards (name, slug, description, icon, sort_order) VALUES
  ('전체 게시판', 'all',    '모든 게시글이 모이는 공간', '🏫', 0),
  ('공부·질문',   'study',  '같이 공부해요',              '📚', 1),
  ('급식 게시판', 'meal',   '오늘 급식은 어땠나요?',       '🍱', 2),
  ('고민 상담',   'advice', '혼자 감당하기 힘들 때',        '💬', 3),
  ('자유 게시판', 'free',   '자유롭게 이야기해요',           '😄', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;