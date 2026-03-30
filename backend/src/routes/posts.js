const router = require("express").Router();
const { pool } = require("../models/db");
const { authenticate } = require("../middleware/auth");
const { filterPost } = require("../services/filter");

const ANON_COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];
const rc = () => ANON_COLORS[Math.floor(Math.random() * ANON_COLORS.length)];

/* ── 인기글 TOP5 + 최신글 TOP5 ── */
router.get("/top", authenticate, async (req, res, next) => {
  try {
    const { rows: popular } = await pool.query(`
      SELECT p.id, p.title, p.like_count, p.view_count, p.anon_color, p.created_at,
        b.name AS board_name, b.icon AS board_icon,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = FALSE) AS comment_count
      FROM posts p
      JOIN boards b ON b.id = p.board_id
      WHERE p.is_deleted = FALSE AND p.is_hidden = FALSE
      ORDER BY p.like_count DESC, p.view_count DESC, p.created_at DESC
      LIMIT 5
    `);

    const { rows: latest } = await pool.query(`
      SELECT p.id, p.title, p.like_count, p.view_count, p.anon_color, p.created_at,
        b.name AS board_name, b.icon AS board_icon,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_deleted = FALSE) AS comment_count
      FROM posts p
      JOIN boards b ON b.id = p.board_id
      WHERE p.is_deleted = FALSE AND p.is_hidden = FALSE
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    res.json({ popular, latest });
  } catch (err) { next(err); }
});

/* ── 게시글 목록 ── */
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { boardId, page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const userId = req.user.id;

    let whereClauses = ["p.is_deleted = FALSE"];
    let countParams = [];
    let paramIndex = 1;

    if (boardId && boardId !== "0") {
      whereClauses.push(`p.board_id = $${paramIndex++}::integer`);
      countParams.push(parseInt(boardId));
    }

    if (req.user.role !== "admin") {
      whereClauses.push("p.is_hidden = FALSE");
    }

    if (search) {
      whereClauses.push(`(p.title ILIKE $${paramIndex++}::text OR p.content ILIKE $${paramIndex++}::text)`);
      countParams.push(`%${search}%`, `%${search}%`);
      pool.query("INSERT INTO search_logs (keyword, user_id) VALUES ($1::text, $2::integer)",
        [search.slice(0, 100), userId]).catch(() => {});
    }

    const where = whereClauses.join(" AND ");

    const mainParams = [userId, userId, ...countParams, parseInt(limit), offset];
    const limitIdx = countParams.length + 3;
    const offsetIdx = countParams.length + 4;

    const mainWhere = where.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + 2}`);

    const { rows: posts } = await pool.query(`
      SELECT p.id, p.board_id, p.title, p.content, p.anon_color,
             p.like_count, p.view_count, p.report_count, p.is_hidden,
             p.created_at, p.updated_at,
             b.name AS board_name, b.icon AS board_icon,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id AND c.is_deleted=FALSE) AS comment_count,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id AND l.user_id=$1::integer)::int AS liked,
             (p.user_id = $2::integer)::int AS is_mine
      FROM posts p JOIN boards b ON b.id=p.board_id
      WHERE ${mainWhere}
      ORDER BY p.created_at DESC
      LIMIT $${limitIdx}::integer OFFSET $${offsetIdx}::integer
    `, mainParams);

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) AS total FROM posts p WHERE ${where}`,
      countParams
    );
    const total = countResult[0]?.total || 0;

    res.json({
      posts: posts.map(p => ({
        ...p,
        is_hidden: !!p.is_hidden,
        is_mine:   !!p.is_mine,
        liked:     !!p.liked,
      })),
      total: parseInt(total),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

/* ── 게시글 작성 ── */
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { boardId, title, content } = req.body;
    if (!boardId || !title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    }

    const f = filterPost(title, content);
    if (!f.passed) {
      await pool.query('INSERT INTO filter_logs (user_id, content, matched_rule) VALUES ($1, $2, $3)',
        [req.user.id, (title + ' ' + content).slice(0, 500), f.rule]);
      return res.status(422).json({ error: `게시글이 차단되었습니다: ${f.label}`, rule: f.rule });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';
    await pool.query('UPDATE users SET last_ip=$1 WHERE id=$2', [ip, req.user.id]);

    const { rows } = await pool.query(
      'INSERT INTO posts (board_id, user_id, title, content, anon_color) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [boardId, req.user.id, title.trim(), content.trim(), rc()]
    );
    res.status(201).json({ post: { id: rows[0].id } });
  } catch (err) { next(err); }
});

/* ── 게시글 단건 ── */
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    await pool.query("UPDATE posts SET view_count = view_count + 1 WHERE id=$1::integer", [req.params.id]);

    const { rows } = await pool.query(`
      SELECT p.*, b.name AS board_name, b.icon AS board_icon,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id AND l.user_id=$1::integer)::int AS liked,
        (p.user_id = $2::integer)::int AS is_mine,
        (SELECT COUNT(*) FROM bookmarks bm WHERE bm.post_id=p.id AND bm.user_id=$3::integer)::int AS bookmarked,
        p.user_id AS post_user_id
      FROM posts p JOIN boards b ON b.id=p.board_id
      WHERE p.id=$4::integer AND p.is_deleted=FALSE
    `, [req.user.id, req.user.id, req.user.id, req.params.id]);

    if (!rows || !rows.length) return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    if (!!rows[0].is_hidden && req.user.role !== "admin") {
      return res.status(403).json({ error: "신고로 인해 숨겨진 게시글입니다." });
    }

    const postUserId = rows[0].post_user_id;
    const adminFilter = req.user.role !== "admin" ? "AND c.is_hidden=FALSE" : "";

    const { rows: comments } = await pool.query(`
      SELECT c.id, c.parent_id, c.content, c.anon_name, c.anon_color,
             c.is_hidden, c.is_edited, c.created_at,
             (c.user_id = $1::integer)::int AS is_mine,
             (c.user_id = $2::integer)::int AS is_post_author,
             (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id)::int AS like_count,
             (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $3::integer)::int AS liked
      FROM comments c
      WHERE c.post_id=$4::integer AND c.is_deleted=FALSE AND c.parent_id IS NULL ${adminFilter}
      ORDER BY c.created_at ASC
    `, [req.user.id, postUserId, req.user.id, req.params.id]);

    const { rows: replies } = await pool.query(`
      SELECT c.id, c.parent_id, c.content, c.anon_name, c.anon_color,
             c.is_hidden, c.is_edited, c.created_at,
             (c.user_id = $1::integer)::int AS is_mine,
             (c.user_id = $2::integer)::int AS is_post_author,
             (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id)::int AS like_count,
             (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $3::integer)::int AS liked
      FROM comments c
      WHERE c.post_id=$4::integer AND c.is_deleted=FALSE AND c.parent_id IS NOT NULL ${adminFilter}
      ORDER BY c.created_at ASC
    `, [req.user.id, postUserId, req.user.id, req.params.id]);

    const post = {
      ...rows[0],
      is_hidden:  !!rows[0].is_hidden,
      is_mine:    !!rows[0].is_mine,
      liked:      !!rows[0].liked,
      bookmarked: !!rows[0].bookmarked,
    };
    const norm = arr => arr.map(c => ({
      ...c,
      is_mine:        !!c.is_mine,
      is_post_author: !!c.is_post_author,
      is_hidden:      !!c.is_hidden,
      is_edited:      !!c.is_edited,
      liked:          !!c.liked,
      like_count:     Number(c.like_count) || 0,
    }));

    res.json({ post, comments: norm(comments), replies: norm(replies) });
  } catch (err) { next(err); }
});

/* ── 게시글 수정 ── */
router.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    }

    const { rows } = await pool.query(
      'SELECT user_id, is_reported_locked FROM posts WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: '본인 게시글만 수정할 수 있습니다.' });
    if (rows[0].is_reported_locked && req.user.role !== 'admin') {
      return res.status(403).json({ error: '신고된 게시글은 수정할 수 없습니다.' });
    }

    const f = filterPost(title, content);
    if (!f.passed) return res.status(422).json({ error: `수정이 차단되었습니다: ${f.label}` });

    // ✅ RETURNING으로 수정된 게시글 반환
    const { rows: updated } = await pool.query(
      'UPDATE posts SET title=$1, content=$2, updated_at=NOW() WHERE id=$3 RETURNING id, title, content, updated_at',
      [title.trim(), content.trim(), req.params.id]
    );
    res.json({ success: true, post: updated[0] });
  } catch (err) { next(err); }
});

/* ── 게시글 삭제 ── */
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT user_id FROM posts WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    await pool.query('UPDATE posts SET is_deleted=TRUE WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ── 게시글 좋아요 토글 ── */
router.post("/:id/like", authenticate, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    const { rows: existing } = await pool.query(
      'SELECT id FROM likes WHERE post_id=$1 AND user_id=$2', [postId, userId]
    );
    if (existing.length) {
      await pool.query('DELETE FROM likes WHERE post_id=$1 AND user_id=$2', [postId, userId]);
      await pool.query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id=$1', [postId]);
    } else {
      await pool.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      await pool.query('UPDATE posts SET like_count = like_count + 1 WHERE id=$1', [postId]);
    }
    const { rows } = await pool.query('SELECT like_count FROM posts WHERE id=$1', [postId]);
    res.json({ liked: !existing.length, likeCount: rows[0]?.like_count || 0 });
  } catch (err) { next(err); }
});

module.exports = router;