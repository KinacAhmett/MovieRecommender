import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import '../MovieDetail.css';

const MovieDetail = ({ token, user }) => {
  const { id } = useParams(); // ✅ movieId yerine id
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  // Film detaylarını getir
  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        
        // 1. Film detaylarını getir
        const movieResponse = await axios.get(
          `http://localhost:5000/api/movies/${id}`
        );
        setMovie(movieResponse.data.data);

        // 2. Oyuncu kadrosunu getir
        const castResponse = await axios.get(
          `http://localhost:5000/api/movies/${id}/cast`
        );
        setCast(castResponse.data.cast.slice(0, 12)); // İlk 12 oyuncu

        // 3. Benzer filmleri getir
        const similarResponse = await axios.get(
          `http://localhost:5000/api/movies/${id}/similar`
        );
        setSimilarMovies(similarResponse.data.data.slice(0, 8));

        // 4. Kullanıcı durumunu kontrol et (beğenmiş mi, izlemiş mi)
        if (token) {
          const userStatusResponse = await axios.get(
            `http://localhost:5000/api/user/movies/status/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const status = userStatusResponse.data.data;
          setIsLiked(status.isLiked);
          setIsWatched(status.isWatched);
        }

      } catch (error) {
        console.error('Film detayları yüklenemedi:', error);
        setError('Film bulunamadı');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [id, token]);

  // Film beğen
  const likeMovie = async () => {
    if (!token) {
      alert('Beğenmek için giriş yapmalısınız');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5000/api/user/movies/like',
        { 
          movieId: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genres: movie.genres
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLiked(true);
    } catch (error) {
      console.error('Beğenme hatası:', error);
    }
  };

  // Film beğenmeyi kaldır
  const unlikeMovie = async () => {
    try {
      await axios.post(
        'http://localhost:5000/api/user/movies/unlike',
        { movieId: movie.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLiked(false);
    } catch (error) {
      console.error('Beğeni kaldırma hatası:', error);
    }
  };

  // İzledim olarak işaretle
  const markAsWatched = async () => {
    if (!token) {
      alert('İzleme listesi için giriş yapmalısınız');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5000/api/user/movies/watched',
        { 
          movieId: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genres: movie.genres
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsWatched(true);
    } catch (error) {
      console.error('İzleme işaretleme hatası:', error);
    }
  };

  // İzlenenlerden kaldır
  const removeFromWatched = async () => {
    try {
      await axios.post(
        'http://localhost:5000/api/user/movies/watched/remove',
        { movieId: movie.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsWatched(false);
    } catch (error) {
      console.error('İzlenenlerden kaldırma hatası:', error);
    }
  };

  if (loading) {
    return (
      <div className="movie-detail-loading">
        <div className="loading-spinner"></div>
        <p>Film yükleniyor...</p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="movie-detail-error">
        <h2>❌ Film bulunamadı</h2>
        <button onClick={() => navigate('/browse')}>Geri Dön</button>
      </div>
    );
  }

  return (
    <div className="movie-detail-container">
      {/* Üst Navigasyon */}
      <nav className="movie-detail-nav">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Geri Dön
        </button>
        <h1>{movie.title}</h1>
      </nav>

      {/* Film Detayları */}
      <div className="movie-hero-section">
        <div className="movie-poster-large">
          {movie.poster_path ? (
            <img 
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
              alt={movie.title}
            />
          ) : (
            <div className="poster-placeholder">🎬</div>
          )}
        </div>

        <div className="movie-info">
          <div className="movie-header">
            <h1>{movie.title}</h1>
            <div className="movie-meta">
              <span className="release-year">
                {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
              </span>
              <span className="rating">
                ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
              </span>
              <span className="runtime">
                ⏱️ {movie.runtime || 'N/A'} dakika
              </span>
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="movie-actions">
            {!isLiked ? (
              <button onClick={likeMovie} className="action-btn like-btn">
                ❤️ Beğen
              </button>
            ) : (
              <button onClick={unlikeMovie} className="action-btn unlike-btn">
                💔 Beğenmeyi Kaldır
              </button>
            )}

            {!isWatched ? (
              <button onClick={markAsWatched} className="action-btn watch-btn">
                ✅ İzledim
              </button>
            ) : (
              <button onClick={removeFromWatched} className="action-btn unwatch-btn">
                🗑️ İzlenenlerden Kaldır
              </button>
            )}
          </div>

          {/* Film Türleri */}
          <div className="movie-genres">
            {movie.genres && movie.genres.map(genre => (
              <span key={genre.id} className="genre-tag">
                {genre.name}
              </span>
            ))}
          </div>

          {/* Film Özeti */}
          <div className="overview-section">
            <h3>Özet</h3>
            <p className="movie-overview-detailed">{movie.overview || 'Bu film için özet bulunmamaktadır.'}</p>
          </div>

          {/* Teknik Detaylar */}
          <div className="movie-technical">
            <div className="detail-item">
              <strong>Orjinal Dil:</strong> 
              <span>{movie.original_language?.toUpperCase() || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <strong>Durum:</strong> 
              <span>{movie.status || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <strong>Bütçe:</strong> 
              <span>{movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <strong>Gelir:</strong> 
              <span>{movie.revenue ? `$${movie.revenue.toLocaleString()}` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Oyuncu Kadrosu */}
      <section className="cast-section">
        <h2>🎭 Oyuncu Kadrosu</h2>
        <div className="cast-grid">
          {cast.map(actor => (
            <div key={actor.id} className="cast-card">
              <div className="actor-photo">
                {actor.profile_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`} 
                    alt={actor.name}
                  />
                ) : (
                  <div className="actor-placeholder">👤</div>
                )}
              </div>
              <div className="actor-info">
                <h4>{actor.name}</h4>
                <p>{actor.character}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benzer Filmler */}
      <section className="similar-movies-section">
        <h2>🎬 Benzer Filmler</h2>
        <div className="similar-movies-grid">
          {similarMovies.map(similarMovie => (
            <div 
              key={similarMovie.id} 
              className="similar-movie-card"
              onClick={() => navigate(`/movie/${similarMovie.id}`)}
            >
              {similarMovie.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w300${similarMovie.poster_path}`} 
                  alt={similarMovie.title}
                />
              ) : (
                <div className="similar-poster-placeholder">🎬</div>
              )}
              <h4>{similarMovie.title}</h4>
              <span className="similar-rating">
                ⭐ {similarMovie.vote_average?.toFixed(1) || 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MovieDetail;