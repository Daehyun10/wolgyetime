require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./src/models/db');
const authRouter        = require('./src/routes/auth');
const boardsRouter      = require('./src/routes/boards');
const postsRouter       = require('./src/routes/posts');
const commentsRouter    = require('./src/routes/comments');
const reportsRouter     = require('./src/routes/reports');
const adminRouter       = require('./src/routes/admin');
const mealRouter        = require('./src/routes/meal');
const bookmarksRouter   = require('./src/routes/bookmarks');
const mypageRouter      = require('./src/routes/mypage');
const pollsRouter       = require('./src/routes/polls');
const noticesRouter     = require('./src/routes/notices');
const suggestionsRouter = require('./src/routes/suggestions');
const backupRouter      = require('./src/routes/backup');

const app  = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

global.maintenanceMode = false;

app.use(helmet());

const allowedOrigins = [
  'https://wolgyetime.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

// ✅ PATCH 추가
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // ✅ PATCH 추가
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// ✅ Preflight OPTIONS에도 PATCH 추가
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'); // ✅ PATCH 추가
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  next();
});

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false, message: { error: '요청이 너무 많습니다.' } });
const writeLimiter  = rateLimit({ windowMs: 60*1000,    max: 20,   message: { error: '너무 빠르게 작성하고 있습니다.' } });
const authLimiter   = rateLimit({ windowMs: 15*60*1000, max: 10,   message: { error: '로그인 시도가 너무 많습니다.' } });

app.use(globalLimiter);

app.use('/api/auth',        authLimiter, authRouter);
app.use('/api/boards',      boardsRouter);
app.use('/api/posts',       postsRouter);
app.use('/api/comments',    writeLimiter, commentsRouter);
app.use('/api/reports',     reportsRouter);
app.use('/api/admin',       adminRouter);
app.use('/api/meal',        mealRouter);
app.use('/api/bookmarks',   bookmarksRouter);
app.use('/api/mypage',      mypageRouter);
app.use('/api/polls',       pollsRouter);
app.use('/api/notices',     noticesRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/backup',      backupRouter);

app.get('/api/maintenance', (_, res) => res.json({ maintenance: global.maintenanceMode }));
app.get('/api/health',      (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

(async () => {
  try {
    await testConnection();
    const { pool } = require('./src/models/db');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key        VARCHAR(50) PRIMARY KEY,
        value      VARCHAR(200) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(
      "INSERT INTO site_settings (key, value) VALUES ('maintenance_mode', 'false') ON CONFLICT (key) DO NOTHING"
    );

    const result = await pool.query("SELECT value FROM site_settings WHERE key = 'maintenance_mode'");
    global.maintenanceMode = result.rows[0]?.value === 'true';
    console.log(`🔧 점검 모드: ${global.maintenanceMode ? 'ON ⚠️' : 'OFF ✅'}`);
  } catch (e) {
    console.error('서버 초기화 실패:', e.message);
    global.maintenanceMode = false;
  }

  app.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  });
})();