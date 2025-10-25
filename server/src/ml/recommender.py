"""
Phase 9A - Recipe Recommendation Engine
========================================

Hybrid recommendation system combining:
1. Collaborative Filtering (user-based similarities)
2. Content-Based Filtering (recipe features)
3. Budget constraints
4. Meal planning history

Author: Pluqla Dev Team
Date: 2025-10-25
"""

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
import json
import joblib
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta


class RecipeRecommender:
    """
    Hybrid recipe recommendation engine.

    Combines collaborative filtering (user favorites) with content-based
    filtering (recipe features like tags, ingredients, cuisine).
    """

    def __init__(self, model_path: str = './ml-models'):
        """
        Initialize the recommender.

        Args:
            model_path: Path to save/load trained models
        """
        self.model_path = Path(model_path)
        self.model_path.mkdir(exist_ok=True)

        # Models
        self.recipe_features_matrix = None
        self.user_item_matrix = None
        self.recipe_similarity_matrix = None
        self.user_similarity_matrix = None

        # Data
        self.recipes_df = None
        self.favorites_df = None
        self.recipe_id_to_idx = {}
        self.idx_to_recipe_id = {}
        self.user_id_to_idx = {}
        self.idx_to_user_id = {}

        # Feature vectorizer
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2)
        )

        # Scaler for numerical features
        self.scaler = StandardScaler()

        # Weights for hybrid approach
        self.collaborative_weight = 0.4
        self.content_weight = 0.6

    def load_data(self, recipes_path: str, favorites_path: str):
        """
        Load recipe and user favorites data.

        Args:
            recipes_path: Path to recipes JSON file
            favorites_path: Path to favorites JSON file
        """
        print(f"📚 Loading data from {recipes_path} and {favorites_path}...")

        # Load recipes
        with open(recipes_path, 'r', encoding='utf-8') as f:
            recipes_data = json.load(f)
        self.recipes_df = pd.DataFrame(recipes_data)

        # Load favorites
        with open(favorites_path, 'r', encoding='utf-8') as f:
            favorites_data = json.load(f)
        self.favorites_df = pd.DataFrame(favorites_data)

        # Create ID mappings
        self._create_id_mappings()

        print(f"✅ Loaded {len(self.recipes_df)} recipes and {len(self.favorites_df)} favorites")
        print(f"✅ {len(self.user_id_to_idx)} unique users")

    def _create_id_mappings(self):
        """Create bidirectional mappings between IDs and indices."""
        # Recipe mappings
        unique_recipes = self.recipes_df['id'].unique()
        self.recipe_id_to_idx = {rid: idx for idx, rid in enumerate(unique_recipes)}
        self.idx_to_recipe_id = {idx: rid for rid, idx in self.recipe_id_to_idx.items()}

        # User mappings
        unique_users = self.favorites_df['userId'].unique()
        self.user_id_to_idx = {uid: idx for idx, uid in enumerate(unique_users)}
        self.idx_to_user_id = {idx: uid for uid, idx in self.user_id_to_idx.items()}

    def build_content_features(self):
        """
        Build content-based feature matrix from recipe attributes.

        Features include:
        - Tags (TF-IDF)
        - Ingredients (TF-IDF)
        - Cuisine type
        - Difficulty
        - Preparation time
        - Estimated cost
        """
        print("🔨 Building content-based features...")

        n_recipes = len(self.recipe_id_to_idx)

        # 1. Text features (tags + ingredients)
        text_features = []
        for _, recipe in self.recipes_df.iterrows():
            tags = ' '.join(recipe.get('tags', []))
            ingredients = ' '.join([ing.get('name', '') for ing in recipe.get('ingredients', [])])
            cuisine = recipe.get('cuisine', '')
            text = f"{tags} {ingredients} {cuisine}"
            text_features.append(text)

        # TF-IDF vectorization
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(text_features)

        # 2. Numerical features
        numerical_features = []
        for _, recipe in self.recipes_df.iterrows():
            features = [
                recipe.get('prepTime', 30),  # Preparation time
                recipe.get('difficulty', 2),  # Difficulty (1-3)
                recipe.get('estimatedCost', 10),  # Cost in euros
                len(recipe.get('ingredients', [])),  # Number of ingredients
            ]
            numerical_features.append(features)

        numerical_matrix = self.scaler.fit_transform(numerical_features)

        # 3. Categorical features (one-hot encoding)
        cuisines = self.recipes_df['cuisine'].fillna('unknown')
        cuisine_dummies = pd.get_dummies(cuisines, prefix='cuisine')

        difficulties = self.recipes_df['difficulty'].fillna(2)
        difficulty_dummies = pd.get_dummies(difficulties, prefix='difficulty')

        # Combine all features
        self.recipe_features_matrix = np.hstack([
            tfidf_matrix.toarray(),
            numerical_matrix,
            cuisine_dummies.values,
            difficulty_dummies.values
        ])

        print(f"✅ Built feature matrix: {self.recipe_features_matrix.shape}")

    def build_collaborative_features(self):
        """
        Build user-item matrix for collaborative filtering.

        Matrix shape: [n_users, n_recipes]
        Values: 1 if user favorited recipe, 0 otherwise
        """
        print("🤝 Building collaborative filtering features...")

        n_users = len(self.user_id_to_idx)
        n_recipes = len(self.recipe_id_to_idx)

        # Initialize user-item matrix
        self.user_item_matrix = np.zeros((n_users, n_recipes))

        # Fill matrix with favorites
        for _, fav in self.favorites_df.iterrows():
            user_idx = self.user_id_to_idx.get(fav['userId'])
            recipe_idx = self.recipe_id_to_idx.get(fav['recipeId'])

            if user_idx is not None and recipe_idx is not None:
                self.user_item_matrix[user_idx, recipe_idx] = 1

        print(f"✅ Built user-item matrix: {self.user_item_matrix.shape}")
        print(f"   Sparsity: {(1 - self.user_item_matrix.sum() / self.user_item_matrix.size) * 100:.2f}%")

    def compute_similarity_matrices(self):
        """Compute similarity matrices for recipes and users."""
        print("📊 Computing similarity matrices...")

        # Recipe similarity (content-based)
        if self.recipe_features_matrix is not None:
            self.recipe_similarity_matrix = cosine_similarity(self.recipe_features_matrix)
            print(f"✅ Recipe similarity matrix: {self.recipe_similarity_matrix.shape}")

        # User similarity (collaborative)
        if self.user_item_matrix is not None:
            self.user_similarity_matrix = cosine_similarity(self.user_item_matrix)
            print(f"✅ User similarity matrix: {self.user_similarity_matrix.shape}")

    def train(self, recipes_path: str, favorites_path: str):
        """
        Train the recommendation model.

        Args:
            recipes_path: Path to recipes data
            favorites_path: Path to favorites data
        """
        print("🚀 Starting model training...")
        start_time = datetime.now()

        # Load data
        self.load_data(recipes_path, favorites_path)

        # Build features
        self.build_content_features()
        self.build_collaborative_features()

        # Compute similarities
        self.compute_similarity_matrices()

        # Save model
        self.save_model()

        duration = (datetime.now() - start_time).total_seconds()
        print(f"✅ Training completed in {duration:.2f}s")

    def save_model(self):
        """Save trained model to disk."""
        print(f"💾 Saving model to {self.model_path}...")

        model_data = {
            'recipe_features_matrix': self.recipe_features_matrix,
            'user_item_matrix': self.user_item_matrix,
            'recipe_similarity_matrix': self.recipe_similarity_matrix,
            'user_similarity_matrix': self.user_similarity_matrix,
            'recipe_id_to_idx': self.recipe_id_to_idx,
            'idx_to_recipe_id': self.idx_to_recipe_id,
            'user_id_to_idx': self.user_id_to_idx,
            'idx_to_user_id': self.idx_to_user_id,
            'tfidf_vectorizer': self.tfidf_vectorizer,
            'scaler': self.scaler,
        }

        joblib.dump(model_data, self.model_path / 'recommender_model.pkl')

        # Save recipes metadata for quick lookup
        self.recipes_df.to_json(
            self.model_path / 'recipes_metadata.json',
            orient='records',
            force_ascii=False
        )

        print("✅ Model saved successfully")

    def load_model(self):
        """Load trained model from disk."""
        model_file = self.model_path / 'recommender_model.pkl'

        if not model_file.exists():
            raise FileNotFoundError(f"Model not found at {model_file}. Please train the model first.")

        print(f"📂 Loading model from {model_file}...")

        model_data = joblib.load(model_file)

        self.recipe_features_matrix = model_data['recipe_features_matrix']
        self.user_item_matrix = model_data['user_item_matrix']
        self.recipe_similarity_matrix = model_data['recipe_similarity_matrix']
        self.user_similarity_matrix = model_data['user_similarity_matrix']
        self.recipe_id_to_idx = model_data['recipe_id_to_idx']
        self.idx_to_recipe_id = model_data['idx_to_recipe_id']
        self.user_id_to_idx = model_data['user_id_to_idx']
        self.idx_to_user_id = model_data['idx_to_user_id']
        self.tfidf_vectorizer = model_data['tfidf_vectorizer']
        self.scaler = model_data['scaler']

        # Load recipes metadata
        self.recipes_df = pd.read_json(
            self.model_path / 'recipes_metadata.json',
            orient='records'
        )

        print("✅ Model loaded successfully")

    def get_content_based_recommendations(
        self,
        user_id: str,
        n_recommendations: int = 10
    ) -> List[Tuple[str, float, str]]:
        """
        Get content-based recommendations based on user's favorite recipes.

        Args:
            user_id: User ID
            n_recommendations: Number of recommendations to return

        Returns:
            List of (recipe_id, score, reason) tuples
        """
        user_idx = self.user_id_to_idx.get(user_id)

        if user_idx is None:
            # New user - return popular recipes
            return self._get_popular_recipes(n_recommendations)

        # Get user's favorited recipes
        user_favorites_idx = np.where(self.user_item_matrix[user_idx] == 1)[0]

        if len(user_favorites_idx) == 0:
            return self._get_popular_recipes(n_recommendations)

        # Compute average similarity to favorited recipes
        similarities = self.recipe_similarity_matrix[user_favorites_idx].mean(axis=0)

        # Exclude already favorited recipes
        similarities[user_favorites_idx] = -1

        # Get top N recommendations
        top_indices = np.argsort(similarities)[::-1][:n_recommendations]

        recommendations = []
        for idx in top_indices:
            recipe_id = self.idx_to_recipe_id[idx]
            score = similarities[idx]

            # Generate explanation
            recipe = self.recipes_df[self.recipes_df['id'] == recipe_id].iloc[0]
            reason = self._generate_content_reason(recipe, user_favorites_idx)

            recommendations.append((recipe_id, float(score), reason))

        return recommendations

    def get_collaborative_recommendations(
        self,
        user_id: str,
        n_recommendations: int = 10
    ) -> List[Tuple[str, float, str]]:
        """
        Get collaborative filtering recommendations based on similar users.

        Args:
            user_id: User ID
            n_recommendations: Number of recommendations to return

        Returns:
            List of (recipe_id, score, reason) tuples
        """
        user_idx = self.user_id_to_idx.get(user_id)

        if user_idx is None:
            return self._get_popular_recipes(n_recommendations)

        # Find similar users
        user_similarities = self.user_similarity_matrix[user_idx]

        # Get top 10 similar users (excluding self)
        user_similarities[user_idx] = -1
        similar_user_indices = np.argsort(user_similarities)[::-1][:10]

        # Aggregate their favorites (weighted by similarity)
        recipe_scores = np.zeros(len(self.recipe_id_to_idx))

        for similar_user_idx in similar_user_indices:
            similarity = user_similarities[similar_user_idx]
            user_favorites = self.user_item_matrix[similar_user_idx]
            recipe_scores += similarity * user_favorites

        # Exclude already favorited recipes
        user_favorites_idx = np.where(self.user_item_matrix[user_idx] == 1)[0]
        recipe_scores[user_favorites_idx] = -1

        # Get top N recommendations
        top_indices = np.argsort(recipe_scores)[::-1][:n_recommendations]

        recommendations = []
        for idx in top_indices:
            recipe_id = self.idx_to_recipe_id[idx]
            score = recipe_scores[idx]

            reason = "Aimé par des utilisateurs ayant des goûts similaires aux vôtres"

            recommendations.append((recipe_id, float(score), reason))

        return recommendations

    def get_hybrid_recommendations(
        self,
        user_id: str,
        n_recommendations: int = 10,
        budget_max: Optional[float] = None,
        excluded_recipe_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Get hybrid recommendations combining collaborative and content-based approaches.

        Args:
            user_id: User ID
            n_recommendations: Number of recommendations to return
            budget_max: Maximum budget per recipe (euros)
            excluded_recipe_ids: Recipe IDs to exclude

        Returns:
            List of recommendation dictionaries with recipe data, score, and reason
        """
        # Get both types of recommendations
        content_recs = self.get_content_based_recommendations(user_id, n_recommendations * 2)
        collab_recs = self.get_collaborative_recommendations(user_id, n_recommendations * 2)

        # Combine scores
        combined_scores = {}

        for recipe_id, score, reason in content_recs:
            combined_scores[recipe_id] = {
                'content_score': score,
                'collab_score': 0,
                'content_reason': reason,
                'collab_reason': ''
            }

        for recipe_id, score, reason in collab_recs:
            if recipe_id in combined_scores:
                combined_scores[recipe_id]['collab_score'] = score
                combined_scores[recipe_id]['collab_reason'] = reason
            else:
                combined_scores[recipe_id] = {
                    'content_score': 0,
                    'collab_score': score,
                    'content_reason': '',
                    'collab_reason': reason
                }

        # Compute hybrid scores
        recommendations = []

        for recipe_id, scores in combined_scores.items():
            # Skip excluded recipes
            if excluded_recipe_ids and recipe_id in excluded_recipe_ids:
                continue

            # Get recipe data
            recipe = self.recipes_df[self.recipes_df['id'] == recipe_id]
            if recipe.empty:
                continue

            recipe_data = recipe.iloc[0].to_dict()

            # Apply budget filter
            if budget_max and recipe_data.get('estimatedCost', 0) > budget_max:
                continue

            # Compute hybrid score
            hybrid_score = (
                self.content_weight * scores['content_score'] +
                self.collaborative_weight * scores['collab_score']
            )

            # Generate explanation
            reason = self._generate_hybrid_reason(scores)

            recommendations.append({
                'recipeId': recipe_id,
                'score': float(hybrid_score),
                'matchPercentage': min(100, int(hybrid_score * 100)),
                'reason': reason,
                'recipe': recipe_data
            })

        # Sort by score and return top N
        recommendations.sort(key=lambda x: x['score'], reverse=True)

        return recommendations[:n_recommendations]

    def _get_popular_recipes(self, n: int) -> List[Tuple[str, float, str]]:
        """Get most popular recipes (fallback for new users)."""
        # Count favorites per recipe
        recipe_counts = {}

        for _, fav in self.favorites_df.iterrows():
            recipe_id = fav['recipeId']
            recipe_counts[recipe_id] = recipe_counts.get(recipe_id, 0) + 1

        # Sort by popularity
        popular = sorted(recipe_counts.items(), key=lambda x: x[1], reverse=True)[:n]

        return [
            (recipe_id, count / len(self.favorites_df), "Recette populaire auprès de la communauté")
            for recipe_id, count in popular
        ]

    def _generate_content_reason(self, recipe: pd.Series, user_favorites_idx: np.ndarray) -> str:
        """Generate explanation for content-based recommendation."""
        # Get user's favorite recipes
        favorite_recipes = self.recipes_df.iloc[user_favorites_idx]

        # Find common features
        common_tags = set(recipe.get('tags', [])) & set(
            tag for tags in favorite_recipes['tags'] for tag in tags
        )

        if common_tags:
            tag = list(common_tags)[0]
            return f"Parce que vous aimez les plats {tag}"

        # Check cuisine
        if recipe.get('cuisine') in favorite_recipes['cuisine'].values:
            return f"Parce que vous aimez la cuisine {recipe['cuisine']}"

        return "Recette similaire à vos favoris"

    def _generate_hybrid_reason(self, scores: Dict) -> str:
        """Generate explanation for hybrid recommendation."""
        reasons = []

        if scores['content_reason']:
            reasons.append(scores['content_reason'])

        if scores['collab_score'] > 0.3:
            reasons.append("Apprécié par des utilisateurs similaires")

        if not reasons:
            return "Recommandé pour vous"

        return " • ".join(reasons)


def main():
    """Test the recommender."""
    recommender = RecipeRecommender()

    # Example: Train model
    # recommender.train(
    #     recipes_path='./ml-data/recipes.json',
    #     favorites_path='./ml-data/favorites.json'
    # )

    # Example: Load model and get recommendations
    # recommender.load_model()
    # recs = recommender.get_hybrid_recommendations(
    #     user_id='user123',
    #     n_recommendations=10,
    #     budget_max=15.0
    # )
    # print(json.dumps(recs, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
