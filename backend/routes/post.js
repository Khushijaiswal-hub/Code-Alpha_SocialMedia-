const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Get all posts (feed)
router.get('/', authMiddleware, (req, res) => {
  const sql = `
    SELECT p.*, u.name, u.username, u.profile_pic,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;
  db.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Create post
router.post('/', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  db.query(
    'INSERT INTO posts (user_id, content) VALUES (?, ?)',
    [req.user.id, content],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, message: 'Post created!' });
    }
  );
});

// Delete post
router.delete('/:id', authMiddleware, (req, res) => {
  db.query(
    'DELETE FROM posts WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(403).json({ error: 'Not authorized' });
      res.json({ message: 'Post deleted!' });
    }
  );
});

// Like / Unlike post
router.post('/:id/like', authMiddleware, (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  db.query(
    'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
    [postId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length > 0) {
        // Unlike
        db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ liked: false });
        });
      } else {
        // Like
        db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ liked: true });
        });
      }
    }
  );
});

// Get single user's posts
router.get('/user/:userId', authMiddleware, (req, res) => {
  const sql = `
    SELECT p.*, u.name, u.username, u.profile_pic,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `;
  db.query(sql, [req.user.id, req.params.userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;