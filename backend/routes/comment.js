const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Get comments for a post
router.get('/:postId', authMiddleware, (req, res) => {
  const sql = `
    SELECT c.*, u.name, u.username, u.profile_pic
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;
  db.query(sql, [req.params.postId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add comment
router.post('/:postId', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });

  db.query(
    'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [req.params.postId, req.user.id, content],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, message: 'Comment added!' });
    }
  );
});

// Delete comment
router.delete('/:commentId', authMiddleware, (req, res) => {
  db.query(
    'DELETE FROM comments WHERE id = ? AND user_id = ?',
    [req.params.commentId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0)
        return res.status(403).json({ error: 'Not authorized' });
      res.json({ message: 'Comment deleted!' });
    }
  );
});

module.exports = router;