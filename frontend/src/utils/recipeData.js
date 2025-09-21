import recipesData from '../data/recipes.json';

export const getRecipes = () => {
  return recipesData;
};

export const getRecipeById = (id) => {
  return recipesData.find(recipe => recipe.id === id);
};

export const filterRecipesByCategory = (category) => {
  return recipesData.filter(recipe => recipe.category === category);
};

export const filterRecipesByPrice = (maxPrice) => {
  return recipesData.filter(recipe => recipe.price <= maxPrice);
};

export const searchRecipes = (query) => {
  const searchTerm = query.toLowerCase();
  return recipesData.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
    recipe.ingredients.some(ingredient => 
      ingredient.name.toLowerCase().includes(searchTerm)
    )
  );
};

export const calculateRecipeCostPerServing = (recipe) => {
  return (recipe.price / recipe.servings).toFixed(2);
};