export const analyzeClothingImage = async (imageFile) => {
  // Simulation d'analyse IA d'image
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simule une détection aléatoire de vêtements
      const detectedItems = [
        {
          id: 'detected-1',
          category: Math.random() > 0.5 ? 'haut' : 'pantalon',
          confidence: 0.85 + Math.random() * 0.15,
          color: ['bleu', 'noir', 'blanc', 'rouge'][Math.floor(Math.random() * 4)],
          boundingBox: {
            x: Math.random() * 50,
            y: Math.random() * 50,
            width: 40 + Math.random() * 30,
            height: 50 + Math.random() * 30
          }
        }
      ];
      
      resolve({
        success: true,
        items: detectedItems,
        imageUrl: URL.createObjectURL(imageFile)
      });
    }, 2000);
  });
};

export const findSimilarClothing = (detectedItem, clothingDatabase) => {
  return clothingDatabase.filter(item => 
    item.category === detectedItem.category
  ).map(item => ({
    ...item,
    similarity: 0.7 + Math.random() * 0.3
  })).sort((a, b) => b.similarity - a.similarity);
};