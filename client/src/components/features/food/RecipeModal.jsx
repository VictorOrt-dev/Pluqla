import React from 'react';
import RecipeDetail from './RecipeDetail';

const RecipeModal = ({ isOpen, recipe, darkMode, onClose, onMarkAsCooked }) => {
  if (!isOpen || !recipe) return null;

  return (
    <RecipeDetail
      recipe={recipe}
      darkMode={darkMode}
      onClose={onClose}
      onMarkAsCooked={onMarkAsCooked}
    />
  );
};

export default RecipeModal;