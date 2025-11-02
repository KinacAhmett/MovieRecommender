# 🎬 Advanced Movie Recommendation System

A full-stack movie recommendation platform featuring hybrid AI-powered recommendations, combining collaborative filtering, content-based algorithms, and advanced ML techniques with TMDB API integration.

## 📊 Project Overview

This is a production-ready movie recommendation system with:
- **Hybrid ML Engine**: Python Flask service with advanced multi-factor analysis
- **Node.js Backend**: RESTful API with user management and content-based filtering
- **React Frontend**: Modern responsive web interface
- **Real-time Data**: TMDB API integration for up-to-date movie information

## 🗂️ Dataset

Using the MovieLens dataset containing:
- **Movies**: Film information with titles and genres
- **Ratings**: User ratings on a scale of 0.5 to 5.0
- **Tags**: User-generated tags for movies
- **Links**: Connections to external movie databases

## 🎯 Key Features

### 🤖 **Advanced ML Recommendation Engine**
- **Multi-factor Analysis**: Genre, director, actor preferences
- **Collaborative Filtering**: User-based similarity matching
- **Content-based Filtering**: TMDB API-powered similarity
- **Hybrid System**: Intelligent combination of multiple algorithms
- **Dynamic Thresholds**: Adaptive similarity scoring (0.08-0.15)

### 🌐 **Full-Stack Architecture**
- **Python ML Service**: Flask-based recommendation engine (Port 5001)
- **Node.js Backend**: Express.js API with MongoDB (Port 5000)
- **React Frontend**: Modern SPA with responsive design
- **Real-time Integration**: TMDB API for live movie data

### 🎬 **Smart Features**
- **Personalized Recommendations**: 30+ films per user
- **Advanced Filtering**: Watched/liked movie exclusion
- **Fallback Systems**: Genre-based backup recommendations
- **Performance Optimized**: 30-second timeout, efficient caching

## 📁 Project Architecture

```
MovieRecommender/
├── 🐍 python-ml-service/     # Python Flask ML Engine
│   ├── app.py                # Main recommendation algorithms
│   ├── requirements.txt      # Python dependencies
│   └── venv/                 # Virtual environment
├── 🌐 Node.js Backend/       # Express.js API Server
│   ├── server.js             # Main server entry
│   ├── routes/               # API endpoints
│   │   └── recommendations.js # Recommendation routes
│   ├── services/             # External services
│   │   ├── mlService.js      # ML service integration
│   │   └── tmdbService.js    # TMDB API client
│   └── models/               # MongoDB schemas
├── ⚛️ react-frontend/        # React SPA
│   ├── src/                  # React components
│   ├── public/               # Static assets
│   └── package.json          # Frontend dependencies
├── 📊 Data & Analysis/       # Data science components
│   ├── dataAnalyze.ipynb     # Data exploration
│   └── data/                 # MovieLens dataset
│       ├── movie.csv         # Movie metadata
│       ├── rating.csv        # User ratings
│       └── movielens20m/     # Full dataset
└── 🔧 Configuration/         # Project setup
    ├── .env                  # Environment variables
    ├── .gitignore           # Git exclusions
    └── README.md            # Documentation
```

## 🚀 Quick Start Guide

### 📋 Prerequisites
- **Python 3.8+** with pip
- **Node.js 14+** with npm
- **MongoDB** (local or cloud)
- **TMDB API Key** (free registration)

### ⚡ Installation & Setup

1. **Clone Repository**
```bash
git clone https://github.com/KinacAhmett/MovieRecommender.git
cd MovieRecommender
```

2. **Environment Configuration**
```bash
# Create .env file with your credentials
PORT=5000
MONGODB_URI=mongodb://localhost:27017/film-oneri
TMDB_API_KEY=your_tmdb_api_key_here
JWT_SECRET=your_secure_jwt_secret
PYTHON_ML_SERVICE=http://localhost:5001
```

