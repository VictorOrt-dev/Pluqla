import React from 'react';
import RecipeCard from './RecipeCard';

const RecipeList = ({ recipes, darkMode, onRecipeSelect, onFavoriteToggle, favorites }) => {
  if (!recipes.length) {
    return (
      <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-4xl mb-4">🔍</div>
        <p>Aucune recette trouvée</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recipes.map(recipe => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          darkMode={darkMode}
          onSelect={() => onRecipeSelect(recipe.id)}
          onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
          isFavorite={favorites.includes(recipe.id)}
        />
      ))}
    </div>
  );
};

export default RecipeList;