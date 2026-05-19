const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Get user profile
router.get('/:id', authMiddleware, (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.username, u.bio, u.profile_pic, u.created_at,
      (SELECT COUNT(*) FROM followers WHERE following_id = u.id) AS followers_count,
      (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS following_count,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
      (SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following
    FROM users u
    WHERE u.id = ?
  `;
  db.query(sql, [req.user.id, req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

// Update profile (bio)
router.put('/profile/update', authMiddleware, (req, res) => {
  const { bio, name } = req.body;
  db.query(
    'UPDATE users SET bio = ?, name = ? WHERE id = ?',
    [bio, name, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Profile updated!' });
    }
  );
});

// Follow / Unfollow
router.post('/:id/follow', authMiddleware, (req, res) => {
  const followingId = req.params.id;
  const followerId = req.user.id;

  if (followerId == followingId)
    return res.status(400).json({ error: 'Cannot follow yourself' });

  db.query(
    'SELECT * FROM followers WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length > 0) {
        // Unfollow
        db.query(
          'DELETE FROM followers WHERE follower_id = ? AND following_id = ?',
          [followerId, followingId],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ following: false });
          }
        );
      } else {
        // Follow
        db.query(
          'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
          [followerId, followingId],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ following: true });
          }
        );
      }
    }
  );
});

// Search users
router.get('/search/:query', authMiddleware, (req, res) => {
  const q = `%${req.params.query}%`;
  db.query(
    'SELECT id, name, username, profile_pic FROM users WHERE name LIKE ? OR username LIKE ? LIMIT 10',
    [q, q],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Get all users (explore)
router.get('/', authMiddleware, (req, res) => {
  db.query(
    'SELECT id, name, username, profile_pic, bio FROM users WHERE id != ? LIMIT 20',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

module.exports = router;