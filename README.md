# 🏫 월계고 커뮤니티 (Wolgye Community)

> 월계고등학교 재학생 전용 익명 커뮤니티
> **접속 주소**: [https://wolgyetime.vercel.app](https://wolgyetime.vercel.app)

---

## 📌 서비스 소개
월계고등학교 재학생만 가입할 수 있는 안전하고 쾌적한 익명 커뮤니티입니다. 학년·반·번호·이름을 통한 본인 확인 절차를 거친 후, 완전한 익명으로 자유롭게 소통할 수 있습니다.

---

## 🛠 기술 스택

| 분류 | 기술 |
| --- | --- |
| **Frontend** | React + Vite + Tailwind CSS + Zustand |
| **Backend** | Node.js + Express (Vercel Serverless) |
| **Database** | PostgreSQL (Supabase) |
| **배포** | Vercel (프론트엔드 + 백엔드) |

---

## ✨ 주요 기능

### 💬 일반 기능
- 게시판 목록 조회 및 게시글 작성·수정·삭제
- 게시글·댓글·대댓글 좋아요 (DB 저장, 새로고침 유지)
- 익명 댓글 및 대댓글 (parent_id 기반)
- 글쓴이가 댓글 작성 시 `익명의XX (글쓴이)` 표시
- 게시글 제목만 보기 토글 (접기/펼치기)
- 실시간 인기글 TOP 5 (매일 자정 리셋) 및 최신글 TOP 5 제공
- 게시글 검색 기능
- 🍱 급식 게시판 (나이스 교육정보 API 연동, 날짜 이동 기능 지원)
- 📌 게시글 스크랩(북마크) 기능
- 🔗 게시글 URL 공유 기능

### 🛡 검열 시스템
- 욕설 필터링 (띄어쓰기, 숫자, 자모 분리를 활용한 우회 완벽 차단)
- 특정 학생 저격 패턴 및 교사 비방 차단
- 개인정보(전화번호, 이메일, 주민번호) 노출 차단
- 필터 차단 시 `filter_logs` 테이블에 자동 기록

### 🚨 신고 시스템
- 부적절한 게시글 및 댓글 신고 기능
- 신고 3회 누적 시 자동 숨김 처리 및 수정·삭제 권한 잠금
- 악용 방지를 위한 신고자 및 작성자 IP 기록

### 👑 관리자 (Admin)
- 게시판 생성·잠금·삭제
- 게시글 및 댓글 강제 삭제
- 신고 관리 (원문 보기, 삭제 확정, 복원, 신고 취소)
- 악성 유저 차단·해제·삭제 및 학생 상세 정보(비밀번호, IP, 접속 상태) 확인
- 필터 로그 확인 및 초기화
- 금지어 관리 (추가·삭제)
- 공지사항 관리 (작성·수정·삭제·긴급공지)
- 건의함 관리
- 사이트 점검 모드 ON/OFF

### ⚙️ 설정
- 다크 모드 및 라이트 모드 지원
- 글자 크기 조절 기능 (11~20px)

---

## 📁 프로젝트 구조

```text
backend/
├── index.js
└── src/
    ├── models/db.js
    ├── middleware/auth.js
    ├── services/filter.js
    └── routes/
        ├── auth.js, boards.js, posts.js, comments.js, reports.js
        ├── admin.js, meal.js, bookmarks.js, mypage.js, polls.js
        └── notices.js, suggestions.js, backup.js

frontend/
├── src/
│   ├── App.jsx
│   ├── lib/api.js
│   ├── store/ (authStore.js, themeStore.js, settingsStore.js)
│   ├── components/
│   │   ├── layout/ (Layout.jsx, Header.jsx, Sidebar.jsx, MobileTabBar.jsx)
│   │   └── ui/ (NoticeBanner.jsx, ReportModal.jsx)
│   └── pages/
│       ├── LoginPage.jsx, RegisterPage.jsx, BoardPage.jsx, PostDetailPage.jsx
│       ├── WritePostPage.jsx, MealPage.jsx, AdminPage.jsx, SettingsPage.jsx
│       └── MypagePage.jsx, NotFoundPage.jsx
```

---

## 🗄 DB 테이블 (Supabase PostgreSQL)

| 테이블 | 설명 |
| --- | --- |
| `users` | 유저 정보 (학번, 이름, 비밀번호, IP 등) |
| `boards` | 게시판 목록 |
| `posts` | 게시글 |
| `comments` | 댓글 및 대댓글 |
| `likes` | 게시글 좋아요 내역 |
| `comment_likes` | 댓글 좋아요 내역 |
| `bookmarks` | 게시글 스크랩(북마크) 내역 |
| `reports` | 신고 내역 |
| `filter_logs` | 욕설 필터 차단 기록 |
| `banned_words` | 관리자 지정 금지어 목록 |
| `notices` | 공지사항 |
| `suggestions` | 건의함 |
| `search_logs` | 검색 기록 |
| `user_warnings` | 유저 경고 내역 |
| `site_settings` | 점검 모드 등 사이트 전반 설정 |
| `poll_votes` | 투표 내역 |

---

## 🔐 인증 시스템
- 학년 + 반 + 번호 + 이름 + 비밀번호 조합으로 회원가입
- 동일한 학번·이름이라도 비밀번호가 다르면 별도 계정 허용
- 매년 3월 기준 학년도 재인증 필요
- 관리자는 별도 발급된 초대코드로 가입

---

## 🚀 개발자 (Developer (dev))

| 이름 | 역할 | GitHub |
| --- | --- | --- |
| **김대현** | Frontend & Backend System | [@Daehyun10](https://github.com/Daehyun10) |
| **Claude** | Frontend Code Review  | Anthropic |
| **Manus**   | Frontend Code Review | Manus 

---

## 📜 업데이트 내역

| 버전 | 날짜 | 내용 |
| --- | --- | --- |
| **v0.5** | 2026.03.31 | Supabase(PostgreSQL) 마이그레이션, 다수 버그 수정 |
| **v0.4** | 2026.03.31 | 북마크, 공지사항, 건의함, 금지어 관리, 투표 기능 추가 |
| **v0.3** | 2026.03.18 | 급식 API 연동, 댓글 좋아요 DB 저장, 3단 레이아웃, 서버 최적화 |
| **v0.2** | 2026.03.15 | 대댓글, 신고 시스템, 관리자 패널, 실시간 인기글 추가 |
| **v0.1** | 2026.03.15 | 서비스 최초 배포 |

---

## 🐛 v0.5 버그 수정 내역

### 1. 마이그레이션 관련
- MySQL에서 Supabase(PostgreSQL) 전환으로 인한 쿼리 파라미터 타입 오류 수정 (`$1::integer`, `$1::text` 명시)
- `Sidebar.jsx`에서 `/boards` API 응답 구조 불일치 수정 (`r.data.boards` → `r.data`)
- Supabase 누락 테이블 생성 완료 (`bookmarks`, `comment_likes`, `likes`, `banned_words`, `suggestions`, `search_logs`, `user_warnings`, `site_settings`, `poll_votes`, `notices`)

### 2. CORS 오류 해결
- `index.js` CORS 설정에 `PATCH` 메서드 누락으로 인해 게시글 수정, 신고 검토, 유저 차단 등이 실패하던 문제 해결
- OPTIONS preflight 핸들러에 `PATCH` 추가

### 3. API 응답 구조 오류 개선
- `posts.js` PATCH 라우트가 `{ success: true }`만 반환하여 프론트엔드에서 `data.post.title`을 읽다 크래시가 발생하던 문제 해결 (`RETURNING` 절을 사용하여 수정된 게시글 반환하도록 변경)
- `PostDetailPage.jsx`에서 `data.post?.title ?? editTitle` 폴백 처리 추가
- 댓글 및 대댓글 수정 응답에도 동일한 안전 처리 적용

### 4. 관리자 패널 기능 보완
- `/admin/banned-words` (GET, POST, DELETE) 라우트 누락 문제 해결 (`admin.js`에 추가)
- `/admin/suggestions` GET 라우트 누락 문제 해결 (`admin.js`에 추가)
- `backup/stats` 쿼리 오타 수정 (`c` → `cnt`)

### 5. DB 연결 최적화
- Vercel 서버리스 환경에서 매 요청마다 `new Pool()`을 생성하던 문제를 `global._pgPool` 싱글톤 패턴으로 개선
- 커넥션 풀을 `max: 3`으로 제한하여 Supabase 연결 한도 초과 방지

---

> **문의 및 건의사항**: 관리자에게 DM을 보내거나 커뮤니티 내 신고/건의 기능을 이용해 주세요.
