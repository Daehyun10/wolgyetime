# 🏫 월계고 커뮤니티

> 월계고등학교 재학생 전용 익명 커뮤니티

**접속 주소**: https://wolgyetime.vercel.app

---

## 📌 서비스 소개

월계고등학교 재학생만 가입할 수 있는 익명 커뮤니티입니다.
학년·반·번호·이름으로 본인 확인 후 완전 익명으로 활동할 수 있습니다.

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | React + Vite + Tailwind CSS + Zustand |
| Backend | Node.js + Express |
| Database | MySQL (Railway 호스팅) |
| 배포 | Vercel (프론트) / Railway (백엔드) |

---

## ✨ 주요 기능

### 일반
- 게시판 목록 / 게시글 작성·수정·삭제
- 게시글·댓글·대댓글 좋아요 (DB 저장, 새로고침 유지)
- 익명 댓글 + 대댓글 (parent_id 기반)
- 글쓴이가 댓글 달면 `익명의XX (글쓴이)` 표시
- 게시글 제목만 보기 토글 (접기/펼치기)
- 실시간 인기글 TOP5 (매일 자정 리셋) + 최신글 TOP5
- 게시글 검색
- 🍱 급식 게시판 (나이스 교육정보 API 연동, ←→ 날짜 이동)

### 검열
- 욕설 필터 (띄어쓰기·숫자·자모 분리 우회 차단)
- 특정 학생 저격 패턴 차단
- 교사 비방 차단
- 개인정보 차단 (전화번호·이메일·주민번호)
- 필터 차단 시 `filter_logs`에 기록

### 신고
- 게시글·댓글 신고
- 신고 3회 이상 → 자동 숨김 + 수정·삭제 잠금
- 신고자·작성자 IP 기록

### 관리자
- 게시판 생성·잠금·삭제
- 게시글·댓글 삭제
- 신고 관리 (원문 보기·삭제 확정·복원·신고 취소)
- 유저 차단·해제·삭제
- 학생 상세 정보 (비밀번호·IP·접속 상태) 확인
- 필터 로그 확인·초기화

### 설정
- 다크·라이트 모드
- 글자 크기 조절 (11~20px)

---

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── index.js
│   ├── models/db.js
│   ├── middleware/auth.js
│   ├── services/filter.js
│   └── routes/
│       ├── auth.js
│       ├── boards.js
│       ├── posts.js
│       ├── comments.js
│       ├── reports.js
│       ├── admin.js
│       └── meal.js
└── schema.sql

frontend/
├── src/
│   ├── App.jsx
│   ├── lib/api.js
│   ├── store/
│   │   ├── authStore.js
│   │   ├── themeStore.js
│   │   └── settingsStore.js
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   └── ui/
│   │       ├── index.jsx
│   │       └── ReportModal.jsx
│   └── pages/
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       ├── BoardPage.jsx
│       ├── PostDetailPage.jsx
│       ├── WritePostPage.jsx
│       ├── MealPage.jsx
│       ├── AdminPage.jsx
│       ├── SettingsPage.jsx
│       └── NotFoundPage.jsx
```

---

## 🗄 DB 테이블

| 테이블 | 설명 |
|--------|------|
| `users` | 유저 정보 (학번·이름·비밀번호·IP 등) |
| `boards` | 게시판 목록 |
| `posts` | 게시글 |
| `comments` | 댓글·대댓글 |
| `likes` | 게시글 좋아요 |
| `comment_likes` | 댓글 좋아요 |
| `reports` | 신고 내역 |
| `filter_logs` | 욕설 필터 차단 기록 |
| `daily_hot_posts` | 실시간 인기글 (매일 자정 리셋) |
| `meal_cache` | 급식 API 캐시 |

---

## 🔐 인증 시스템

- 학년 + 반 + 번호 + 이름 + 비밀번호로 회원가입
- 같은 학번·이름이어도 비밀번호가 다르면 별도 계정 허용
- 매년 3월 기준 학년도 재인증 필요
- 관리자는 별도 초대코드로 가입

---

## ⚙️ 환경변수 (.env)

```env
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=railway
JWT_SECRET=
ADMIN_INVITE_CODE=ADMIN2025
REPORT_THRESHOLD=3
NEIS_API_KEY=
```

---

## 🚀 로컬 실행

```bash
# 백엔드
cd backend
npm install
npm run dev

# 프론트엔드
cd frontend
npm install
npm run dev
```

---

## 📜 업데이트 내역

| 버전 | 날짜 | 내용 |
|------|------|------|
| v0.3 | 2026.03.18 | 급식 API 연동, 댓글 좋아요 DB 저장, 3단 레이아웃, 서버 최적화 |
| v0.2 | 2026.03.15 | 대댓글, 신고 시스템, 관리자 패널, 실시간 인기글 |
| v0.1 | 2026.03.15 | 최초 배포 |

---

> 문의: 관리자에게 DM 또는 커뮤니티 내 신고 기능 이용