import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Recommendations from './components/Recommendations';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import MovieDetail from './components/MovieDetail';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const navigate = useNavigate();

  // Get popular movies
  const fetchPopularMovies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/movies/popular`);
      setMovies(response.data.data);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
      alert('Failed to load movies');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search movies
  const searchMovies = useCallback(async (query) => {
    if (!query.trim()) {
      fetchPopularMovies();
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}`);
      setMovies(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  }, [fetchPopularMovies]);

  // User login
  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: formData.get('email'),
        password: formData.get('password')
      });
      
      setUser(response.data.data.user);
      setToken(response.data.data.token);
      localStorage.setItem('token', response.data.data.token);
      document.getElementById('login_modal').close();
      e.target.reset();
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed! Please check your credentials.');
    }
  };

  // User registration
  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
      });
      
      setUser(response.data.data.user);
      setToken(response.data.data.token);
      localStorage.setItem('token', response.data.data.token);
      document.getElementById('register_modal').close();
      e.target.reset();
      alert('Registration successful!');
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed! User might already exist.');
    }
  };

  // Like a movie
  const likeMovie = async (movieId, title) => {
    if (!user) {
      alert('Please login to like movies');
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/user/movies/like`, 
        { movieId, title, rating: 5 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Liked "${title}"!`);
    } catch (error) {
      console.error('Like error:', error);
      alert('Failed to like movie');
    }
  };

  // Add to watchlist
  const addToWatchlist = async (movieId, title) => {
    if (!user) {
      alert('Please login to add to watchlist');
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/user/movies/watchlist`, 
        { movieId, title },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Added "${title}" to watchlist!`);
    } catch (error) {
      console.error('Watchlist error:', error);
      alert('Failed to add to watchlist');
    }
  };

  // ✅ Mark as watched function
  const markAsWatched = async (movie) => {
    if (!user) {
      alert('Please login to mark as watched');
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/user/movies/watched`, 
        { movieId: movie.id, title: movie.title },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Marked "${movie.title}" as watched!`);
    } catch (error) {
      console.error('Watch error:', error);
      alert('Failed to mark as watched');
    }
  };

  // Check for existing token on app start
  useEffect(() => {
    fetchPopularMovies();
    
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, [fetchPopularMovies]);

  return (
    <div className="App">
      {/* HEADER */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1 className="logo">🎬 MovieRecommender</h1>
            
            {/* Search Bar */}
            <div className="search-container">
              <input
                type="text"
                placeholder="Search for movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchMovies(searchQuery)}
                className="search-input"
              />
              <button 
                onClick={() => searchMovies(searchQuery)}
                className="search-button"
              >
                🔍
              </button>
            </div>

            {/* User Actions */}
            {!user ? (
              <div className="auth-buttons">
                <button 
                  onClick={() => document.getElementById('login_modal').showModal()}
                  className="login-btn"
                >
                  Login
                </button>
                <button 
                  onClick={() => document.getElementById('register_modal').showModal()}
                  className="register-btn"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="user-menu">
                <span>Welcome, {user.username}!</span>
                <button 
                  onClick={() => {
                    setUser(null);
                    setToken('');
                    localStorage.removeItem('token');
                  }}
                  className="logout-btn"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* ✅ YENİ: Navigation Tabs */}
          {user && (
            <nav className="main-nav">
              <button 
                className={activeTab === 'browse' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('browse')}
              >
                🎬 Browse Movies
              </button>
              <button 
                className={activeTab === 'recommendations' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => setActiveTab('recommendations')}
              >
                🎯 My Recommendations
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* ✅ GÜNCELLENMİŞ: MAIN CONTENT with Tabs */}
      <main className="main-content">
        <div className="container">
          {activeTab === 'browse' ? (
            /* Browse Movies Tab */
            <>
              <h2 className="section-title">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Popular Movies'}
              </h2>
              
              {loading ? (
                <div className="loading">Loading movies...</div>
              ) : (
                <div className="movies-grid">
                  {movies.map(movie => (
                    <div key={movie.id} className="movie-card">
                      {/* ✅ TIKLANABİLİR KISIM */}
                      <div 
                        onClick={() => {
                          console.log('🎬 TIKLANAN FİLM:', movie); // Film objesini görelim
                          console.log('🎬 FİLM ID:', movie.id); // ID'yi görelim
                          if (movie.id) {
                            navigate(`/movie/${movie.id}`);
                          } else {
                            alert('Film ID bulunamadı!');
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
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
                        </div>
                      </div>
                      
                      {user && (
                        <div className="movie-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => likeMovie(movie.id, movie.title)}
                            className="like-btn"
                          >
                            ❤️ Like
                          </button>

                          <button 
                            onClick={() => markAsWatched(movie)}
                            className="watch-btn"
                          >
                            👁️ İzledim
                          </button>
                          
                          <button 
                            onClick={() => addToWatchlist(movie.id, movie.title)}
                            className="watchlist-btn"
                          >
                            📺 Watchlist
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loading && movies.length === 0 && (
                <div className="no-results">
                  <p>No movies found.</p>
                  <button 
                    onClick={fetchPopularMovies}
                    className="back-button"
                  >
                    Back to Popular Movies
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ✅ Recommendations Tab */
            <Recommendations token={token} user={user} />
          )}
        </div>
      </main>

      {/* LOGIN MODAL */}
      <dialog id="login_modal" className="modal">
        <div className="modal-content">
          <h3>Login to Your Account</h3>
          <form onSubmit={handleLogin} className="auth-form">
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              className="form-input"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="form-input"
            />
            <div className="form-actions">
              <button 
                type="button"
                onClick={() => document.getElementById('login_modal').close()}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button type="submit" className="submit-btn">
                Login
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* REGISTER MODAL */}
      <dialog id="register_modal" className="modal">
        <div className="modal-content">
          <h3>Create New Account</h3>
          <form onSubmit={handleRegister} className="auth-form">
            <input
              type="text"
              name="username"
              placeholder="Username"
              required
              className="form-input"
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              className="form-input"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              minLength="6"
              className="form-input"
            />
            <div className="form-actions">
              <button 
                type="button"
                onClick={() => document.getElementById('register_modal').close()}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button type="submit" className="submit-btn">
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}

export default App;