const axios = require('axios');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const tmdbService = require('../services/tmdbService');
const mlService = require('../services/mlService');

router.get('/test', (req, res) => {
  res.json({ message: 'Recommendations route çalışıyor!' });
});

router.get('/fix-genres', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const likedMovies = user.preferences.likedMovies;
        
        console.log(`🔧 Genre fix: ${likedMovies.length} film güncellenecek`);
        
        // Tüm beğenilen filmlerin genre'lerini TMDB'den al
        const updatedLikedMovies = await Promise.all(
            likedMovies.map(async (movie) => {
                try {
                    const movieDetails = await tmdbService.getMovieDetails(movie.movieId);
                    return {
                        ...movie,
                        genres: movieDetails.genres || [] // ✅ Genre ekle
                    };
                } catch (error) {
                    console.log(`❌ ${movie.title} genre alınamadı`);
                    return movie; // Genre'siz kalır
                }
            })
        );
        
        // Database'i güncelle
        user.preferences.likedMovies = updatedLikedMovies;
        await user.save();
        
        // DEBUG: Güncellenen filmleri göster
        updatedLikedMovies.forEach((movie, index) => {
            const genreNames = movie.genres ? movie.genres.map(g => g.name).join(', ') : 'BOŞ';
            console.log(`   ✅ ${index+1}. ${movie.title} - Genres: ${genreNames}`);
        });
        
        res.json({
            success: true,
            message: `${updatedLikedMovies.length} film güncellendi`,
            updated: updatedLikedMovies.length
        });
        
    } catch (error) {
        console.error('Genre fix error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/replace/:movieId', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId;
    
    console.log(`🔄 Akıllı film değiştirme: ${movieId} için kullanıcı ${userId}`);
    
    const user = await User.findById(userId);
    const likedMovies = user.preferences.likedMovies || [];
    
    // 1. KULLANICI TÜR ANALİZİ
    const userGenres = analyzeUserGenres(likedMovies);
    console.log(`🎭 Kullanıcı türleri: ${userGenres.join(', ')}`);
    
    // 2. TOP RATED FİLMLERİ GETİR
    console.log('🏆 Top Rated filmler alınıyor...');
    const topRatedMovies = await tmdbService.getTopRatedMovies(1);
    
    if (!topRatedMovies || topRatedMovies.length === 0) {
      console.log('❌ Top Rated film bulunamadı');
      return res.status(500).json({
        success: false,
        message: 'Film bulunamadı'
      });
    }
    
    console.log(`✅ ${topRatedMovies.length} Top Rated film bulundu`);
    
    // 3. MEVCUT FİLMİ ÇIKAR
    const availableMovies = topRatedMovies.filter(movie => movie.id != movieId);
    
    if (availableMovies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Yeni film bulunamadı'
      });
    }
    
    // 4. AKILLI SEÇİM - KULLANICI TÜRLERİNE GÖRE
    let selectedMovie;
    
    if (userGenres.length > 0) {
      // Kullanıcı türlerine uygun film bul
      const genreBasedMovies = await findMoviesByUserGenres(availableMovies, userGenres);
      
      if (genreBasedMovies.length > 0) {
        // Tür uyumlu filmlerden rastgele seç
        const randomIndex = Math.floor(Math.random() * genreBasedMovies.length);
        selectedMovie = genreBasedMovies[randomIndex];
        console.log(`🎯 Tür uyumlu seçim: ${selectedMovie.title}`);
      } else {
        // Tür uyumlu film yoksa, rastgele Top Rated seç
        const randomIndex = Math.floor(Math.random() * availableMovies.length);
        selectedMovie = availableMovies[randomIndex];
        console.log(`🎲 Rastgele Top Rated seçim: ${selectedMovie.title}`);
      }
    } else {
      // Kullanıcı türü yoksa, rastgele Top Rated seç
      const randomIndex = Math.floor(Math.random() * availableMovies.length);
      selectedMovie = availableMovies[randomIndex];
      console.log(`🎲 Rastgele Top Rated seçim: ${selectedMovie.title}`);
    }
    
    console.log(`✅ Seçilen film: ${selectedMovie.title} ⭐ ${selectedMovie.vote_average}`);
    
    // 5. FİLM DETAYLARINI GETİR
    const movieDetails = await tmdbService.getMovieDetails(selectedMovie.id);
    
    const newMovie = {
      ...movieDetails,
      source: 'smart_top_rated',
      reason: userGenres.length > 0 ? 
        `Top Rated + ${userGenres.join(', ')} türü` : 
        `Top Rated Film ⭐ ${selectedMovie.vote_average}`,
      score: (selectedMovie.vote_average / 10) * 0.9 + 0.1
    };
    
    console.log(`✅ Akıllı değişim: ${movieId} → ${newMovie.title}`);
    
    res.json({
      success: true,
      data: newMovie,
      message: `Akıllı öneri: ${newMovie.title}`,
      debug: {
        user_genres: userGenres,
        available_movies: availableMovies.length,
        selection_type: userGenres.length > 0 ? 'tür_bazlı' : 'rastgele'
      }
    });
    
  } catch (error) {
    console.error('❌ Film değiştirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Film değiştirilemedi'
    });
  }
});

