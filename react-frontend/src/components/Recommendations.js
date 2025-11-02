import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Recommendations = ({ token, user }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [likedMovies, setLikedMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('recommendations');
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [replacingMovies, setReplacingMovies] = useState(new Set());

  // ✅ BEĞENİLEN FİLMLERİ GETİR - DOĞRU
  const fetchLikedMovies = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/user/movies/liked', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikedMovies(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch liked movies:', error);
    }
  }, [token]);

  // ✅ BEĞENİLEN FİLMİ KALDIR - DÜZELTİLDİ!
  const removeLikedMovie = async (movieId) => {
  try {
    console.log(`🔍 DEBUG: Beğeni kaldırma başlıyor...`);
    console.log(`   🎬 MovieID: ${movieId}`);
    console.log(`   🔑 Token: ${token ? 'VAR' : 'YOK'}`);
    console.log(`   🌐 URL: http://localhost:5000/api/user/movies/unlike`);

    const response = await axios.post(
      `http://localhost:5000/api/user/movies/unlike`,
      { movieId: movieId },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ DEBUG: Backend cevabı:`, response.data);

    // Beğeni listesini güncelle
    setLikedMovies(likedMovies.filter(movie => movie.movieId !== movieId));
    
    // Önerileri yenile
    await fetchRecommendations();
    
    console.log(`✅ Beğeni başarıyla kaldırıldı: ${movieId}`);
    
  } catch (error) {
    console.error('❌ DEBUG: Beğeni kaldırma hatası DETAY:');
    console.error('   📞 URL:', error.config?.url);
    console.error('   📊 Status:', error.response?.status);
    console.error('   📝 Message:', error.response?.data);
    console.error('   🔧 Code:', error.code);
    console.error('   🛑 Full Error:', error);
    
    alert(`Film kaldırılamadı: ${error.response?.data?.message || error.message}`);
  }
};

  const fetchWatchedMovies = useCallback(async () => {
  if (!token) return;
  
  try {
    const response = await axios.get('http://localhost:5000/api/user/movies/watched', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setWatchedMovies(response.data.data || []);
  } catch (error) {
    console.error('Failed to fetch watched movies:', error);
  }
}, [token]);

// ✅ YENİ: Film izlendi olarak işaretle
const markAsWatched = async (movie) => {
  try {
    await axios.post('http://localhost:5000/api/user/movies/watched', 
      {
        movieId: movie.id,
        title: movie.title,
        rating: 8, // İsteğe bağlı
        genres: movie.genres || []
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    fetchWatchedMovies();
    fetchRecommendations(); // Önerileri yenile
  } catch (error) {
    console.error('Failed to mark as watched:', error);
  }
};


// ✅ YENİ: Film izlenenlerden kaldır
const removeFromWatched = async (movieId) => {
  try {
    await axios.post('http://localhost:5000/api/user/movies/watched/remove', 
      { movieId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    fetchWatchedMovies();
  } catch (error) {
    console.error('Failed to remove from watched:', error);
  }
};

  // ✅ ÖNERİLERİ GETİR - DOĞRU
  const fetchRecommendations = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:5000/api/recommendations/personal', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecommendations(response.data.data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const replaceMovie = async (movieToReplace) => {
  try {
    // Butonu loading durumuna getir
    setReplacingMovies(prev => new Set(prev).add(movieToReplace.id));
    
    // Backend'den yeni öneri getir
    const response = await axios.get(
      `http://localhost:5000/api/recommendations/replace/${movieToReplace.id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (response.data.success && response.data.data) {
      const newMovie = response.data.data;
      
      // Eski filmi kaldır, yeni filmi ekle
      setRecommendations(prev => 
        prev.map(movie => 
          movie.id === movieToReplace.id ? newMovie : movie
        )
      );
      
      console.log(`🔄 ${movieToReplace.title} → ${newMovie.title}`);
    } else {
      alert('⚠️ Yeni öneri bulunamadı');
    }
    
  } catch (error) {
    console.error('Film değiştirme hatası:', error);
    alert('❌ Film değiştirilirken hata oluştu');
  } finally {
    // Loading durumunu kaldır
    setReplacingMovies(prev => {
      const newSet = new Set(prev);
      newSet.delete(movieToReplace.id);
      return newSet;
    });
  }
};

  useEffect(() => {
    if (token && user) {
      fetchRecommendations();
      fetchLikedMovies();
      fetchWatchedMovies();
    }
  }, [token, user, fetchRecommendations, fetchLikedMovies, fetchWatchedMovies]);

  // ✅ KAYNAK BİLGİSİ - DOĞRU
  const getSourceInfo = (movie) => {
    const source = movie.source;
    const reason = movie.reason || '';
    
    switch(source) {
      case 'python_ml':
        return { text: '🧠 AI Öneri', color: '#ff6b6b' };
      case 'python_ml_genre':
        return { text: '🎭 Genre Tabanlı', color: '#4ecdc4' };
      case 'nodejs':
        return { text: '🟢 Benzer Filmler', color: '#45b7d1' };
      case 'hybrid':
        return { text: '🔄 Hybrid Öneri', color: '#96ceb4' };
      default:
        return { text: '📺 TMDB', color: '#feca57' };
    }
  };

  if (!token || !user) {
    return (
      <div className="recommendations-section">
        <h2>🎯 Personalized Recommendations</h2>
        <div className="login-prompt">
          <p>Please login to get personalized movie recommendations!</p>
          <p>We'll suggest movies based on your taste and liked movies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-section">
      {/* ✅ SECTION NAVIGATION - DOĞRU */}
      <div className="section-navigation">
        <button 
          className={activeSection === 'recommendations' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('recommendations')}
        >
          🎯 AI Önerilerim
        </button>
        <button 
          className={activeSection === 'liked' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveSection('liked')}
        >
          ❤️ Beğendiklerim ({likedMovies.length})
        </button>
        <button 
        className={activeSection === 'watched' ? 'nav-btn active' : 'nav-btn'}
        onClick={() => setActiveSection('watched')}
        >
          ✅ İzlediklerim ({watchedMovies.length})
        </button>
        </div>

      {activeSection === 'watched' ? (
  /* ✅ İZLEDİKLERİM KISMI */
  <>
    <div className="section-header">
      <h2>✅ İzlediklerim ({watchedMovies.length})</h2>
      <button 
        onClick={fetchWatchedMovies}
        className="refresh-btn"
      >
        🔄 Yenile
      </button>
    </div>

    <div className="movies-grid">
      {watchedMovies.map(movie => (
        <div key={movie.movieId} className="movie-card">
          {movie.poster_path ? (
            <img 
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
              alt={movie.title}
              className="movie-poster"
            />
          ) : (
            <div className="movie-poster placeholder">
              🎬
            </div>
          )}
          
          <div className="movie-info">
            <h3 className="movie-title">{movie.title}</h3>
            
            <div className="movie-meta">
              <span className="movie-year">
                {movie.release_date ? movie.release_date.split('-')[0] : 'Tarih Yok'}
              </span>
              <span className="movie-rating">
                ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'Puan Yok'}
              </span>
            </div>

            <div className="movie-genres">
              {movie.genres && movie.genres.length > 0 ? (
                movie.genres.map(genre => (
                  <span key={genre.id} className="genre-tag">
                    {genre.name}
                  </span>
                ))
              ) : (
                <span className="no-genre">Tür bilgisi yok</span>
              )}
            </div>

            <div className="watched-info">
              <small>İzlendi: {new Date(movie.watchedAt).toLocaleDateString('tr-TR')}</small>
              {movie.rating && <small>Verdiğin Puan: {movie.rating}/10</small>}
            </div>

            <button 
              onClick={() => removeFromWatched(movie.movieId)}
              className="remove-btn"
            >
              🗑️ Listeden Kaldır
            </button>
          </div>
        </div>
      ))}
    </div>

    {watchedMovies.length === 0 && (
      <div className="no-movies">
        <p>Henüz hiç film izlemediniz.</p>
        <p>Ana sayfada filmleri keşfedin ve izlediklerinizi işaretleyin!</p>
      </div>
    )}
  </>
   ) : activeSection === 'recommendations' ? (
        /* 🎯 AI ÖNERİLER KISMI */
        <>
          <div className="section-header">
            <h2>🎯 Recommended For You</h2>
            <button 
              onClick={fetchRecommendations}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading">Finding your perfect movies...</div>
          ) : (
            <>
              <div className="movies-grid">
                {recommendations.map(movie => {
                  const sourceInfo = getSourceInfo(movie);
                  return (
                    <div key={movie.id} className="movie-card">
                      {movie.poster_path ? (
                        <img 
                          src={movie.poster_path} 
                          alt={movie.title}
                          className="movie-poster"
                        />
                      ) : (
                        <div className="movie-poster placeholder">
                          No Image
                        </div>
                      )}
                      
                      <div className="movie-info">
                        <h3 className="movie-title">{movie.title}</h3>
                        
                        <div 
                          className="movie-source"
                          style={{ 
                            backgroundColor: `${sourceInfo.color}20`,
                            border: `1px solid ${sourceInfo.color}`,
                            color: sourceInfo.color
                          }}
                        >
                          <small>
                            <strong>{sourceInfo.text}</strong>
                            {movie.reason && ` - ${movie.reason}`}
                          </small>
                        </div>
                        
                        <div className="movie-meta">
                          <span className="movie-year">
                            {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}
                          </span>
                          <span className="movie-rating">
                            ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                        <p className="movie-overview">
                          {movie.overview || 'No description available.'}
                        </p>
                          {/* ✅ YENİ: AKSİYON BUTONLARI - BURAYA EKLE */}
                        <div className="movie-actions">
                          <button 
                            onClick={() => markAsWatched(movie)}
                            className="action-btn watch-btn"
                          >
                            ✅ İzledim
                          </button>
                          
                          {/* ✅ DEĞİŞTİR BUTONU */}
                          <button 
                            onClick={() => replaceMovie(movie)}
                            disabled={replacingMovies.has(movie.id)}
                            className="action-btn replace-btn"
                          >
                            {replacingMovies.has(movie.id) ? '⏳' : '🔄'} Değiştir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {recommendations.length === 0 && (
                <div className="no-recommendations">
                  <p>No recommendations found.</p>
                  <p>Start liking movies to get personalized suggestions!</p>
                  <button 
                    onClick={fetchRecommendations}
                    className="refresh-btn"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* ❤️ BEĞENDİKLERİM KISMI */
        <>
          <div className="section-header">
            <h2>❤️ Beğendiklerim ({likedMovies.length})</h2>
            <button 
              onClick={fetchLikedMovies}
              className="refresh-btn"
            >
              🔄 Yenile
            </button>
          </div>

          <div className="movies-grid">
            {likedMovies.map(movie => (
              <div key={movie.movieId} className="movie-card">
                {movie.poster_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                    alt={movie.title}
                    className="movie-poster"
                  />
                ) : (
                  <div className="movie-poster placeholder">
                    🎬
                  </div>
                )}
                
                <div className="movie-info">
                  <h3 className="movie-title">{movie.title}</h3>
                  
                  <div className="movie-meta">
                    <span className="movie-year">
                      {movie.release_date ? movie.release_date.split('-')[0] : 'Tarih Yok'}
                    </span>
                    <span className="movie-rating">
                      ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'Puan Yok'}
                    </span>
                  </div>

                  <div className="movie-genres">
                    {movie.genres && movie.genres.length > 0 ? (
                      movie.genres.map(genre => (
                        <span key={genre.id} className="genre-tag">
                          {genre.name}
                        </span>
                      ))
                    ) : (
                      <span className="no-genre">Tür bilgisi yok</span>
                    )}
                  </div>

                  <button 
                    onClick={() => removeLikedMovie(movie.movieId)}
                    className="remove-btn"
                  >
                    ❌ Beğeniyi Kaldır
                  </button>
                </div>
              </div>
            ))}
          </div>

          {likedMovies.length === 0 && (
            <div className="no-movies">
              <p>Henüz hiç film beğenmediniz.</p>
              <p>Ana sayfada filmleri keşfedin ve beğenin!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Recommendations;