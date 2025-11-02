// routes/movies.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const tmdbService = require('../services/tmdbService');
const User = require('../models/User');


console.log('🎬 movies.js routes yükleniyor...');

// Popüler filmler
router.get('/popular', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const movies = await tmdbService.getPopularMovies(page);
        res.json({
            success: true,
            data: movies,
            page: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Film arama
router.get('/search', async (req, res) => {
    try {
        const { q, page } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Arama sorgusu gerekli'
            });
        }

        const movies = await tmdbService.searchMovies(q, page || 1);
        res.json({
            success: true,
            data: movies,
            query: q,
            page: parseInt(page || 1)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Film detayları
router.get('/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        console.log('🎬 Film detay isteği - ID:', movieId);
        // ID kontrolü ekle
        if (!movieId || movieId === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz film ID'
            });
        }
        
        const movie = await tmdbService.getMovieDetails(movieId);
        
        res.json({
            success: true,
            data: movie
        });
    } catch (error) {
        console.error('❌ Film detay hatası:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Film kadrosu (oyuncular ve ekip)
router.get('/:id/credits', async (req, res) => {
    try {
        const movieId = req.params.id;
        const credits = await tmdbService.getMovieCredits(movieId);
        
        res.json({
            success: true,
            data: credits
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/:id/cast', async (req, res) => {
    try {
        const movieId = req.params.id;
        const credits = await tmdbService.getMovieCredits(movieId);
        
        res.json({
            success: true,
            cast: credits.cast || []
        });
    } catch (error) {
        console.error('Kadro getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Oyuncu kadrosu getirilemedi'
        });
    }
});

// Film anahtar kelimeleri
router.get('/:id/keywords', async (req, res) => {
    try {
        const movieId = req.params.id;
        const keywords = await tmdbService.getMovieKeywords(movieId);
        
        res.json({
            success: true,
            data: keywords
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/:id/genres', async (req, res) => {
    try {
        const movieId = req.params.id;
        const movie = await tmdbService.getMovieDetails(movieId);
        
        res.json({
            success: true,
            data: {
                movieId: movieId,
                title: movie.title,
                genres: movie.genres
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Film videoları
router.get('/:id/videos', async (req, res) => {
    try {
        const movieId = req.params.id;
        const videos = await tmdbService.getMovieVideos(movieId);
        
        res.json({
            success: true,
            data: videos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Benzer filmler
router.get('/:id/similar', async (req, res) => {
    try {
        const movieId = req.params.id;
        const similarMovies = await tmdbService.getSimilarMovies(movieId);
        
        res.json({
            success: true,
            data: similarMovies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/user/status/:movieId', authMiddleware, async (req, res) => {
    try {
        const { movieId } = req.params;
        const user = await User.findById(req.userId);
        
        const isLiked = user.preferences.likedMovies.some(
            movie => movie.movieId == movieId
        );
        
        const isWatched = user.preferences.watchedMovies.some(
            movie => movie.movieId == movieId
        );
        
        res.json({
            success: true,
            data: {
                isLiked,
                isWatched,
                movieId: parseInt(movieId)
            }
        });
    } catch (error) {
        console.error('Durum kontrol hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Durum kontrol edilemedi'
        });
    }
});

// ✅ YENİ: Top Rated filmler
router.get('/top/rated', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const movies = await tmdbService.getTopRatedMovies(page);
        
        res.json({
            success: true,
            data: movies,
            page: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ YENİ: Yakında gelecek filmler
router.get('/upcoming', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const movies = await tmdbService.getUpcomingMovies(page);
        
        res.json({
            success: true,
            data: movies,
            page: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ✅ YENİ: Vizyondaki filmler
router.get('/now-playing', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const movies = await tmdbService.getNowPlayingMovies(page);
        
        res.json({
            success: true,
            data: movies,
            page: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

 module.exports = router;