// YARDIMCI FONKSİYONLAR
function analyzeUserGenres(likedMovies) {
  const genreCount = {};
  
  likedMovies.forEach(movie => {
    const genres = movie.genres || [];
    genres.forEach(genre => {
      if (typeof genre === 'object') {
        const genreName = genre.name;
        genreCount[genreName] = (genreCount[genreName] || 0) + 1;
      } else if (typeof genre === 'string') {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      }
    });
  });
  
  // En çok beğenilen 3 türü al
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);
  
  console.log(`📊 Tür analizi:`, genreCount);
  console.log(`🎯 Top türler: ${topGenres.join(', ')}`);
  
  return topGenres;
}

async function findMoviesByUserGenres(movies, userGenres) {
  const matchingMovies = [];
  
  for (const movie of movies) {
    try {
      // Filmin tür detaylarını getir
      const movieDetails = await tmdbService.getMovieDetails(movie.id);
      const movieGenres = movieDetails.genres.map(genre => genre.name);
      
      // Tür uyumunu kontrol et
      const matchingGenres = movieGenres.filter(genre => 
        userGenres.includes(genre)
      );
      
      if (matchingGenres.length > 0) {
        matchingMovies.push({
          ...movie,
          matching_genres: matchingGenres,
          match_score: matchingGenres.length
        });
      }
    } catch (error) {
      console.log(`❌ ${movie.title} tür bilgisi alınamadı`);
    }
  }
  
  // Eşleşme skoruna göre sırala
  matchingMovies.sort((a, b) => b.match_score - a.match_score);
  
  console.log(`🎯 ${matchingMovies.length} tür uyumlu film bulundu`);
  matchingMovies.slice(0, 5).forEach((movie, index) => {
    console.log(`   ${index + 1}. ${movie.title} - Eşleşen: ${movie.matching_genres.join(', ')}`);
  });
  
  return matchingMovies;
}

/// Hybrid öneri sistemi
router.get('/personal', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        
        console.log(`🎯 Hybrid öneri isteği: ${user.username}`);
        
        const likedMovies = user.preferences.likedMovies;
        const watchedMovies = user.preferences.watchedMovies; // ✅ İzlenen filmleri al
        const watchedMovieIds = watchedMovies.map(movie => movie.movieId);

        console.log(`📊 İstatistik: ${likedMovies.length} beğeni, ${watchedMovies.length} izlenen film`);
        
        if (likedMovies.length === 0) {
            const popularMovies = await tmdbService.getPopularMovies();
            return res.json({
                success: true,
                data: popularMovies.slice(0, 20),
                message: 'Popular movies (no preferences yet)',
                sources: { nodejs: popularMovies.length, python_ml: 0, hybrid: popularMovies.length }
            });
        }

        // 🟢 Node.js Content-Based önerileri
        console.log('🟢 Node.js önerileri hesaplanıyor...');
        const nodeRecs = await getContentBasedRecommendations(likedMovies, userId);
        
        // 🐍 Python ML önerileri - SADECE BURAYI DÜZELT!
        console.log('🐍 Python ML önerileri isteniyor...');
        
        
        // ✅ ÖNCE: Genre'li film listesi hazırla
        const likedMoviesWithGenres = await Promise.all(
            likedMovies.map(async (movie) => {
                try {
                    // Film detaylarını TMDB'den al
                    const movieDetails = await tmdbService.getMovieDetails(movie.movieId || movie.id);
                    
                    return {
                        movieId: movie.movieId || movie.id,
                        title: movieDetails.title || 'Unknown',
                        genres: movieDetails.genres || [], // ✅ Array olacak
                        poster_path: movieDetails.poster_path,
                        release_date: movieDetails.release_date,
                        vote_average: movieDetails.vote_average
                    };
                } catch (error) {
                    console.log(`❌ ${movie.movieId} detayları alınamadı`);
                    // Fallback: en azından ID'yi koru
                    return {
                        movieId: movie.movieId || movie.id,
                        title: 'Unknown',
                        genres: []
                    };
                }
            })
        );

        // ✅ SONRA: Python ML'ye genre'li filmleri gönder
        const mlRecs = await mlService.getMLRecommendations(userId, likedMoviesWithGenres, watchedMovieIds);
        
        // 🔄 Hybrid birleştirme
        console.log('🔄 Öneriler birleştiriliyor...');
        const hybridRecs = mergeHybridRecommendations(nodeRecs, mlRecs, watchedMovieIds);

        res.json({
            success: true,
            data: hybridRecs.slice(0, 20),
            sources: {
                nodejs: nodeRecs.length,
                python_ml: mlRecs.length,
                hybrid: hybridRecs.length
            },
            message: `Hybrid öneriler (${nodeRecs.length} Node.js + ${mlRecs.length} Python ML)`
        });

    } catch (error) {
        console.error('❌ Hybrid recommendation error:', error);
        // Fallback: sadece Node.js önerileri
        const user = await User.findById(req.userId);
        const fallbackRecs = await getContentBasedRecommendations(user.preferences.likedMovies, req.userId);
        res.json({
            success: true,
            data: fallbackRecs.slice(0, 20),
            message: 'Node.js önerileri (ML servis hatası)',
            sources: { nodejs: fallbackRecs.length, python_ml: 0, hybrid: fallbackRecs.length }
        });
    }
});