3. **Python ML Service Setup**
```bash
cd python-ml-service
python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python app.py  # Starts on port 5001
```

4. **Node.js Backend Setup**
```bash
# New terminal
npm install
npm start  # Starts on port 5000
```

5. **React Frontend Setup**
```bash
# New terminal
cd react-frontend
npm install
npm start  # Starts on port 3000
```

### 🎯 **Access Points**
- **Web App**: http://localhost:3000
- **API**: http://localhost:5000/api
- **ML Service**: http://localhost:5001/health

## 🛠️ Technology Stack

### 🐍 **Backend & ML**
- **Python 3.8+**: ML algorithms & Flask service
- **Flask**: Lightweight web framework for ML API
- **Pandas/NumPy**: Data processing and analysis  
- **Requests**: HTTP client for TMDB API integration
- **Scikit-learn**: Machine learning utilities

### 🌐 **API & Database**
- **Node.js**: Backend server runtime
- **Express.js**: RESTful API framework
- **MongoDB**: NoSQL database for user data
- **Mongoose**: MongoDB object modeling
- **JWT**: Secure authentication tokens
- **Axios**: HTTP client for service communication

### ⚛️ **Frontend**
- **React 18**: Modern component-based UI
- **Create React App**: Development toolchain
- **Responsive Design**: Mobile-first approach

### 🔌 **External APIs**
- **TMDB API**: Real-time movie data & images
- **MovieLens Dataset**: Training data for ML models

## 🎯 **API Endpoints**

### 🔐 **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### 🎬 **Recommendations**
- `GET /api/recommendations/personal` - Get personalized recommendations
- `GET /api/movies/search` - Search movies
- `POST /api/movies/rate` - Rate a movie
- `GET /api/movies/watched` - Get watched movies

### 🤖 **ML Service**
- `GET /health` - ML service health check
- `POST /recommend` - Generate ML recommendations

## 📊 **System Performance**

### ⚡ **Optimization Features**
- **30-second timeout** for ML requests
- **35-film target** from Node.js recommendations  
- **40-film limit** from TMDB API calls
- **0.08 similarity threshold** for inclusive matching
- **Hybrid scoring** (Python ML: 0.9+, Node.js: 0.7)

### 🎯 **Recommendation Quality**
- **Multi-factor Analysis**: Genre + Director + Actor preferences
- **Smart Filtering**: Excludes watched/liked movies automatically
- **Fallback Systems**: Genre-based when detailed analysis fails
- **Duplicate Removal**: Ensures unique recommendations

## 🔧 **Development & Debugging**

### 🐛 **Common Issues**
- **ML Service Timeout**: Increase timeout in `services/mlService.js`
- **TMDB Rate Limits**: Implement caching or reduce API calls
- **MongoDB Connection**: Check connection string in `.env`
- **Port Conflicts**: Ensure ports 3000, 5000, 5001 are available

### 📈 **Performance Monitoring**
- Check ML service health: `GET http://localhost:5001/health`
- Monitor API response times in browser dev tools
- Review console logs for recommendation pipeline details

## 🚀 **Future Enhancements**

### 🎯 **Planned Features**
- [ ] Real-time recommendation updates
- [ ] Social features (friend recommendations)
- [ ] Advanced filtering (year, rating, genre combinations)
- [ ] Recommendation explanations ("Because you liked...")
- [ ] A/B testing framework for algorithm comparison

### 🔬 **Algorithm Improvements**
- [ ] Deep learning models (Neural Collaborative Filtering)
- [ ] Reinforcement learning for dynamic recommendations
- [ ] Multi-armed bandit testing
- [ ] Cold start problem solutions for new users

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 **Author**

**Ahmet Kınac** - *Full Stack Developer & ML Engineer*
- GitHub: [@KinacAhmett](https://github.com/KinacAhmett)

---

⭐ **Star this repository if it helped you!**