import React, { useState } from 'react';

const PriceComparison = ({ clothingItem, darkMode }) => {
  const [showAll, setShowAll] = useState(false);

  // Protection contre les données manquantes
  if (!clothingItem || !clothingItem.prices || !Array.isArray(clothingItem.prices) || clothingItem.prices.length === 0) {
    return (
      <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-6 text-center`}>
        <div className="text-4xl mb-3">💰</div>
        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
          Comparaison des prix
        </h4>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Analysez un vêtement pour voir les comparaisons de prix
        </p>
      </div>
    );
  }

  const sortedPrices = clothingItem.prices.sort((a, b) => a.price - b.price);
  const displayedPrices = showAll ? sortedPrices : sortedPrices.slice(0, 3);
  const cheapestPrice = sortedPrices[0];
  const mostExpensive = sortedPrices[sortedPrices.length - 1];
  const savings = mostExpensive.price - cheapestPrice.price;

  return (
    <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            {clothingItem.name}
          </h4>
          <div className="flex gap-2 mt-1">
            {clothingItem.colors.slice(0, 3).map((color, idx) => (
              <div
                key={idx}
                className="w-4 h-4 rounded-full border-2 border-gray-300"
                style={{ 
                  backgroundColor: color === 'blanc' ? '#ffffff' : 
                                  color === 'noir' ? '#000000' : 
                                  color === 'rouge' ? '#ef4444' : 
                                  color === 'bleu' ? '#3b82f6' : '#6b7280' 
                }}
              />
            ))}
          </div>
        </div>
        
        {savings > 0 && (
          <div className="text-right">
            <p className="text-green-500 font-bold">-{savings.toFixed(2)}€</p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              vs le plus cher
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {displayedPrices.map((price, idx) => (
          <div 
            key={idx}
            className={`flex justify-between items-center p-3 rounded-xl ${
              idx === 0 
                ? darkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'
                : darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg flex items-center justify-center`}>
                <span className="text-xs font-bold">
                  {price.store.charAt(0)}
                </span>
              </div>
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                  {price.store}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span 
                        key={i}
                        className={`text-xs ${i < Math.floor(price.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({price.rating})
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className={`font-bold ${idx === 0 ? 'text-green-600' : darkMode ? 'text-white' : 'text-black'}`}>
                {price.price.toFixed(2)}€
              </p>
              <p className={`text-xs ${
                price.availability === 'En stock' 
                  ? 'text-green-500' 
                  : price.availability === 'Stock limité'
                    ? 'text-orange-500'
                    : 'text-red-500'
              }`}>
                {price.availability}
              </p>
            </div>
          </div>
        ))}
      </div>

      {sortedPrices.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`w-full mt-3 py-2 ${darkMode ? 'text-red-400 hover:text-blue-300' : 'text-red-600 hover:text-red-500'} text-sm font-medium`}
        >
          {showAll ? 'Voir moins' : `Voir ${sortedPrices.length - 3} autres magasins`}
        </button>
      )}
    </div>
  );
};

export default PriceComparison;