// Yardımcı fonksiyonlar
async function getContentBasedRecommendations(likedMovies, userId) {
    let recommendations = [];

    const user = await User.findById(userId);
    const watchedMovieIds = user.preferences.watchedMovies.map(movie => movie.movieId);
    console.log(`🚫 Filtrelenecek izlenen filmler: ${watchedMovieIds.length} film`);
    
    for (const likedMovie of likedMovies.slice(0, 3)) {
        // Genre yoksa TMDB'den al (sadece Node.js için)
        if (!likedMovie.genres || likedMovie.genres.length === 0) {
            console.log(`⚠️ ${likedMovie.title} için genre yok, TMDB'den alınıyor...`);
            try {
                const movieDetails = await tmdbService.getMovieDetails(likedMovie.movieId);
                likedMovie.genres = movieDetails.genres || [{id: 28, name: 'Action'}];
                console.log(`✅ ${likedMovie.title} genre'leri alındı:`, likedMovie.genres.map(g => g.name));
            } catch (error) {
                console.log(`❌ ${likedMovie.title} genre alınamadı, varsayılan kullanılıyor`);
                likedMovie.genres = [{id: 28, name: 'Action'}];
            }
        } else {
            console.log(`✅ ${likedMovie.title} genre'leri mevcut:`, likedMovie.genres.map(g => g.name));
        }
        
        const similarMovies = await tmdbService.getSimilarMovies(likedMovie.movieId);
        // ✅ YENİ ADIM: İzlenen filmleri ve beğenilen filmleri filtrele
    const filteredMovies = similarMovies.filter(movie => 
        !watchedMovieIds.includes(movie.id) && // İzlenen film değil
        !likedMovies.some(liked => liked.movieId === movie.id) // Zaten beğenilen film değil
    );
    
    console.log(`   🎬 ${likedMovie.title} için ${similarMovies.length} benzer film, ${filteredMovies.length} filtreli film`);
        recommendations.push(...filteredMovies);
    }

    const uniqueRecs = recommendations.filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id)
    );

    if (uniqueRecs.length < 25) {
        const popularMovies = await tmdbService.getPopularMovies();
        const additionalRecs = popularMovies.filter(movie => 
            !uniqueRecs.some(rec => rec.id === movie.id) &&
            !watchedMovieIds.includes(movie.id) // ✅ YENİ: İzlenen filmleri de filtrele
        );
        uniqueRecs.push(...additionalRecs.slice(0, 35 - uniqueRecs.length));
    }

    console.log(`✅ Node.js: ${uniqueRecs.length} öneri (${watchedMovieIds.length} izlenen film filtrelendi)`);

    return uniqueRecs;
}

function mergeHybridRecommendations(nodeRecs, mlRecs, watchedMovieIds) {
    console.log('🔄 HYBRID BİRLEŞTİRME:');
    console.log('   Node.js:', nodeRecs.length, 'film');
    console.log('   Python ML:', mlRecs.length, 'film');
    console.log(`   🚫 ${watchedMovieIds.length} izlenen film filtrelenecek`);

    const allRecs = [];
    
    // 1. ÖNCE PYTHON ML FİLMLERİNİ EKLE (izlenenleri filtrele)
    mlRecs.forEach((movie, index) => {
        const movieId = movie.id || movie.movie_id;
        
        if (watchedMovieIds.includes(movieId)) {
            console.log(`   🚫 ATLANDI: ${movie.title} (zaten izlenmiş)`);
            return;
        }
        
        console.log(`   🐍 Python ${index+1}: ${movie.title} (ID:${movieId})`);
        allRecs.push({
            ...movie,
            source: 'python_ml',
            score: 0.9 + (index * 0.01)
        });
    });
    
    // 2. SONRA NODE.JS FİLMLERİNİ EKLE
    nodeRecs.forEach(movie => {
        const existingIndex = allRecs.findIndex(m => m.id === movie.id);
        if (existingIndex === -1) {
            allRecs.push({
                ...movie,
                source: 'nodejs',
                score: 0.7 // ✅ Düşük skor
            });
        }
    });
    
    console.log('   ✅ Birleşmiş:', allRecs.length, 'film');
    
    // 3. SKORA GÖRE SIRALA (Python öncelikli)
    return allRecs.sort((a, b) => (b.score || 0) - (a.score || 0));
}

// ML servis durumu
router.get('/ml-status', async (req, res) => {
    try {
        const status = await mlService.healthCheck();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


module.exports = router;