// controllers/movieController.js
const User = require('../models/User');
const tmdbService = require('../services/tmdbService');

// Film beğenme
const likeMovie = async (req, res) => {
    try {
        const { movieId, title, rating = 5 } = req.body;
        const userId = req.userId;

        if (!movieId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Film ID ve başlık zorunludur'
            });
        }

        const user = await User.findById(userId);
        
        // ✅ YENİ: TMDB'den genre bilgisini al
        let genres = [];
        try {
            const movieDetails = await tmdbService.getMovieDetails(movieId);
            genres = movieDetails.genres || [];
            console.log(`✅ ${title} genre'leri alındı:`, genres.map(g => g.name));
        } catch (error) {
            console.log(`❌ ${title} genre alınamadı`);
        }
        
        // ✅ Genre bilgisi ile kaydet
        await user.likeMovie(movieId, title, rating, genres);

        res.json({
            success: true,
            message: 'Film beğenildi',
            data: {
                likedMovies: user.preferences.likedMovies
            }
        });

    } catch (error) {
        console.error('Like movie error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};

// Film beğenmeyi kaldırma
const unlikeMovie = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.userId;

        console.log(`🔍 Unlike movie: User ${userId}, Movie ${movieId}`);

        // ✅ ALTERNATİF: Direkt database update yap
        const user = await User.findById(userId);
        
        // Beğenilen filmleri filtrele
        user.preferences.likedMovies = user.preferences.likedMovies.filter(
            movie => movie.movieId !== movieId
        );
        
        await user.save();

        console.log(`✅ Film beğenisi kaldırıldı: ${movieId}`);

        res.json({
            success: true,
            message: 'Film beğenisi kaldırıldı',
            data: {
                likedMovies: user.preferences.likedMovies
            }
        });

    } catch (error) {
        console.error('❌ Unlike movie error:', error);
        res.status(500).json({
            success: false,
            message: `Sunucu hatası: ${error.message}`
        });
    }
};

// İzlenecekler listesine ekleme
const addToWatchlist = async (req, res) => {
    try {
        const { movieId, title } = req.body;
        const userId = req.userId;

        if (!movieId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Film ID ve başlık zorunludur'
            });
        }

        const user = await User.findById(userId);
        await user.addToWatchlist(movieId, title);

        res.json({
            success: true,
            message: 'Film izlenecekler listesine eklendi',
            data: {
                watchlist: user.preferences.watchlist
            }
        });

    } catch (error) {
        console.error('Add to watchlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};


// ✅ YENİ: Beğenilen filmleri getir
const getLikedMovies = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user.preferences.likedMovies || user.preferences.likedMovies.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        // ✅ YENİ: TÜM DETAYLARI AL (directors & cast dahil)
        const likedMoviesWithDetails = await Promise.all(
            user.preferences.likedMovies.map(async (movie) => {
                try {
                    const movieDetails = await tmdbService.getMovieDetails(movie.movieId);
                    
                    // ✅ YÖNETMENLERİ ÇIKAR
                    const directors = movieDetails.credits?.crew
                        ?.filter(person => person.job === 'Director')
                        ?.map(director => ({
                            id: director.id,
                            name: director.name
                        })) || [];
                    
                    // ✅ OYUNCULARI ÇIKAR (ilk 5)
                    const cast = movieDetails.credits?.cast
                        ?.slice(0, 5)
                        ?.map(actor => ({
                            id: actor.id,
                            name: actor.name
                        })) || [];
                    
                    return {
                        movieId: movie.movieId,
                        title: movie.title || movieDetails.title,
                        poster_path: movieDetails.poster_path,
                        release_date: movieDetails.release_date,
                        vote_average: movieDetails.vote_average,
                        genres: movieDetails.genres || [],
                        overview: movieDetails.overview,
                        // ✅ BUNLARI EKLE:
                        directors: directors,
                        cast: cast
                    };
                } catch (error) {
                    // TMDB'den alınamazsa basic bilgileri döndür
                    return {
                        movieId: movie.movieId,
                        title: movie.title || 'Unknown Movie',
                        poster_path: null,
                        release_date: null,
                        vote_average: null,
                        genres: [],
                        overview: null,
                        directors: [],  
                        cast: []
                    };
                }
            })
        );

        console.log(`✅ getLikedMovies: ${likedMoviesWithDetails.length} film, ` +
                   `ilk filmde ${likedMoviesWithDetails[0]?.directors?.length || 0} yönetmen, ` +
                   `${likedMoviesWithDetails[0]?.cast?.length || 0} oyuncu`);

        res.json({
            success: true,
            data: likedMoviesWithDetails,
            count: likedMoviesWithDetails.length
        });

    } catch (error) {
        console.error('Get liked movies error:', error);
        res.status(500).json({
            success: false,
            message: 'Beğenilen filmler getirilirken hata oluştu'
        });
    }
};

