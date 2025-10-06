# 🎬 Movie Recommendation System

A comprehensive movie recommendation system built with various machine learning approaches using the MovieLens dataset.

## 📊 Project Overview

This project explores different recommendation techniques to build an effective movie recommendation system. The goal is to experiment with multiple approaches and compare their effectiveness.

## 🗂️ Dataset

Using the MovieLens dataset containing:
- **Movies**: Film information with titles and genres
- **Ratings**: User ratings on a scale of 0.5 to 5.0
- **Tags**: User-generated tags for movies
- **Links**: Connections to external movie databases

## 📈 Current Analysis

### Data Exploration (`dataAnalyze.ipynb`)
- ✅ Data quality assessment
- ✅ Rating distribution analysis
- ✅ Most/least rated movies analysis
- ✅ Data cleaning and validation

### Key Findings
- Dataset contains high-quality rating data (userId, movieId, rating columns are clean)
- Rating distribution shows user preferences
- Significant variation in movie popularity
- Timestamp column has mixed formats (identified for future cleaning)

## 🔮 Planned Recommendation Approaches

1. **Collaborative Filtering**
   - User-based collaborative filtering
   - Item-based collaborative filtering
   - Matrix factorization techniques

2. **Content-Based Filtering**
   - Genre-based recommendations
   - Tag-based similarity

3. **Hybrid Methods**
   - Combining collaborative and content-based approaches
   - Weighted ensemble methods

4. **Advanced Techniques**
   - Deep learning approaches
   - Neural collaborative filtering
   - Autoencoder-based systems

## 📁 Project Structure

```
MovieRecommender/
├── dataAnalyze.ipynb          # Data exploration and analysis
├── data/                      # Dataset files (excluded from git)
│   ├── movie.csv             # Movie information
│   ├── rating.csv            # User ratings
│   ├── tag.csv               # User tags
│   └── ...                   # Other dataset files
├── models/                    # Trained models (to be created)
├── notebooks/                 # Additional analysis notebooks
└── src/                       # Source code (to be created)
```

## 🚀 Getting Started

1. Clone the repository
```bash
git clone <repository-url>
cd MovieRecommender
```

2. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
```

3. Install dependencies
```bash
pip install pandas numpy matplotlib seaborn scikit-learn jupyter
```

4. Download MovieLens dataset and place in `data/` folder

5. Run the analysis notebook
```bash
jupyter notebook dataAnalyze.ipynb
```

## 🛠️ Technologies Used

- **Python**: Core programming language
- **Pandas**: Data manipulation and analysis
- **NumPy**: Numerical computations
- **Matplotlib/Seaborn**: Data visualization
- **Scikit-learn**: Machine learning algorithms
- **Jupyter Notebook**: Interactive analysis

## 📋 TODO

- [ ] Implement collaborative filtering algorithms
- [ ] Build content-based filtering system
- [ ] Create evaluation metrics and testing framework
- [ ] Develop web interface for recommendations
- [ ] Compare different algorithm performances
- [ ] Deploy the final system

## 📊 Current Status

🔄 **In Progress**: Data exploration and analysis phase completed. Ready to begin implementing recommendation algorithms.

## 🤝 Contributing

This is a personal learning project, but suggestions and improvements are welcome!

## 📄 License

This project is for educational purposes.