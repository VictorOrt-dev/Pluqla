import React from 'react';
import PriceComparison from './PriceComparison';

const ClothingResults = ({ analysisResult, darkMode }) => {
  if (!analysisResult || !analysisResult.items.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="relative">
       <img 
  src={analysisResult.imageUrl} 
  alt="Vêtement soumis pour analyse"
  className="w-full h-64 object-cover rounded-2xl"
/>
        
        {analysisResult.items.map((item, index) => (
          <div
            key={index}
            className="absolute border-2 border-blue-500 bg-blue-500/20 rounded"
            style={{
              left: `${item.boundingBox.x}%`,
              top: `${item.boundingBox.y}%`,
              width: `${item.boundingBox.width}%`,
              height: `${item.boundingBox.height}%`
            }}
          >
            <div className="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs">
              {item.category} ({Math.round(item.confidence * 100)}%)
            </div>
          </div>
        ))}
      </div>

      {analysisResult.items.map((item, index) => (
        <div key={index} className="space-y-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)} similaire
          </h3>
          
          <div className="space-y-3">
            {item.suggestions.slice(0, 3).map((suggestion, idx) => (
              <PriceComparison 
                key={idx}
                clothingItem={suggestion}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClothingResults;
