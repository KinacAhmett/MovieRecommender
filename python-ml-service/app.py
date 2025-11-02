from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
import requests
import joblib
import os
import random
from datetime import datetime
from dotenv import load_dotenv


load_dotenv()

TMDB_API_KEY = os.getenv('TMDB_API_KEY', 'your_tmdb_api_key_here')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'

def get_tmdb_movies_by_genres(genre_ids, page=1, limit=20):
    """TMDB'den genre ID'lerine göre film getir"""
    try:
        if not genre_ids:
            return []
            
        genre_str = ','.join(map(str, genre_ids))
        url = f"{TMDB_BASE_URL}/discover/movie"
        params = {
            'api_key': TMDB_API_KEY,
            'with_genres': genre_str,
            'page': page,
            'sort_by': 'popularity.desc',
            'language': 'en-US',
            'vote_count.gte': 100,  # Daha kaliteli filmler
            'vote_average.gte': 6.0,  # En az 6.0 puan
            'primary_release_date.lte': '2024-12-31',  # 2024'e kadar
            'with_original_language': 'en'  # Sadece İngilizce
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            movies = response.json().get('results', [])
            print(f"✅ TMDB: {len(movies)} film alındı")
            return movies[:limit]
        else:
            print(f"❌ TMDB API error: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ TMDB request error: {e}")
        return []
    
def get_tmdb_movie_details(movie_id):
    """TMDB'den film detaylarını al"""
    try:
        url = f"{TMDB_BASE_URL}/movie/{movie_id}"
        params = {
            'api_key': TMDB_API_KEY,
            'append_to_response': 'credits,keywords'
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ TMDB details error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ TMDB details error: {e}")
        return None
    

# Genre ilişkileri haritası - TMDB genre ID'lerine göre
GENRE_RELATIONSHIPS = {
    # Action ile ilişkili türler
    28: {"name": "Action", "related": [12, 878, 53, 10752], "weight": 1.0},  # Adventure, Sci-Fi, Thriller, War
    
    # Adventure ile ilişkili türler  
    12: {"name": "Adventure", "related": [28, 14, 10751], "weight": 0.9},  # Action, Fantasy, Family
    
    # Sci-Fi ile ilişkili türler
    878: {"name": "Science Fiction", "related": [28, 12, 9648], "weight": 0.8},  # Action, Adventure, Mystery
    
    # Drama ile ilişkili türler
    18: {"name": "Drama", "related": [10749, 10402, 36], "weight": 0.7},  # Romance, Music, History
    
    # Comedy ile ilişkili türler
    35: {"name": "Comedy", "related": [10749, 10751, 10402], "weight": 0.8},  # Romance, Family, Music
    
    # Romance ile ilişkili türler
    10749: {"name": "Romance", "related": [35, 18, 10751], "weight": 0.7},  # Comedy, Drama, Family
    
    # Thriller ile ilişkili türler
    53: {"name": "Thriller", "related": [28, 80, 9648], "weight": 0.8},  # Action, Crime, Mystery
    
    # Fantasy ile ilişkili türler
    14: {"name": "Fantasy", "related": [12, 10751, 878], "weight": 0.7},  # Adventure, Family, Sci-Fi
    
    # Horror ile ilişkili türler
    27: {"name": "Horror", "related": [53, 9648, 14], "weight": 0.6},  # Thriller, Mystery, Fantasy
}


app = Flask(__name__)

print("🚀 Python ML Recommendation Service starting...")

def generate_tmdb_based_recommendations_v2(movie_genre_ids, original_title, detailed_analysis, original_movie_data=None):
    """Gelişmiş TMDB önerileri - yönetmen & oyuncu destekli (V2)"""
    
    recommendations = []
    
    # TMDB'den DETAYLI filmleri al
    tmdb_movies = get_tmdb_movies_by_genres_with_details(movie_genre_ids, limit=15)
    
    print(f"🔍 {len(tmdb_movies)} detaylı TMDB filmi analiz ediliyor...")
    
    # Orijinal filmin yönetmen ve oyuncu ID'lerini al
    original_director_ids = [director['id'] for director in original_movie_data.get('directors', [])] if original_movie_data else []
    original_actor_ids = [actor['id'] for actor in original_movie_data.get('cast', [])] if original_movie_data else []
    
    for i, movie in enumerate(tmdb_movies):
        # Genre ID'leri al
        tmdb_genre_ids = movie.get('genre_ids', [])
        if not tmdb_genre_ids and movie.get('genres'):
            tmdb_genre_ids = [genre['id'] for genre in movie['genres']]
        
        # Film yönetmen ID'lerini al
        movie_director_ids = [director['id'] for director in movie.get('directors', [])]
        
        # Film oyuncu ID'lerini al (ilk 5)
        movie_actor_ids = [actor['id'] for actor in movie.get('cast', [])[:5]]
        
        print(f"   🎬 {i+1}. {movie['title']}")
        print(f"      🎭 Genre ID'ler: {tmdb_genre_ids}")
        print(f"      👨‍💼 Yönetmenler: {[d['name'] for d in movie.get('directors', [])]}")
        print(f"      👨‍🎤 Oyuncular: {[a['name'] for a in movie.get('cast', [])[:2]]}")
        
        # GELİŞMİŞ benzerlik skoru hesapla
        similarity_score = calculate_detailed_similarity_score(
            movie_genre_ids, original_director_ids, original_actor_ids,
            tmdb_genre_ids, movie_director_ids, movie_actor_ids,
            detailed_analysis
        )
        
        if similarity_score > 0.15:  # Eşik
            reason = generate_detailed_reason_v2(
                movie_genre_ids, original_director_ids, original_actor_ids,
                tmdb_genre_ids, movie_director_ids, movie_actor_ids,
                original_title, original_movie_data, movie
            )
            
            recommendations.append({
                "movie_id": movie["id"],
                "title": movie["title"],
                "score": similarity_score,
                "source": "python_ml_enhanced",
                "reason": reason,
                "poster_path": movie.get("poster_path"),
                "vote_average": movie.get("vote_average"),
                "release_date": movie.get("release_date"),
                "overview": movie.get("overview"),
                "genre_ids": tmdb_genre_ids,
                "directors": [director['name'] for director in movie.get('directors', [])],
                "actors": [actor['name'] for actor in movie.get('cast', [])[:3]]
            })
            print(f"      ✅ DETAYLI ÖNERİYE EKLENDİ!")
        else:
            print(f"      ❌ SKOR DÜŞÜK, ATLANDI!")
    
    print(f"🎯 {len(recommendations)} gelişmiş öneri oluşturuldu")
    return recommendations

def calculate_detailed_similarity_score(user_genres, user_directors, user_actors, 
                                     movie_genres, movie_directors, movie_actors, 
                                     detailed_analysis):
    """Genre + yönetmen + oyuncu benzerliği hesapla"""
    
    if not user_genres or not movie_genres:
        return 0.0
    
    total_score = 0.0
    feature_weights = {
        'genre': 0.5,      # En önemli
        'director': 0.3,   # Orta önem
        'actor': 0.2       # Daha az önemli
    }
    
    # 1. GENRE BENZERLİĞİ
    genre_score = calculate_genre_similarity_score(user_genres, movie_genres, detailed_analysis)
    total_score += genre_score * feature_weights['genre']
    print(f"      📊 Genre skoru: {genre_score:.2f}")
    
    # 2. YÖNETMEN BENZERLİĞİ
    director_score = calculate_person_similarity(user_directors, movie_directors, detailed_analysis["director_affinity"])
    total_score += director_score * feature_weights['director']
    print(f"      👨‍💼 Yönetmen skoru: {director_score:.2f}")
    
    # 3. OYUNCU BENZERLİĞİ  
    actor_score = calculate_person_similarity(user_actors, movie_actors, detailed_analysis["actor_affinity"])
    total_score += actor_score * feature_weights['actor']
    print(f"      👨‍🎤 Oyuncu skoru: {actor_score:.2f}")
    
    final_score = min(1.0, total_score)
    print(f"      🎯 Toplam skor: {final_score:.2f}")
    
    return final_score

def get_person_name(person_id, people_list):
    """People listesinden ID'ye göre isim bul"""
    for person in people_list:
        if person.get('id') == person_id:
            return person.get('name', 'Unknown')
    return 'Unknown'

def calculate_person_similarity(user_people, movie_people, affinity_scores):
    """Yönetmen/oyuncu benzerliği hesapla"""
    
    if not user_people or not movie_people:
        return 0.0
    
    score = 0.0
    matches = 0
    
    # user_people ve movie_people artık ID listesi
    for user_person_id in user_people:
        user_affinity = affinity_scores.get(user_person_id, {}).get("score", 0.3)
        
        for movie_person_id in movie_people:
            if user_person_id == movie_person_id:  # Aynı kişi
                score += 1.0 * user_affinity
                matches += 1
                print(f"         ✅ Ortak kişi bulundu! Skor: {1.0 * user_affinity:.2f}")
                break  # Aynı kişiyi tekrar sayma
    
    if matches == 0:
        return 0.0
    
    # Ortalama skor
    return min(1.0, score / len(user_people))

def extract_directors_from_credits(credits_data):
    """Credits data'dan yönetmenleri çıkar"""
    directors = []
    
    if not credits_data:
        return directors
    
    crew = credits_data.get('crew', [])
    print(f"   🔍 Crew içinde yönetmen aranıyor ({len(crew)} kişi)...")
    
    for person in crew:
        # Yönetmeni bul
        if person.get('job') == 'Director':
            director_info = {
                'id': person.get('id'),
                'name': person.get('name'),
                'job': person.get('job')
            }
            directors.append(director_info)
            print(f"      ✅ Yönetmen bulundu: {person.get('name')}")
    
    print(f"   🎬 Toplam {len(directors)} yönetmen bulundu")
    return directors

def extract_actors_from_credits(credits_data, max_actors=5):
    """Credits data'dan oyuncuları çıkar (ilk max_actors kadar)"""
    actors = []
    
    if not credits_data:
        return actors
    
    cast = credits_data.get('cast', [])
    print(f"   🔍 Oyuncular alınıyor ({len(cast)} kişi, ilk {max_actors})...")
    
    for person in cast[:max_actors]:
        actor_info = {
            'id': person.get('id'),
            'name': person.get('name'),
            'character': person.get('character'),
            'order': person.get('order')
        }
        actors.append(actor_info)
        print(f"      👨‍🎤 Oyuncu: {person.get('name')}")
    
    return actors

def get_tmdb_movies_by_genres_with_details(genre_ids, page=1, limit=20):
    """TMDB'den filmleri + DETAYLI bilgilerle getir"""
    try:
        # Önce temel filmleri al
        movies = get_tmdb_movies_by_genres(genre_ids, page, limit)
        
        # Her film için detaylı bilgi al
        detailed_movies = []
        for movie in movies:
            print(f"🔍 Detaylı bilgi alınıyor: {movie['title']}")
            details = get_tmdb_movie_details(movie['id'])
            
            if details:
                # Yönetmen ve oyuncuları çıkar
                credits = details.get('credits', {})
                directors = extract_directors_from_credits(credits)
                actors = extract_actors_from_credits(credits)
                
                # Temel bilgileri koru, detayları ekle
                movie.update({
                    'credits': credits,
                    'directors': directors,
                    'cast': actors,
                    'keywords': details.get('keywords', {}),
                    'runtime': details.get('runtime', 0)
                })
                print(f"✅ {movie['title']} - {len(directors)} yönetmen, {len(actors)} oyuncu")
            else:
                # Detay alınamazsa boş ekle
                movie.update({
                    'directors': [],
                    'cast': [],
                    'keywords': {}
                })
                print(f"⚠️ {movie['title']} - detay alınamadı")
            
            detailed_movies.append(movie)
        
        return detailed_movies
    except Exception as e:
        print(f"❌ TMDB details error: {e}")
        return movies  # Detaylar olmasa da temel filmleri döndür

def generate_detailed_reason_v2(user_genres, user_director_ids, user_actor_ids,
                           movie_genres, movie_director_ids, movie_actor_ids, 
                           original_title, original_movie_data, movie_data):
    """Gelişmiş öneri nedeni metni (V2)"""
    
    # İsimleri al
    user_director_names = [get_person_name(pid, original_movie_data.get('directors', [])) for pid in user_director_ids]
    movie_director_names = [get_person_name(pid, movie_data.get('directors', [])) for pid in movie_director_ids]
    user_actor_names = [get_person_name(pid, original_movie_data.get('cast', [])) for pid in user_actor_ids[:3]]
    movie_actor_names = [get_person_name(pid, movie_data.get('cast', [])) for pid in movie_actor_ids[:3]]
    
    common_directors = set(user_director_names) & set(movie_director_names)
    common_actors = set(user_actor_names) & set(movie_actor_names)
    
    reasons = []
    
    # 1. ORTAK YÖNETMEN
    if common_directors:
        director_list = ", ".join(list(common_directors)[:2])
        reasons.append(f"Same director: {director_list}")
    
    # 2. ORTAK OYUNCULAR
    if common_actors:
        actor_list = ", ".join(list(common_actors)[:2])
        reasons.append(f"Same actors: {actor_list}")
    
    # 3. GENRE (fallback)
    if not reasons:
        user_genre_names = [get_genre_name_by_id(gid) for gid in user_genres]
        movie_genre_names = [get_genre_name_by_id(gid) for gid in movie_genres]
        common_genres = set(user_genre_names) & set(movie_genre_names)
        
        if common_genres:
            genre_list = ", ".join(list(common_genres)[:2])
            reasons.append(f"Shared genres: {genre_list}")
    
    # 4. FALLBACK
    if not reasons:
        return f"Similar style to {original_title}"
    
    return " | ".join(reasons[:2])

def analyze_user_detailed_preferences(liked_movies):
    """Kullanıcının genre + yönetmen + oyuncu tercihlerini analiz et"""
    
    analysis = {
        "primary_genres": {},
        "secondary_genres": {}, 
        "genre_affinity": {},
        "directors": {},
        "actors": {},
        "total_movies": len(liked_movies)
    }
    
    for movie in liked_movies:
        # Genre analizi
        movie_genres = movie.get('genres', [])
        for genre in movie_genres:
            if isinstance(genre, dict):
                genre_id = genre.get('id')
                genre_name = genre.get('name')
            else:
                genre_name = str(genre)
                genre_id = get_genre_id_by_name(genre_name)
            
            if genre_id:
                analysis["primary_genres"][genre_id] = {
                    "name": genre_name,
                    "count": analysis["primary_genres"].get(genre_id, {"count": 0})["count"] + 1
                }
        
        # ✅ Yönetmen analizi
        directors = movie.get('directors', [])
        for director in directors[:2]:  # İlk 2 yönetmen
            if isinstance(director, dict):
                director_id = director.get('id')
                director_name = director.get('name')
            else:
                director_name = str(director)
                director_id = hash(director_name)  # Geçici ID
            
            if director_name:
                analysis["directors"][director_id] = {
                    "name": director_name,
                    "count": analysis["directors"].get(director_id, {"count": 0})["count"] + 1
                }
        
        # ✅ Oyuncu analizi  
        actors = movie.get('cast', [])
        for actor in actors[:5]:  # İlk 5 oyuncu
            if isinstance(actor, dict):
                actor_id = actor.get('id') 
                actor_name = actor.get('name')
            else:
                actor_name = str(actor)
                actor_id = hash(actor_name)  # Geçici ID
            
            if actor_name:
                analysis["actors"][actor_id] = {
                    "name": actor_name,
                    "count": analysis["actors"].get(actor_id, {"count": 0})["count"] + 1
                }
    
    # Affinity skorlarını hesapla
    analysis["genre_affinity"] = calculate_genre_affinity(analysis)
    analysis["director_affinity"] = calculate_person_affinity(analysis["directors"], analysis["total_movies"])
    analysis["actor_affinity"] = calculate_person_affinity(analysis["actors"], analysis["total_movies"])
    
    print(f"🎭 Detaylı Analiz: {len(analysis['primary_genres'])} tür, "
          f"{len(analysis['directors'])} yönetmen, {len(analysis['actors'])} oyuncu")
    
    return analysis

def calculate_person_affinity(people_dict, total_movies):
    """Yönetmen/oyuncu affinity skorlarını hesapla"""
    affinity = {}
    
    for person_id, data in people_dict.items():
        base_score = data["count"] / total_movies
        # Sıklığa göre ağırlık - çok görülen daha önemli
        frequency_weight = min(1.0, data["count"] / 3)  # En fazla 1.0
        affinity[person_id] = {
            "name": data["name"],
            "score": base_score * frequency_weight,
            "count": data["count"]
        }
    
    return affinity

def analyze_user_genre_preferences(liked_movies):
    """Kullanıcının genre tercihlerini detaylı analiz et"""
    
    genre_analysis = {
        "primary_genres": {},      # Direkt beğenilen türler
        "secondary_genres": {},    # İlişkili türler
        "genre_affinity": {},      # Tür eğilim skorları
        "total_movies": len(liked_movies)
    }
    
    for movie in liked_movies:
        movie_genres = movie.get('genres', [])
        
        for genre in movie_genres:
            if isinstance(genre, dict):
                genre_id = genre.get('id')
                genre_name = genre.get('name')
            else:
                # Eğer genre string ise
                genre_name = str(genre)
                genre_id = get_genre_id_by_name(genre_name)
            
            if genre_id:
                # Primer genre'leri say
                genre_analysis["primary_genres"][genre_id] = {
                    "name": genre_name,
                    "count": genre_analysis["primary_genres"].get(genre_id, {"count": 0})["count"] + 1
                }
                
                # İkincil (ilişkili) genre'leri bul
                related_genres = GENRE_RELATIONSHIPS.get(genre_id, {}).get("related", [])
                for related_id in related_genres:
                    related_name = get_genre_name_by_id(related_id)
                    if related_name:
                        key = f"{related_id}"
                        if key not in genre_analysis["secondary_genres"]:
                            genre_analysis["secondary_genres"][key] = {
                                "name": related_name,
                                "count": 0,
                                "connected_to": []
                            }
                        genre_analysis["secondary_genres"][key]["count"] += 1
                        genre_analysis["secondary_genres"][key]["connected_to"].append(genre_name)
    
    # Genre affinity skorlarını hesapla
    genre_analysis["genre_affinity"] = calculate_genre_affinity(genre_analysis)
    
    print(f"🎭 Genre Analizi: {len(genre_analysis['primary_genres'])} primer, {len(genre_analysis['secondary_genres'])} seconder tür")
    return genre_analysis

def calculate_genre_affinity(genre_analysis):
    """Genre eğilim skorlarını hesapla"""
    affinity = {}
    total_movies = genre_analysis["total_movies"]
    
    # Primer genre'ler için skor
    for genre_id, data in genre_analysis["primary_genres"].items():
        base_score = data["count"] / total_movies
        # Genre önem ağırlığı ile çarp
        genre_weight = GENRE_RELATIONSHIPS.get(genre_id, {}).get("weight", 0.5)
        affinity[genre_id] = {
            "name": data["name"],
            "score": base_score * genre_weight,
            "type": "primary",
            "count": data["count"]
        }
    
    # Seconder genre'ler için skor
    for genre_key, data in genre_analysis["secondary_genres"].items():
        genre_id = int(genre_key)
        base_score = data["count"] / (total_movies * 2)  # Seconder daha az önemli
        affinity[genre_id] = {
            "name": data["name"], 
            "score": base_score,
            "type": "secondary",
            "count": data["count"],
            "connected_to": data["connected_to"]
        }
    
    return affinity

def get_genre_id_by_name(genre_name):
    """Genre isminden ID bul"""
    genre_map = {
        "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
        "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
        "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
        "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
        "TV Movie": 10770, "Thriller": 53, "War": 10752, "Western": 37
    }
    return genre_map.get(genre_name)

def get_genre_name_by_id(genre_id):
    """Genre ID'den isim bul"""
    genre_map = {
        28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
        80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 
        14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
        9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
        10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
    }
    return genre_map.get(genre_id)

def generate_tmdb_based_recommendations(movie_genre_ids, original_title, genre_analysis):
    """TMDB'den gerçek filmlerle öneri oluştur - DÜZELTİLMİŞ"""
    
    recommendations = []
    
    # TMDB'den filmleri al
    tmdb_movies = get_tmdb_movies_by_genres(movie_genre_ids, limit=15)
    
    
    print(f"🔍 {len(tmdb_movies)} TMDB filmi analiz ediliyor...")
    
    for i, movie in enumerate(tmdb_movies):
        # ✅ YENİ: Genre bilgisini GARANTİYE AL
        tmdb_genre_ids = []
        
        # 1. Önce genre_ids'den dene
        if movie.get('genre_ids'):
            tmdb_genre_ids = movie['genre_ids']
            print(f"   🎬 {i+1}. {movie['title']} - Genre IDs: {tmdb_genre_ids}")
        
        # 2. genre_ids yoksa, genres objesinden çıkar
        elif movie.get('genres'):
            tmdb_genre_ids = [genre['id'] for genre in movie['genres']]
            print(f"   🎬 {i+1}. {movie['title']} - Genres: {tmdb_genre_ids}")
        
        # 3. Hiçbiri yoksa, ORJİNAL genre'leri kullan
        else:
            tmdb_genre_ids = movie_genre_ids  # Aynı genre'leri ver
            print(f"   🎬 {i+1}. {movie['title']} - NO GENRE, using original: {tmdb_genre_ids}")
        
        # Genre benzerlik skoru hesapla
        similarity_score = calculate_genre_similarity_score(movie_genre_ids, tmdb_genre_ids, genre_analysis)
        
        print(f"      📊 Benzerlik Skoru: {similarity_score:.2f}")
        
        # ✅ BENZERLİK EŞİĞİNİ DÜŞÜR
        if similarity_score > 0.05:  # Çok düşük eşik
            reason = generate_genre_reason(movie_genre_ids, tmdb_genre_ids, original_title)
            
            recommendations.append({
                "movie_id": movie["id"],
                "title": movie["title"],
                "score": similarity_score,
                "source": "python_ml",
                "reason": reason,
                "poster_path": movie.get("poster_path"),
                "vote_average": movie.get("vote_average"),
                "release_date": movie.get("release_date"),
                "overview": movie.get("overview"),
                "genre_ids": tmdb_genre_ids
            })
            print(f"      ✅ ÖNERİYE EKLENDİ!")
        else:
            print(f"      ❌ SKOR DÜŞÜK, ATLANDI!")
    
    print(f"🎯 TMDB tabanlı {len(recommendations)} öneri oluşturuldu")
    return recommendations



def generate_genre_similar_recommendations(movie_genre_ids, original_title, genre_analysis, user_profile):
    """TMDB'den gerçek filmlerle genre-benzeri öneriler"""
    
    print(f"🎯 TMDB'den gerçek filmler aranıyor: {movie_genre_ids}")
    
    # Önce TMDB'den gerçek filmleri al
    tmdb_recommendations = generate_tmdb_based_recommendations(movie_genre_ids, original_title, genre_analysis)
    
    if tmdb_recommendations:
        return tmdb_recommendations
    else:
        # ✅ Fallback: basit öneriler
        print("⚠️ TMDB'den film alınamadı, fallback aktif")
        return [{
            "movie_id": 550,
            "title": "Fight Club",
            "score": 0.7,
            "source": "python_ml_fallback",
            "reason": f"Recommended based on {original_title}",
            "poster_path": None,
            "vote_average": 8.8,
            "release_date": "1999-10-15"
        }]
    

def calculate_genre_similarity_score(user_genres, movie_genres, genre_analysis):
    """İki genre seti arasında benzerlik skoru hesapla - İYİLEŞTİRİLMİŞ"""
    
    if not user_genres or not movie_genres:
        return 0.0
    
    total_score = 0.0
    matches = 0
    
    # ✅ YENİ: Genre affinity'yi daha güçlü kullan
    for user_genre in user_genres:
        user_affinity = genre_analysis["genre_affinity"].get(user_genre, {}).get("score", 0.5)
        
        for movie_genre in movie_genres:
            # Direkt eşleşme - YÜKSEK SKOR
            if user_genre == movie_genre:
                score_to_add = 1.0 * user_affinity
                total_score += score_to_add
                matches += 1
            
            # İlişkili genre eşleşmesi - ORTA SKOR
            elif movie_genre in GENRE_RELATIONSHIPS.get(user_genre, {}).get("related", []):
                score_to_add = 0.6 * user_affinity
                total_score += score_to_add
                matches += 1
    
    if matches == 0:
        return 0.0
    
    # ✅ YENİ: Daha agresif skorlama
    final_score = min(1.0, total_score / max(1, len(user_genres)))
    return final_score

def generate_genre_reason(user_genres, movie_genres, original_title, genre_analysis=None):
    """Öneri nedeni metni oluştur - GELİŞMİŞ VERSİYON"""
    
    user_genre_names = [get_genre_name_by_id(gid) for gid in user_genres if get_genre_name_by_id(gid)]
    movie_genre_names = [get_genre_name_by_id(gid) for gid in movie_genres if get_genre_name_by_id(gid)]
    
    common_genres = set(user_genre_names) & set(movie_genre_names)
    
    # ✅ DAHA AKILLI NEDEN SEÇİMİ
    
    # 1. ORTAK TÜRLER VARSA
    if common_genres:
        genre_list = ", ".join(list(common_genres))
        
        reason_templates = [
            f"Shared genres with {original_title}: {genre_list}",
            f"You like {genre_list} in {original_title}",
            f"Common genres: {genre_list}",
            f"Matches your {genre_list} preference from {original_title}",
            f"Both feature {genre_list}"
        ]
        return random.choice(reason_templates)
    
    # 2. İLİŞKİLİ TÜRLER VARSA
    related_genres = []
    for user_genre in user_genres:
        related = GENRE_RELATIONSHIPS.get(user_genre, {}).get("related", [])
        related_names = [get_genre_name_by_id(rid) for rid in related if get_genre_name_by_id(rid) and get_genre_name_by_id(rid) in movie_genre_names]
        related_genres.extend(related_names)
    
    if related_genres:
        related_list = ", ".join(list(set(related_genres)))
        
        reason_templates = [
            f"Related to {original_title}'s genres: {related_list}",
            f"Genres that complement {original_title}: {related_list}",
            f"If you like {original_title}, try these related genres: {related_list}",
            f"Expanding from {original_title} to {related_list}"
        ]
        return random.choice(reason_templates)
    
    # 3. FALLBACK - DAHA ÇEŞİTLİ
    fallback_reasons = [
        f"Similar style to {original_title}",
        f"Recommended because you liked {original_title}",
        f"Based on your interest in {original_title}",
        f"Films like {original_title}",
        f"Inspired by your taste for {original_title}",
        f"Curated based on {original_title}",
        f"AI recommendation from {original_title}",
        f"Content similar to {original_title}"
    ]
    return random.choice(fallback_reasons)

def get_genre_based_recommendations(user_profile, liked_movies, top_n=30):
    """Genre analizine dayalı akıllı öneriler - DÜZELTİLMİŞ"""
    
    genre_analysis = analyze_user_genre_preferences(liked_movies)
    recommendations = []
    
    print("🎯 Genre-tabanlı öneriler hesaplanıyor...")
    
    # ✅ DÜZELTİLDİ: TÜM beğenilen filmleri kullan
    for liked_movie in liked_movies:
        movie_id = liked_movie.get('movieId')
        title = liked_movie.get('title', 'Unknown')
        
        # Genre'leri doğru şekilde al
        movie_genres = liked_movie.get('genres', [])
        movie_genre_ids = []
        
        print(f"🔍 Film analizi: {title}, genres: {movie_genres}")
        
        for genre in movie_genres:
            if isinstance(genre, dict):
                genre_id = genre.get('id')
                if genre_id:
                    movie_genre_ids.append(genre_id)
            else:
                genre_id = get_genre_id_by_name(str(genre))
                if genre_id:
                    movie_genre_ids.append(genre_id)
        
        if not movie_genre_ids:
            print(f"   ⚠️ {title} için genre bulunamadı, atlanıyor")
            continue  # ❌ Genre'siz filmleri atla
        
        # Genre-benzeri öneriler oluştur
        genre_recommendations = generate_genre_similar_recommendations(
            movie_genre_ids, title, genre_analysis, user_profile
        )
        recommendations.extend(genre_recommendations)
    
    # Tekrar edenleri kaldır ve sırala
    unique_recommendations = remove_duplicate_recommendations(recommendations)
    
    # ✅ DÜZELTİLDİ: Direkt score'a göre sırala
    final_recommendations = sorted(unique_recommendations, key=lambda x: x.get("score", 0), reverse=True)
    
    print(f"✅ {len(final_recommendations)} genre-tabanlı öneri hazır ({len(liked_movies)} film analiz edildi)")
    return final_recommendations[:top_n]

def get_detailed_based_recommendations(user_profile, liked_movies, top_n=30):
    """Gelişmiş genre + yönetmen + oyuncu tabanlı öneriler"""
    
    detailed_analysis = analyze_user_detailed_preferences(liked_movies)
    recommendations = []
    
    print(f"🎯 Gelişmiş öneriler hesaplanıyor ({len(liked_movies)} film → {top_n} öneri hedefi)...")
    print(f"   👤 User profile aktif: {user_profile is not None}")
    print(f"   🎭 Analiz: {len(detailed_analysis.get('primary_genres', {}))} tür, {len(detailed_analysis.get('directors', {}))} yönetmen")
    
    for liked_movie in liked_movies:
        movie_id = liked_movie.get('movieId')
        title = liked_movie.get('title', 'Unknown')
        
        # Genre'leri al
        movie_genres = liked_movie.get('genres', [])
        movie_genre_ids = []
        
        for genre in movie_genres:
            if isinstance(genre, dict):
                genre_id = genre.get('id')
                if genre_id:
                    movie_genre_ids.append(genre_id)
            else:
                genre_id = get_genre_id_by_name(str(genre))
                if genre_id:
                    movie_genre_ids.append(genre_id)
        
        if not movie_genre_ids:
            continue
        
        # ✅ YENİ: Gelişmiş öneri fonksiyonunu kullan (V2)
        detailed_recommendations = generate_tmdb_based_recommendations_v2(
            movie_genre_ids, 
            title, 
            detailed_analysis,
            original_movie_data=liked_movie  # Tüm film detaylarını gönder
        )
        recommendations.extend(detailed_recommendations)
    
    # Tekrar edenleri kaldır ve sırala
    unique_recommendations = remove_duplicate_recommendations(recommendations)
    final_recommendations = sorted(unique_recommendations, key=lambda x: x.get("score", 0), reverse=True)
    
    print(f"✅ {len(final_recommendations)} gelişmiş öneri hazır")
    return final_recommendations[:top_n]


def generate_ml_recommendations(liked_movies):
    """Gelişmiş ML önerileri - hem eski hem yeni sistem"""
    print("🎯 Gelişmiş ML önerileri hesaplanıyor...")
    
    if not liked_movies:
        print("❌ No liked movies provided")
        return []
    
    try:
        # Önce gelişmiş sistemi dene (yönetmen + oyuncu)
        print("🚀 Gelişmiş sistem deneniyor (tür + yönetmen + oyuncu)...")
        recommendations = get_detailed_based_recommendations({}, liked_movies)
        
        if recommendations:
            print(f"✅ {len(recommendations)} gelişmiş öneri hazır")
            return recommendations
        else:
            # Gelişmiş sistem çalışmazsa eski genre sistemine fallback
            print("⚠️ Gelişmiş sistem sonuç vermedi, genre-tabanlı sisteme geçiliyor...")
            return get_genre_based_recommendations({}, liked_movies)
        
    except Exception as e:
        print(f"❌ Gelişmiş öneri hatası: {e}")
        # Hata durumunda eski genre sistemine fallback
        print("🔄 Genre-tabanlı sisteme fallback...")
        return get_genre_based_recommendations({}, liked_movies)
    

def remove_duplicate_recommendations(recommendations):
    """Tekrar eden önerileri kaldır"""
    seen = set()
    unique_recommendations = []
    
    for rec in recommendations:
        identifier = rec["movie_id"]
        if identifier not in seen:
            seen.add(identifier)
            unique_recommendations.append(rec)
    
    # Skora göre sırala
    return sorted(unique_recommendations, key=lambda x: x["score"], reverse=True)


# Health check endpoint

@app.route('/ml/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Python ML Recommendation Service", 
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/ml/recommend', methods=['POST'])
def get_recommendations():
    try:
        data = request.json
        user_id = data.get('user_id')
        liked_movies = data.get('liked_movies', [])
        
        print(f"🎯 ML Recommendation request for user {user_id}")
        print(f"📊 Liked movies: {len(liked_movies)}")

        for i, movie in enumerate(liked_movies):
            print(f"   🎬 {i+1}. {movie.get('title')}")
            print(f"      🎭 Genres: {movie.get('genres', [])}")
            print(f"      🆔 Movie ID: {movie.get('movieId')}")
            print(f"      📝 Genres Type: {type(movie.get('genres'))}")

        if not liked_movies:
            print("❌ Hiç beğenilen film yok")
            return jsonify({
                "success": True,
                "recommendations": [],
                "message": "No liked movies for ML analysis"
            })
        
        # ML öneri algoritması
        recommendations = generate_ml_recommendations(liked_movies)
        
        return jsonify({
            "success": True,
            "recommendations": recommendations,
            "algorithm": "hybrid_content_based",
            "user_id": user_id,
            "liked_movies_count": len(liked_movies),
            "count": len(recommendations)
        })
        
    except Exception as e:
        print(f"❌ ML service error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("✅ Python ML Service ready!")
    print("📡 Endpoints:")
    print("   GET  /ml/health")
    print("   POST /ml/recommend")
    print("🔗 Starting on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)