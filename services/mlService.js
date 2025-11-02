const axios = require('axios');
const tmdbService = require('./tmdbService'); // ✅ TMDB service'ini import et

class MLService {
    constructor() {
        this.baseURL = process.env.PYTHON_ML_SERVICE || 'http://localhost:5001';
    }

    async getMLRecommendations(userId, likedMovies) {
        try {
            console.log(`🎯 ML öneri isteği gönderiliyor: User ${userId}, ${likedMovies.length} beğeni`);
            
            const response = await axios.post(`${this.baseURL}/ml/recommend`, {
                user_id: userId,
                liked_movies: likedMovies
            }, {
                timeout: 30000  // 30 saniye timeout
            });

            console.log(`✅ ML önerileri alındı: ${response.data.recommendations.length} film`);
            
            // ✅ Eksik verileri TMDB'den tamamla
            const enrichedRecommendations = await this.enrichWithTMDBData(response.data.recommendations);
            
            return enrichedRecommendations;

        } catch (error) {
            console.error('❌ ML Service Error:', error.message);
            return [];
        }
    }

    async enrichWithTMDBData(mlRecommendations) {
        console.log('🔄 ML önerileri TMDB verileriyle zenginleştiriliyor...');
        
        const enrichedRecommendations = [];
        
        for (const mlMovie of mlRecommendations) {
            try {
                // TMDB'den film detaylarını al
                const tmdbMovie = await tmdbService.getMovieDetails(mlMovie.movie_id);
                
                // ML verisi + TMDB detaylarını birleştir
                const enrichedMovie = {
                    id: mlMovie.movie_id, // ✅ Frontend'in beklediği format
                    title: mlMovie.title,
                    overview: tmdbMovie.overview, // ✅ Açıklama
                    poster_path: tmdbMovie.poster_path, // ✅ Poster
                    backdrop_path: tmdbMovie.backdrop_path, // ✅ Arkaplan
                    release_date: tmdbMovie.release_date, // ✅ Tarih
                    vote_average: tmdbMovie.vote_average, // ✅ Puan
                    vote_count: tmdbMovie.vote_count, // ✅ Oy sayısı
                    genres: tmdbMovie.genres, // ✅ Türler
                    source: mlMovie.source, // ✅ Kaynak (python_ml)
                    score: mlMovie.score, // ✅ ML skoru
                    reason: mlMovie.reason // ✅ Öneri nedeni
                };
                
                enrichedRecommendations.push(enrichedMovie);
                console.log(`   ✅ ${mlMovie.title} - veriler tamamlandı`);
                
            } catch (error) {
                console.log(`   ⚠️ ${mlMovie.title} - TMDB verisi alınamadı, basic veri kullanılıyor`);
                // TMDB'den alamazsak, en azından ML verisini koru
                const basicMovie = {
                    id: mlMovie.movie_id,
                    title: mlMovie.title,
                    overview: mlMovie.reason || 'No description available',
                    poster_path: null,
                    release_date: null,
                    vote_average: null,
                    source: mlMovie.source,
                    score: mlMovie.score,
                    reason: mlMovie.reason
                };
                enrichedRecommendations.push(basicMovie);
            }
        }
        
        console.log(`✅ ${enrichedRecommendations.length} film zenginleştirildi`);
        return enrichedRecommendations;
    }

    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseURL}/ml/health`);
            return response.data;
        } catch (error) {
            console.error('❌ ML Health Check Failed:', error.message);
            return { status: 'unhealthy', error: error.message };
        }
    }
}

module.exports = new MLService();