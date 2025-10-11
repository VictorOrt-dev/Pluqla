import React, { useRef, useState } from 'react';
import { usePhotoMatch } from '../../../hooks/usePhotoMatch';

const ClothingAnalyzer = ({ darkMode, onResults }) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const { loading: isAnalyzing, result: analysisResult, error, progress, quota, submitPhoto } = usePhotoMatch();

  const handleFileSelect = async (file) => {
    if (file && file.type.startsWith('image/')) {
      try {
        const result = await submitPhoto(file, {
          category: 'clothing',
          source: 'habits_screen'
        });
        if (onResults) {
          onResults(result);
        }
      } catch (err) {
        console.error('Photo match error:', err);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          dragOver 
            ? 'border-red-500 bg-red-500/10' 
            : darkMode 
              ? 'border-gray-700 hover:border-gray-600' 
              : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
        
        {isAnalyzing ? (
          <div className="space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full mx-auto"></div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Analyse IA en cours... {Math.round(progress)}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📸</div>
            <div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                Analyser un vêtement
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Glissez une photo ou cliquez pour sélectionner
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                JPG
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                PNG
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                WEBP
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {analysisResult && (
        <div className={`p-4 ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-xl`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
            ✅ Analyse terminée avec succès
          </p>
          {analysisResult.matchData && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
              {analysisResult.matchType} • Score: {Math.round(analysisResult.matchScore * 100)}%
            </p>
          )}
        </div>
      )}

      {quota && (
        <div className={`px-3 py-2 rounded-lg text-xs ${
          quota.remaining > quota.limit * 0.5
            ? 'bg-green-100 text-green-700'
            : quota.remaining > 0
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        }`}>
          <span className="font-semibold">Quota IA:</span> {quota.remaining}/{quota.limit} analyses restantes
        </div>
      )}
    </div>
  );
};

export default ClothingAnalyzer;