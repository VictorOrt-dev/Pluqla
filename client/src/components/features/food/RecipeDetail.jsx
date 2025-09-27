import React from 'react';

const RecipeDetail = ({ recipe, darkMode, onClose }) => {
  if (!recipe) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div className="relative">
          <div className={`h-48 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
            <span className="text-8xl">{recipe.image}</span>
          </div>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
          >
            ✕
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-bold text-white mb-2">{recipe.name}</h1>
            <div className="flex gap-3">
              <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                {recipe.prepTime} min
              </span>
              <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                {recipe.servings} pers
              </span>
              <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                {recipe.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-12rem)]">
          <div className="p-6 space-y-6">
            {/* Prix et nutrition */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                  Coût total
                </h3>
                <p className="text-2xl font-bold text-green-500">{recipe.price.toFixed(2)}€</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {(recipe.price / recipe.servings).toFixed(2)}€ par personne
                </p>
              </div>
              
              <div className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                  Nutrition
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {recipe.nutrition.calories} cal
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  P: {recipe.nutrition.protein}g • G: {recipe.nutrition.carbs}g • L: {recipe.nutrition.fat}g
                </p>
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
                Ingrédients
              </h3>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, idx) => (
                  <div 
                    key={idx}
                    className={`flex justify-between items-center p-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}
                  >
                    <div className="flex-1">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {ingredient.name}
                      </span>
                      <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({ingredient.quantity})
                      </span>
                    </div>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                      {ingredient.price.toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
                Instructions
              </h3>
              <div className="space-y-3">
                {recipe.instructions.map((instruction, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                      {idx + 1}
                    </div>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} flex-1`}>
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conseil */}
            {recipe.tips && (
              <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-xl`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-blue-800'}`}>
                  💡 Conseil du chef
                </h4>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  {recipe.tips}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;