// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware'ler
app.use(cors());
app.use(express.json());

// Debug middleware (isteğe bağlı)
app.use((req, res, next) => {
    console.log(`📍 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 🎯 ROUTE'LARI YÜKLE
try {
    const movieRoutes = require('./routes/movies');
    const authRoutes = require('./routes/auth');
    const userMoviesRoutes = require('./routes/userMovies');
    const recommendationRoutes = require('./routes/recommendations');
    
    app.use('/api/movies', movieRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/user/movies', userMoviesRoutes);
    app.use('/api/recommendations', recommendationRoutes);
    
    console.log('✅ Tüm route\'lar başarıyla yüklendi');
} catch (error) {
    console.error('❌ Route yükleme hatası:', error.message);
}

// Test route'ları
app.get('/', (req, res) => {
    res.json({ 
        message: '🎬 Film Öneri Sistemi Backend Çalışıyor!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            popular: '/api/movies/popular',
            search: '/api/movies/search?q=film-adi',
            details: '/api/movies/550',
            similar: '/api/movies/550/similar'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Node.js Backend',
        tmdb: process.env.TMDB_API_KEY ? 'Configured' : 'Missing API Key'
    });
});

// MongoDB bağlantısı
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/film-oneri');
        console.log('✅ MongoDB bağlantısı başarılı');
    } catch (error) {
        console.error('❌ MongoDB bağlantı hatası:', error);
        console.log('⚠️  MongoDB bağlantısı yok, bazı özellikler çalışmayabilir');
    }
};

// Server başlatma
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Node.js Backend http://localhost:${PORT} adresinde çalışıyor`);
        console.log(`🎬 Film API: http://localhost:${PORT}/api/movies/popular`);
        console.log(`🔍 Arama API: http://localhost:${PORT}/api/movies/search?q=batman`);
        console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    });
};

startServer();