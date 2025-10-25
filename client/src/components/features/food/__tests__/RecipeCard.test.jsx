/**
 * Tests unitaires - RecipeCard Component
 *
 * Coverage des fonctionnalités:
 * - Affichage des données recette correctement
 * - Bouton favoris et callbacks
 * - Badges IA Phase 1A/1C
 * - Scores de popularité et santé
 * - Accessibilité (ARIA, keyboard)
 * - XSS protection avec DOMPurify
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipeCard from '../RecipeCard';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html) => html)
}));

describe('RecipeCard Component', () => {
  const mockRecipe = {
    id: 'recipe-1',
    name: 'Pasta Carbonara',
    title: 'Pasta Carbonara',
    description: 'Delicious Italian pasta',
    price: 8.5,
    servings: 4,
    difficulty: 'easy',
    category: 'Italian',
    image: '🍝',
    prep_time: 30,
    cookingTime: 30,
    tags: ['pasta', 'italian', 'quick'],
    nutrition: {
      calories: 450,
      protein: 15,
      carbs: 60,
      fat: 12
    }
  };

  const defaultProps = {
    recipe: mockRecipe,
    darkMode: false,
    onSelect: jest.fn(),
    onFavoriteToggle: jest.fn(),
    isFavorite: false,
    showAIBadge: false,
    showPopularityScore: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render recipe card with basic information', () => {
      render(<RecipeCard {...defaultProps} />);

      expect(screen.getByText(/Pasta Carbonara/i)).toBeInTheDocument();
      expect(screen.getByText('🍝')).toBeInTheDocument();
      expect(screen.getByText('8.50€')).toBeInTheDocument();
      expect(screen.getByText(/Pour 4 personnes/i)).toBeInTheDocument();
      expect(screen.getByText(/Italian/i)).toBeInTheDocument();
    });

    it('should calculate price per serving correctly', () => {
      render(<RecipeCard {...defaultProps} />);

      // 8.5€ / 4 servings = 2.13€
      expect(screen.getByText('2.13€/pers')).toBeInTheDocument();
    });

    it('should display difficulty badge correctly', () => {
      render(<RecipeCard {...defaultProps} />);

      expect(screen.getByText('Facile')).toBeInTheDocument();
    });

    it('should display cooking time', () => {
      render(<RecipeCard {...defaultProps} />);

      expect(screen.getByText('30 min')).toBeInTheDocument();
    });

    it('should render tags (max 3)', () => {
      render(<RecipeCard {...defaultProps} />);

      expect(screen.getByText('pasta')).toBeInTheDocument();
      expect(screen.getByText('italian')).toBeInTheDocument();
      expect(screen.getByText('quick')).toBeInTheDocument();
    });

    it('should apply dark mode styles', () => {
      const { container } = render(<RecipeCard {...defaultProps} darkMode={true} />);

      const card = container.firstChild;
      expect(card).toHaveClass('bg-gray-900');
      expect(card).toHaveClass('border-gray-800');
    });

    it('should apply light mode styles', () => {
      const { container } = render(<RecipeCard {...defaultProps} darkMode={false} />);

      const card = container.firstChild;
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('border-gray-200');
    });
  });

  describe('Favorite Button', () => {
    it('should show white heart when not favorite', () => {
      render(<RecipeCard {...defaultProps} isFavorite={false} />);

      expect(screen.getByText('🤍')).toBeInTheDocument();
    });

    it('should show red heart when favorite', () => {
      render(<RecipeCard {...defaultProps} isFavorite={true} />);

      expect(screen.getByText('❤️')).toBeInTheDocument();
    });

    it('should call onFavoriteToggle when favorite button clicked', () => {
      render(<RecipeCard {...defaultProps} />);

      const favoriteBtn = screen.getByLabelText(/Ajouter aux favoris/i);
      fireEvent.click(favoriteBtn);

      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledTimes(1);
    });

    it('should NOT propagate click to card when favorite button clicked', () => {
      render(<RecipeCard {...defaultProps} />);

      const favoriteBtn = screen.getByLabelText(/Ajouter aux favoris/i);
      fireEvent.click(favoriteBtn);

      expect(defaultProps.onSelect).not.toHaveBeenCalled();
      expect(defaultProps.onFavoriteToggle).toHaveBeenCalled();
    });

    it('should hide favorite button when AI badge is shown', () => {
      render(<RecipeCard {...defaultProps} showAIBadge={true} />);

      expect(screen.queryByLabelText(/favoris/i)).not.toBeInTheDocument();
    });
  });

  describe('Card Selection', () => {
    it('should call onSelect when card is clicked', () => {
      const { container } = render(<RecipeCard {...defaultProps} />);

      const card = container.firstChild;
      fireEvent.click(card);

      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when Enter key is pressed', () => {
      const { container } = render(<RecipeCard {...defaultProps} />);

      const card = container.firstChild;
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when Space key is pressed', () => {
      const { container } = render(<RecipeCard {...defaultProps} />);

      const card = container.firstChild;
      fireEvent.keyDown(card, { key: ' ' });

      expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onSelect on other keys', () => {
      const { container } = render(<RecipeCard {...defaultProps} />);

      const card = container.firstChild;
      fireEvent.keyDown(card, { key: 'a' });

      expect(defaultProps.onSelect).not.toHaveBeenCalled();
    });
  });

  describe('AI Badge - Phase 1C', () => {
    it('should show AI badge when showAIBadge is true', () => {
      render(<RecipeCard {...defaultProps} showAIBadge={true} />);

      expect(screen.getByText('IA')).toBeInTheDocument();
    });

    it('should apply ring styling when AI badge is shown', () => {
      const { container } = render(<RecipeCard {...defaultProps} showAIBadge={true} />);

      const card = container.firstChild;
      expect(card).toHaveClass('ring-2');
      expect(card).toHaveClass('ring-red-500/20');
    });

    it('should NOT show AI badge by default', () => {
      render(<RecipeCard {...defaultProps} showAIBadge={false} />);

      expect(screen.queryByText('IA')).not.toBeInTheDocument();
    });
  });

  describe('Popularity Score - Phase 1A', () => {
    it('should show popularity score when provided', () => {
      const recipeWithScore = {
        ...mockRecipe,
        popularity_score: 87.5
      };

      render(<RecipeCard {...defaultProps} recipe={recipeWithScore} showPopularityScore={true} />);

      expect(screen.getByText('88')).toBeInTheDocument(); // Rounded
    });

    it('should NOT show popularity score when showPopularityScore is false', () => {
      const recipeWithScore = {
        ...mockRecipe,
        popularity_score: 87.5
      };

      render(<RecipeCard {...defaultProps} recipe={recipeWithScore} showPopularityScore={false} />);

      expect(screen.queryByText('88')).not.toBeInTheDocument();
    });

    it('should NOT show popularity score when score is 0', () => {
      const recipeWithScore = {
        ...mockRecipe,
        popularity_score: 0
      };

      render(<RecipeCard {...defaultProps} recipe={recipeWithScore} showPopularityScore={true} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Health Score - Phase 1A', () => {
    it('should show health score bar when provided', () => {
      const recipeWithHealth = {
        ...mockRecipe,
        health_score: 75
      };

      render(<RecipeCard {...defaultProps} recipe={recipeWithHealth} />);

      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('should use green color for high health score (>= 70)', () => {
      const recipeWithHealth = {
        ...mockRecipe,
        health_score: 80
      };

      const { container } = render(<RecipeCard {...defaultProps} recipe={recipeWithHealth} />);

      const healthText = screen.getByText('80/100');
      expect(healthText).toHaveClass('text-green-500');
    });

    it('should use yellow color for medium health score (40-69)', () => {
      const recipeWithHealth = {
        ...mockRecipe,
        health_score: 50
      };

      const { container } = render(<RecipeCard {...defaultProps} recipe={recipeWithHealth} />);

      const healthText = screen.getByText('50/100');
      expect(healthText).toHaveClass('text-yellow-500');
    });

    it('should use red color for low health score (< 40)', () => {
      const recipeWithHealth = {
        ...mockRecipe,
        health_score: 30
      };

      const { container } = render(<RecipeCard {...defaultProps} recipe={recipeWithHealth} />);

      const healthText = screen.getByText('30/100');
      expect(healthText).toHaveClass('text-red-500');
    });
  });

  describe('Accessibility (a11y)', () => {
    it('should have proper ARIA label on card', () => {
      const { container } = render(<RecipeCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('aria-label', 'Voir les détails de la recette Pasta Carbonara');
    });

    it('should have proper ARIA label on favorite button', () => {
      render(<RecipeCard {...defaultProps} isFavorite={false} />);

      const favoriteBtn = screen.getByLabelText('Ajouter aux favoris');
      expect(favoriteBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('should update ARIA pressed state when favorite', () => {
      render(<RecipeCard {...defaultProps} isFavorite={true} />);

      const favoriteBtn = screen.getByLabelText('Retirer des favoris');
      expect(favoriteBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have tabIndex on card for keyboard navigation', () => {
      const { container } = render(<RecipeCard {...defaultProps} />);

      const card = container.firstChild;
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-hidden on decorative icons', () => {
      render(<RecipeCard {...defaultProps} isFavorite={false} />);

      const heartIcon = screen.getByText('🤍');
      expect(heartIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have role="img" and aria-label on recipe emoji', () => {
      render(<RecipeCard {...defaultProps} />);

      const emojiImg = screen.getByLabelText('Icône recette Pasta Carbonara');
      expect(emojiImg).toHaveAttribute('role', 'img');
    });

    it('should have focus ring on favorite button', () => {
      render(<RecipeCard {...defaultProps} />);

      const favoriteBtn = screen.getByLabelText(/favoris/i);
      expect(favoriteBtn).toHaveClass('focus:outline-none');
      expect(favoriteBtn).toHaveClass('focus:ring-2');
      expect(favoriteBtn).toHaveClass('focus:ring-red-500');
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize recipe title with DOMPurify', () => {
      const DOMPurify = require('dompurify');

      render(<RecipeCard {...defaultProps} />);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith('Pasta Carbonara');
    });

    it('should safely render HTML in recipe title', () => {
      const maliciousRecipe = {
        ...mockRecipe,
        name: '<script>alert("XSS")</script>Pasta'
      };

      const { container } = render(<RecipeCard {...defaultProps} recipe={maliciousRecipe} />);

      // Should not contain actual script tag
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing price gracefully', () => {
      const recipeNullPrice = {
        ...mockRecipe,
        price: null
      };

      render(<RecipeCard {...defaultProps} recipe={recipeNullPrice} />);

      expect(screen.getByText('0.00€')).toBeInTheDocument();
    });

    it('should handle 1 serving correctly (singular)', () => {
      const recipeSingleServing = {
        ...mockRecipe,
        servings: 1
      };

      render(<RecipeCard {...defaultProps} recipe={recipeSingleServing} />);

      expect(screen.getByText(/Pour 1 personne/i)).toBeInTheDocument();
      expect(screen.queryByText(/personnes/i)).not.toBeInTheDocument();
    });

    it('should handle intermediate difficulty', () => {
      const recipeIntermediate = {
        ...mockRecipe,
        difficulty: 'intermediate'
      };

      render(<RecipeCard {...defaultProps} recipe={recipeIntermediate} />);

      expect(screen.getByText('Moyen')).toBeInTheDocument();
    });

    it('should handle hard difficulty', () => {
      const recipeHard = {
        ...mockRecipe,
        difficulty: 'hard'
      };

      render(<RecipeCard {...defaultProps} recipe={recipeHard} />);

      expect(screen.getByText('Difficile')).toBeInTheDocument();
    });

    it('should handle empty tags array', () => {
      const recipeNoTags = {
        ...mockRecipe,
        tags: []
      };

      render(<RecipeCard {...defaultProps} recipe={recipeNoTags} />);

      // Should not crash
      expect(screen.getByText(/Pasta Carbonara/i)).toBeInTheDocument();
    });

    it('should show AI tags when available', () => {
      const recipeWithAITags = {
        ...mockRecipe,
        ai_tags: ['healthy', 'quick'],
        tags: ['pasta']
      };

      render(<RecipeCard {...defaultProps} recipe={recipeWithAITags} showAIBadge={true} />);

      expect(screen.getByText('healthy')).toBeInTheDocument();
    });
  });
});
