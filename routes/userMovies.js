// routes/userMovies.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { likeMovie, unlikeMovie, addToWatchlist, getLikedMovies, getWatchlist, markAsWatched, removeFromWatched, getWatchedMovies } = require('../controllers/movieController');

// Tüm route'lar protected (auth gerektirir)
router.post('/like', authMiddleware, likeMovie);
router.post('/unlike', authMiddleware, unlikeMovie);
router.get('/liked', authMiddleware, getLikedMovies);
router.post('/watchlist', authMiddleware, addToWatchlist);
router.get('/watchlist', authMiddleware, getWatchlist);
router.post('/watched', authMiddleware, markAsWatched);
router.post('/watched/remove', authMiddleware, removeFromWatched);
router.get('/watched', authMiddleware, getWatchedMovies);

module.exports = router;