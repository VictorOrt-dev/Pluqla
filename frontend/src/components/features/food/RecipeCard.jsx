import React from 'react';

const RecipeCard = ({ recipe, darkMode, onSelect, onFavoriteToggle, isFavorite }) => {
  const pricePerServing = (recipe.price / recipe.servings).toFixed(2);

  return (
    <div 
      className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg`}
      onClick={onSelect}
    >
      <div className="relative">
        <div className={`h-32 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
          <span className="text-4xl">{recipe.image}</span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle();
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
        >
          <span className={`text-lg ${isFavorite ? 'text-red-400' : 'text-gray-300'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>

        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            recipe.difficulty === 'Facile' 
              ? 'bg-green-500 text-white'
              : recipe.difficulty === 'Moyen'
                ? 'bg-yellow-500 text-white'
                : 'bg-red-500 text-white'
          }`}>
            {recipe.difficulty}
          </span>
          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
            {recipe.prepTime} min
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            {recipe.name}
          </h3>
          <div className="text-right">
            <p className="text-lg font-bold text-green-500">{recipe.price.toFixed(2)}€</p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {pricePerServing}€/pers
            </p>
          </div>
        </div>

        <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Pour {recipe.servings} personne{recipe.servings > 1 ? 's' : ''} • {recipe.category}
        </p>

        <div className="flex gap-1 flex-wrap">
          {recipe.tags.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx}
              className={`px-2 py-1 text-xs rounded-full ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;