// ✅ Film izlendi olarak işaretle
const markAsWatched = async (req, res) => {
    try {
        const { movieId, title, rating, genres = [] } = req.body;
        const userId = req.userId;

        if (!movieId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Film ID ve başlık zorunludur'
            });
        }

        const user = await User.findById(userId);
        const added = await user.addToWatched(movieId, title, rating, genres);

        if (added) {
            res.json({
                success: true,
                message: 'Film izlenenler listesine eklendi',
                data: {
                    watchedMovies: user.preferences.watchedMovies
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Film zaten izlenenler listesinde'
            });
        }

    } catch (error) {
        console.error('Mark as watched error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};

// ✅ Film izlenenlerden kaldır
const removeFromWatched = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.userId;

        const user = await User.findById(userId);
        await user.removeFromWatched(movieId);

        res.json({
            success: true,
            message: 'Film izlenenler listesinden kaldırıldı',
            data: {
                watchedMovies: user.preferences.watchedMovies
            }
        });

    } catch (error) {
        console.error('Remove from watched error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};

// ✅ İzlenen filmleri getir
const getWatchedMovies = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        
        // TMDB'den güncel film detaylarını al
        const watchedWithDetails = await Promise.all(
            user.preferences.watchedMovies.map(async (movie) => {
                try {
                    const movieDetails = await tmdbService.getMovieDetails(movie.movieId);
                    return {
                        movieId: movie.movieId,
                        title: movie.title,
                        poster_path: movieDetails.poster_path,
                        release_date: movieDetails.release_date,
                        vote_average: movieDetails.vote_average,
                        genres: movieDetails.genres || [],
                        watchedAt: movie.watchedAt,
                        rating: movie.rating
                    };
                } catch (error) {
                    return {
                        movieId: movie.movieId,
                        title: movie.title,
                        poster_path: null,
                        release_date: null,
                        vote_average: null,
                        genres: [],
                        watchedAt: movie.watchedAt,
                        rating: movie.rating
                    };
                }
            })
        );

        res.json({
            success: true,
            data: watchedWithDetails,
            count: watchedWithDetails.length
        });

    } catch (error) {
        console.error('Get watched movies error:', error);
        res.status(500).json({
            success: false,
            message: 'İzlenen filmler getirilemedi'
        });
    }
};

// ✅ YENİ: İzlenecekler listesini getir
const getWatchlist = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        if (!user.preferences.watchlist || user.preferences.watchlist.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        // İzlenecekler listesinin detaylarını TMDB'den al
        const watchlistWithDetails = await Promise.all(
            user.preferences.watchlist.map(async (movie) => {
                try {
                    const movieDetails = await tmdbService.getMovieDetails(movie.movieId);
                    return {
                        movieId: movie.movieId,
                        title: movie.title || movieDetails.title,
                        poster_path: movieDetails.poster_path,
                        release_date: movieDetails.release_date,
                        vote_average: movieDetails.vote_average,
                        genres: movieDetails.genres || [],
                        overview: movieDetails.overview
                    };
                } catch (error) {
                    return {
                        movieId: movie.movieId,
                        title: movie.title || 'Unknown Movie',
                        poster_path: null,
                        release_date: null,
                        vote_average: null,
                        genres: [],
                        overview: null
                    };
                }
            })
        );

        res.json({
            success: true,
            data: watchlistWithDetails,
            count: watchlistWithDetails.length
        });

    } catch (error) {
        console.error('Get watchlist error:', error);
        res.status(500).json({
            success: false,
            message: 'İzlenecekler listesi getirilirken hata oluştu'
        });
    }
};

module.exports = {
    likeMovie,
    unlikeMovie,
    addToWatchlist,
    getLikedMovies,      // ✅ Yeni eklenen
    getWatchlist,         // ✅ Yeni eklenen
    markAsWatched,        // ✅ YENİ
    removeFromWatched,    // ✅ YENİ
    getWatchedMovies      // ✅ YENİ
};