#!/usr/bin/env python3
"""
Phase 9A - ML Model Training Script
====================================

Trains the hybrid recommendation model using exported data.

Usage:
    python src/ml/train.py [--recipes path] [--favorites path]

Author: Pluqla Dev Team
Date: 2025-10-25
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from ml.recommender import RecipeRecommender


def load_config(config_path: str = './ml-config.json'):
    """Load training configuration."""
    default_config = {
        'model_path': './ml-models',
        'recipes_path': './ml-data/recipes.json',
        'favorites_path': './ml-data/favorites.json',
        'collaborative_weight': 0.4,
        'content_weight': 0.6,
        'min_favorites_per_user': 2,
        'min_users_per_recipe': 1
    }

    config_file = Path(config_path)
    if config_file.exists():
        with open(config_file, 'r') as f:
            user_config = json.load(f)
            default_config.update(user_config)

    return default_config


def validate_data(recipes_path: str, favorites_path: str):
    """Validate that data files exist and are properly formatted."""
    print("🔍 Validating data files...")

    # Check recipes file
    recipes_file = Path(recipes_path)
    if not recipes_file.exists():
        raise FileNotFoundError(f"Recipes file not found: {recipes_path}")

    with open(recipes_file, 'r', encoding='utf-8') as f:
        recipes = json.load(f)

    if not recipes:
        raise ValueError("Recipes file is empty")

    print(f"✅ Found {len(recipes)} recipes")

    # Check favorites file
    favorites_file = Path(favorites_path)
    if not favorites_file.exists():
        raise FileNotFoundError(f"Favorites file not found: {favorites_path}")

    with open(favorites_file, 'r', encoding='utf-8') as f:
        favorites = json.load(f)

    if not favorites:
        raise ValueError("Favorites file is empty")

    print(f"✅ Found {len(favorites)} favorites")

    # Validate data quality
    unique_users = len(set(f['userId'] for f in favorites))
    unique_recipes = len(set(f['recipeId'] for f in favorites))

    print(f"✅ {unique_users} unique users, {unique_recipes} unique recipes in favorites")

    if unique_users < 2:
        print("⚠️ Warning: Very few users (<2). Collaborative filtering may not work well.")

    if unique_recipes < 10:
        print("⚠️ Warning: Very few recipes (<10). Recommendations may be limited.")

    return recipes, favorites


def save_training_report(
    recommender: RecipeRecommender,
    config: dict,
    duration: float,
    output_path: str = './ml-models/training_report.json'
):
    """Save training report with model metadata."""
    report = {
        'training_date': datetime.now().isoformat(),
        'duration_seconds': duration,
        'config': config,
        'model_stats': {
            'n_recipes': len(recommender.recipe_id_to_idx),
            'n_users': len(recommender.user_id_to_idx),
            'n_favorites': len(recommender.favorites_df),
            'feature_matrix_shape': list(recommender.recipe_features_matrix.shape),
            'user_item_matrix_shape': list(recommender.user_item_matrix.shape),
            'sparsity': float(
                (1 - recommender.user_item_matrix.sum() / recommender.user_item_matrix.size) * 100
            ),
        },
        'weights': {
            'collaborative': recommender.collaborative_weight,
            'content': recommender.content_weight,
        }
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"📄 Training report saved to {output_path}")


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train the recipe recommendation model')
    parser.add_argument(
        '--recipes',
        type=str,
        default='./ml-data/recipes.json',
        help='Path to recipes JSON file'
    )
    parser.add_argument(
        '--favorites',
        type=str,
        default='./ml-data/favorites.json',
        help='Path to favorites JSON file'
    )
    parser.add_argument(
        '--config',
        type=str,
        default='./ml-config.json',
        help='Path to training configuration file'
    )
    parser.add_argument(
        '--model-path',
        type=str,
        default='./ml-models',
        help='Path to save trained model'
    )

    args = parser.parse_args()

    print("=" * 60)
    print("🤖 PLUQLA ML RECOMMENDATION ENGINE - TRAINING")
    print("=" * 60)
    print()

    # Load configuration
    config = load_config(args.config)
    config['recipes_path'] = args.recipes
    config['favorites_path'] = args.favorites
    config['model_path'] = args.model_path

    print("📋 Configuration:")
    for key, value in config.items():
        print(f"   {key}: {value}")
    print()

    try:
        # Validate data
        validate_data(config['recipes_path'], config['favorites_path'])
        print()

        # Initialize recommender
        recommender = RecipeRecommender(model_path=config['model_path'])

        # Set weights
        recommender.collaborative_weight = config['collaborative_weight']
        recommender.content_weight = config['content_weight']

        # Train model
        start_time = datetime.now()
        recommender.train(
            recipes_path=config['recipes_path'],
            favorites_path=config['favorites_path']
        )
        duration = (datetime.now() - start_time).total_seconds()

        # Save training report
        save_training_report(
            recommender,
            config,
            duration,
            f"{config['model_path']}/training_report.json"
        )

        print()
        print("=" * 60)
        print("✅ TRAINING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"⏱️  Duration: {duration:.2f}s")
        print(f"📁 Model saved to: {config['model_path']}")
        print()
        print("🎯 Next steps:")
        print("   1. Test the model: python src/ml/test_recommender.py")
        print("   2. Start the API server: npm run dev")
        print("   3. Call the API: GET /api/v1/ml/recommendations?userId=XXX")
        print()

    except Exception as e:
        print()
        print("=" * 60)
        print("❌ TRAINING FAILED")
        print("=" * 60)
        print(f"Error: {str(e)}")
        print()
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
