#!/usr/bin/env python3
"""
Phase 9A - ML Inference Script
===============================

Loads trained model and generates recommendations.
Called by Node.js API via subprocess.

Usage:
    python src/ml/predict.py --user-id <userId> [--n 10] [--budget 20]

Author: Pluqla Dev Team
Date: 2025-10-25
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ml.recommender import RecipeRecommender


def main():
    """Main inference function."""
    parser = argparse.ArgumentParser(description='Get recipe recommendations')
    parser.add_argument(
        '--user-id',
        type=str,
        required=True,
        help='User ID to get recommendations for'
    )
    parser.add_argument(
        '--n',
        type=int,
        default=10,
        help='Number of recommendations (default: 10)'
    )
    parser.add_argument(
        '--budget',
        type=float,
        default=None,
        help='Maximum budget per recipe in euros'
    )
    parser.add_argument(
        '--exclude',
        type=str,
        default=None,
        help='Comma-separated list of recipe IDs to exclude'
    )
    parser.add_argument(
        '--model-path',
        type=str,
        default='./ml-models',
        help='Path to trained model'
    )

    args = parser.parse_args()

    try:
        # Load model
        recommender = RecipeRecommender(model_path=args.model_path)
        recommender.load_model()

        # Parse excluded recipes
        excluded_ids = []
        if args.exclude:
            excluded_ids = [rid.strip() for rid in args.exclude.split(',')]

        # Get recommendations
        recommendations = recommender.get_hybrid_recommendations(
            user_id=args.user_id,
            n_recommendations=args.n,
            budget_max=args.budget,
            excluded_recipe_ids=excluded_ids if excluded_ids else None
        )

        # Output JSON to stdout
        output = {
            'success': True,
            'userId': args.user_id,
            'recommendations': recommendations,
            'count': len(recommendations)
        }

        print(json.dumps(output, ensure_ascii=False))

    except FileNotFoundError as e:
        # Model not trained yet
        error_output = {
            'success': False,
            'error': 'MODEL_NOT_TRAINED',
            'message': str(e),
            'hint': 'Run: node src/ml/export_training_data.js && python src/ml/train.py'
        }
        print(json.dumps(error_output, ensure_ascii=False))
        sys.exit(1)

    except Exception as e:
        # Other errors
        error_output = {
            'success': False,
            'error': 'PREDICTION_ERROR',
            'message': str(e)
        }
        print(json.dumps(error_output, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
