import { useState, useCallback } from 'react';
import { analyzeClothingImage, findSimilarClothing } from '../utils/imageAnalysis';
import clothingDatabase from '../data/clothing-database.json';

export const useImageAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const analyzeImage = useCallback(async (imageFile) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeClothingImage(imageFile);
      
      if (result.success) {
        // Trouver des vêtements similaires pour chaque item détecté
        const itemsWithSuggestions = result.items.map(item => ({
          ...item,
          suggestions: findSimilarClothing(item, clothingDatabase)
        }));
        
        setAnalysisResult({
          ...result,
          items: itemsWithSuggestions
        });
      } else {
        setError('Impossible d\'analyser l\'image');
      }
    } catch (err) {
      setError('Erreur lors de l\'analyse de l\'image');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    analysisResult,
    error,
    analyzeImage,
    clearResults
  };
};