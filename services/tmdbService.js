// services/tmdbService.js
const axios = require('axios');

class TMDBService {
    constructor() {
        this.apiKey = process.env.TMDB_API_KEY;
        this.baseURL = 'https://api.themoviedb.org/3';
        this.imageBaseURL = 'https://image.tmdb.org/t/p';
    }

    async getTopRatedMovies(page = 5) {
        try {
            console.log(`📡 TMDB Top Rated isteniyor: sayfa ${page}`);
            
            const response = await axios.get(
                `${this.baseURL}/movie/top_rated?api_key=${this.apiKey}&page=${page}&language=en-US`
            );
            
            const movies = response.data.results || [];
            console.log(`✅ TMDB Top Rated & AI Based: ${movies.length} film`);
            
            // İlk 3 filmin detayını göster
            movies.slice(0, 3).forEach((movie, index) => {
                console.log(`   ${index + 1}. ${movie.title} ⭐ ${movie.vote_average}`);
            });
            
            return this.formatMovies(movies); // ✅ formatMovies kullan
        } catch (error) {
            console.error('❌ TMDB Top Rated hatası:', error);
            return [];
        }
    }

async getMovieVideos(movieId) {
    try {
        const response = await axios.get(
            `${this.baseURL}/movie/${movieId}/videos?api_key=${this.apiKey}`
        );
        return response.data.results;
    } catch (error) {
        console.error('TMDB Videos Error:', error.message);
        return [];
    }
}


    // Popüler filmleri getir
    async getPopularMovies(page = 1) {
        try {
            const response = await axios.get(
                `${this.baseURL}/movie/popular?api_key=${this.apiKey}&page=${page}`
            );
            return this.formatMovies(response.data.results);
        } catch (error) {
            console.error('TMDB Popular Movies Error:', error.message);
            throw new Error('Filmler getirilemedi');
        }
    }

    // Film ara
    async searchMovies(query, page = 1) {
        try {
            const response = await axios.get(
                `${this.baseURL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&page=${page}`
            );
            return this.formatMovies(response.data.results);
        } catch (error) {
            console.error('TMDB Search Error:', error.message);
            throw new Error('Arama yapılamadı');
        }
    }

    // Film detayları
    async getMovieDetails(movieId) {
        try {
            const response = await axios.get(
                `${this.baseURL}/movie/${movieId}?api_key=${this.apiKey}`
            );
            return this.formatMovieDetails(response.data);
        } catch (error) {
            console.error('TMDB Movie Details Error:', error.message);
            throw new Error('Film detayları getirilemedi');
        }
    }

    // Benzer filmler
    async getSimilarMovies(movieId) {
        try {
            const response = await axios.get(
                `${this.baseURL}/movie/${movieId}/similar?api_key=${this.apiKey}`
            );
            return this.formatMovies(response.data.results);
        } catch (error) {
            console.error('TMDB Similar Movies Error:', error.message);
            return []; // Hata durumunda boş array dön
        }
    }

    async getMovieCredits(movieId) {
    try {
        const response = await axios.get(
            `${this.baseURL}/movie/${movieId}/credits?api_key=${this.apiKey}`
        );
        return response.data;
    } catch (error) {
        console.error('TMDB Credits Error:', error.message);
        throw new Error('Film kadrosu getirilemedi');
    }
}

async getMovieKeywords(movieId) {
    try {
        const response = await axios.get(
            `${this.baseURL}/movie/${movieId}/keywords?api_key=${this.apiKey}`
        );
        return response.data.keywords;
    } catch (error) {
        console.error('TMDB Keywords Error:', error.message);
        return [];
    }
}

async getNowPlayingMovies(page = 1) {
        try {
            const response = await axios.get(
                `${this.baseURL}/movie/now_playing?api_key=${this.apiKey}&page=${page}&language=tr-TR&region=TR`
            );
            return this.formatMovies(response.data.results);
        } catch (error) {
            console.error('TMDB Now Playing Error:', error.message);
            return [];
        }
    }

    // ✅ YENİ: Yakında gelecek filmler
    async getUpcomingMovies(page = 1) {
        try {
            const response = await axios.get(
                `${this.baseURL}/movie/upcoming?api_key=${this.apiKey}&page=${page}&language=tr-TR&region=TR`
            );
            return this.formatMovies(response.data.results);
        } catch (error) {
            console.error('TMDB Upcoming Error:', error.message);
            return [];
        }
    }

    // ✅ YENİ: Top Rated filmler (sayfa parametresi ile)
    async getTopRatedMoviesPage(page = 1) {
        try {
            const response = await axios.get(
                `${this.baseURL}/movie/top_rated?api_key=${this.apiKey}&page=${page}&language=tr-TR&region=TR`
            );
            return this.formatMovies(response.data.results);
        } catch (error) {
            console.error('TMDB Top Rated Error:', error.message);
            return [];
        }
    }


async getAllGenres() {
    try {
        const response = await axios.get(
            `${this.baseURL}/genre/movie/list?api_key=${this.apiKey}`
        );
        return response.data.genres;
    } catch (error) {
        console.error('TMDB Genres Error:', error.message);
        return [];
    }
}


    // Format helpers
    formatMovies(movies) {
        return movies.map(movie => ({
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            poster_path: movie.poster_path ? 
                `${this.imageBaseURL}/w500${movie.poster_path}` : null,
            backdrop_path: movie.backdrop_path ? 
                `${this.imageBaseURL}/w1280${movie.backdrop_path}` : null,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            genre_ids: movie.genre_ids
        }));
    }

    formatMovieDetails(movie) {
        return {
            id: movie.id,
            title: movie.title,
            original_title: movie.original_title,
            overview: movie.overview,
            poster_path: movie.poster_path ? 
                `${this.imageBaseURL}/w500${movie.poster_path}` : null,
            backdrop_path: movie.backdrop_path ? 
                `${this.imageBaseURL}/w1280${movie.backdrop_path}` : null,
            release_date: movie.release_date,
            runtime: movie.runtime,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            genres: movie.genres || [],
            production_companies: movie.production_companies || [],
            budget: movie.budget,
            revenue: movie.revenue,
            status: movie.status,
            original_language: movie.original_language,
            // ✅ YENİ: Ek bilgiler
            tagline: movie.tagline,
            homepage: movie.homepage,
            imdb_id: movie.imdb_id,
            // ✅ YENİ: İlişkili veriler
            credits: movie.credits || {},
            videos: movie.videos || {},
            similar: movie.similar || {}
        };
    }
// ✅ YENİ: Resim URL'si oluşturma helper'ı
    getImageUrl(path, size = 'w500') {
        if (!path) return null;
        return `${this.imageBaseURL}/${size}${path}`;
    }

    // ✅ YENİ: Oyuncu fotoğrafı URL'si
    getProfileUrl(path, size = 'w200') {
        if (!path) return null;
        return `${this.imageBaseURL}/${size}${path}`;
    }
}

module.exports = new TMDBService();