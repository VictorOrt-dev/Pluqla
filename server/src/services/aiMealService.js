/**
 * AI Meal Service
 *
 * Handles AI-powered meal suggestions with multi-provider support
 * Generates meal suggestions with ingredients, recipes, costs, and cooking times
 *
 * Features:
 * - Multi-provider support (OpenAI, Claude, Gemini)
 * - Prompt engineering for structured meal suggestions
 * - Response validation and parsing
 * - Token usage tracking
 * - Error handling and fallbacks
 */

const logger = require('../utils/logger');

// AI Provider clients (lazy loaded)
let openaiClient = null;
let anthropicClient = null;

/**
 * Initialize OpenAI client
 */
function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    const { OpenAI } = require('openai');
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}

/**
 * Initialize Anthropic client
 */
function getAnthropicClient() {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropicClient;
}

/**
 * Build meal suggestion prompt
 * @param {Object} requestData - Request parameters
 * @returns {string} Formatted prompt
 */
function buildMealSuggestionPrompt(requestData) {
  const {
    mealType = 'any',
    dietaryRestrictions = [],
    budget = null,
    servings = 2,
    cuisineType = null,
    maxCookingTime = null,
    skillLevel = null,
    avoidIngredients = [],
    preferredIngredients = []
  } = requestData;

  let prompt = `Generate 3-5 meal suggestions in JSON format. Each meal should include:
- name: string (meal name)
- description: string (brief description)
- ingredients: array of objects with {item: string, quantity: string, estimatedCostEur: number}
- recipe: array of strings (step-by-step instructions)
- totalCostEur: number (total estimated cost)
- cookingTimeMin: number (total cooking time in minutes)
- servings: number
- difficulty: string (easy, medium, hard)
- cuisineType: string
- nutritionInfo: object with {calories: number, protein: number, carbs: number, fat: number}

Requirements:
- Meal type: ${mealType}
- Servings: ${servings}`;

  if (dietaryRestrictions.length > 0) {
    prompt += `\n- Dietary restrictions: ${dietaryRestrictions.join(', ')}`;
  }

  if (budget !== null) {
    prompt += `\n- Maximum budget per meal: €${budget}`;
  }

  if (cuisineType) {
    prompt += `\n- Cuisine type: ${cuisineType}`;
  }

  if (maxCookingTime) {
    prompt += `\n- Maximum cooking time: ${maxCookingTime} minutes`;
  }

  if (skillLevel) {
    prompt += `\n- Skill level: ${skillLevel}`;
  }

  if (avoidIngredients.length > 0) {
    prompt += `\n- Ingredients to avoid: ${avoidIngredients.join(', ')}`;
  }

  if (preferredIngredients.length > 0) {
    prompt += `\n- Preferred ingredients: ${preferredIngredients.join(', ')}`;
  }

  prompt += `\n\nIMPORTANT: Return ONLY a valid JSON object with this structure:
{
  "meals": [
    {
      "name": "Meal Name",
      "description": "Brief description",
      "ingredients": [
        {"item": "ingredient", "quantity": "amount", "estimatedCostEur": 2.50}
      ],
      "recipe": ["Step 1", "Step 2", ...],
      "totalCostEur": 10.00,
      "cookingTimeMin": 30,
      "servings": 2,
      "difficulty": "easy",
      "cuisineType": "Italian",
      "nutritionInfo": {
        "calories": 500,
        "protein": 25,
        "carbs": 50,
        "fat": 15
      }
    }
  ]
}

Ensure all cost estimates are realistic for European markets. Do not include any text outside the JSON object.`;

  return prompt;
}

/**
 * Parse and validate AI response
 * @param {string} response - Raw AI response
 * @returns {Array} Parsed and validated meals
 */
function parseAndValidateMealResponse(response) {
  try {
    // Clean response (remove markdown code blocks if present)
    let cleanedResponse = response.trim();

    // Remove markdown code blocks
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    // Parse JSON
    const parsed = JSON.parse(cleanedResponse);

    // Validate structure
    if (!parsed.meals || !Array.isArray(parsed.meals)) {
      throw new Error('Invalid response structure: missing meals array');
    }

    // Validate each meal
    const validatedMeals = parsed.meals.map((meal, index) => {
      if (!meal.name || typeof meal.name !== 'string') {
        throw new Error(`Meal ${index}: missing or invalid name`);
      }

      if (!meal.ingredients || !Array.isArray(meal.ingredients)) {
        throw new Error(`Meal ${index}: missing or invalid ingredients`);
      }

      if (!meal.recipe || !Array.isArray(meal.recipe)) {
        throw new Error(`Meal ${index}: missing or invalid recipe`);
      }

      if (typeof meal.totalCostEur !== 'number' || meal.totalCostEur < 0) {
        throw new Error(`Meal ${index}: invalid total cost`);
      }

      if (typeof meal.cookingTimeMin !== 'number' || meal.cookingTimeMin < 0) {
        throw new Error(`Meal ${index}: invalid cooking time`);
      }

      // Return validated meal with defaults
      return {
        name: meal.name.trim().substring(0, 200),
        description: (meal.description || '').trim().substring(0, 500),
        ingredients: meal.ingredients.map(ing => ({
          item: (ing.item || '').trim().substring(0, 100),
          quantity: (ing.quantity || '').trim().substring(0, 50),
          estimatedCostEur: typeof ing.estimatedCostEur === 'number' ?
            Math.max(0, Math.min(100, ing.estimatedCostEur)) : 0
        })),
        recipe: meal.recipe.map(step =>
          (typeof step === 'string' ? step : String(step)).trim().substring(0, 500)
        ),
        totalCostEur: Math.max(0, Math.min(200, meal.totalCostEur)),
        cookingTimeMin: Math.max(1, Math.min(500, meal.cookingTimeMin)),
        servings: typeof meal.servings === 'number' ? meal.servings : 2,
        difficulty: meal.difficulty || 'medium',
        cuisineType: meal.cuisineType || 'International',
        nutritionInfo: {
          calories: meal.nutritionInfo?.calories || 0,
          protein: meal.nutritionInfo?.protein || 0,
          carbs: meal.nutritionInfo?.carbs || 0,
          fat: meal.nutritionInfo?.fat || 0
        }
      };
    });

    return validatedMeals;
  } catch (error) {
    logger.error('Failed to parse meal response', {
      error: error.message,
      responsePreview: response.substring(0, 200)
    });
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Generate meal suggestions using OpenAI
 * @param {Object} requestData - Request parameters
 * @returns {Promise<Object>} Generated meals with metadata
 */
async function generateMealsWithOpenAI(requestData) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error('OpenAI client not initialized. Missing API key.');
  }

  const prompt = buildMealSuggestionPrompt(requestData);
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  logger.info('Generating meals with OpenAI', {
    model,
    mealType: requestData.mealType
  });

  const startTime = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional chef and nutritionist. Generate meal suggestions in valid JSON format only. Be precise with cost estimates for European markets.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' } // Force JSON response
    });

    const processingTimeMs = Date.now() - startTime;
    const response = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    logger.info('OpenAI meal generation completed', {
      processingTimeMs,
      tokensUsed,
      model
    });

    // Parse and validate response
    const meals = parseAndValidateMealResponse(response);

    return {
      meals,
      aiProvider: 'openai',
      model,
      tokensUsed,
      processingTimeMs
    };

  } catch (error) {
    logger.error('OpenAI meal generation failed', {
      error: error.message,
      model
    });
    throw error;
  }
}

/**
 * Generate meal suggestions using Claude (Anthropic)
 * @param {Object} requestData - Request parameters
 * @returns {Promise<Object>} Generated meals with metadata
 */
async function generateMealsWithClaude(requestData) {
  const client = getAnthropicClient();

  if (!client) {
    throw new Error('Anthropic client not initialized. Missing API key.');
  }

  const prompt = buildMealSuggestionPrompt(requestData);
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  logger.info('Generating meals with Claude', {
    model,
    mealType: requestData.mealType
  });

  const startTime = Date.now();

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 3000,
      temperature: 0.7,
      system: 'You are a professional chef and nutritionist. Generate meal suggestions in valid JSON format only. Be precise with cost estimates for European markets.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const processingTimeMs = Date.now() - startTime;
    const response = message.content[0].text;
    const tokensUsed = message.usage?.input_tokens + message.usage?.output_tokens || 0;

    logger.info('Claude meal generation completed', {
      processingTimeMs,
      tokensUsed,
      model
    });

    // Parse and validate response
    const meals = parseAndValidateMealResponse(response);

    return {
      meals,
      aiProvider: 'anthropic',
      model,
      tokensUsed,
      processingTimeMs
    };

  } catch (error) {
    logger.error('Claude meal generation failed', {
      error: error.message,
      model
    });
    throw error;
  }
}

/**
 * Generate meal suggestions (auto-selects provider)
 * @param {Object} requestData - Request parameters
 * @returns {Promise<Object>} Generated meals with metadata
 */
async function generateMealSuggestions(requestData) {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

  logger.info('Generating meal suggestions', {
    provider,
    mealType: requestData.mealType,
    servings: requestData.servings
  });

  try {
    let result;

    switch (provider) {
      case 'openai':
        result = await generateMealsWithOpenAI(requestData);
        break;

      case 'anthropic':
      case 'claude':
        result = await generateMealsWithClaude(requestData);
        break;

      case 'mock':
        // Mock provider for testing
        result = generateMockMeals(requestData);
        break;

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Calculate statistics
    const totalMeals = result.meals.length;
    const avgCost = totalMeals > 0
      ? result.meals.reduce((sum, meal) => sum + meal.totalCostEur, 0) / totalMeals
      : 0;
    const avgCookingTime = totalMeals > 0
      ? Math.round(result.meals.reduce((sum, meal) => sum + meal.cookingTimeMin, 0) / totalMeals)
      : 0;

    return {
      ...result,
      totalMeals,
      avgCostEur: Math.round(avgCost * 100) / 100,
      avgCookingTimeMin: avgCookingTime
    };

  } catch (error) {
    logger.error('Failed to generate meal suggestions', {
      provider,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate mock meal suggestions for testing
 * @param {Object} requestData - Request parameters
 * @returns {Object} Mock meal data
 */
function generateMockMeals(requestData) {
  const { mealType = 'any', servings = 2, budget = 15 } = requestData;

  const mockMeals = [
    {
      name: `Mock ${mealType || 'Meal'} 1`,
      description: 'A delicious and healthy mock meal for testing',
      ingredients: [
        { item: 'Mock Ingredient 1', quantity: '200g', estimatedCostEur: 3.00 },
        { item: 'Mock Ingredient 2', quantity: '100g', estimatedCostEur: 2.00 }
      ],
      recipe: [
        'Prepare mock ingredients',
        'Cook mock meal',
        'Serve and enjoy'
      ],
      totalCostEur: Math.min(budget || 10, 12.00),
      cookingTimeMin: 25,
      servings: servings || 2,
      difficulty: 'easy',
      cuisineType: 'International',
      nutritionInfo: {
        calories: 450,
        protein: 20,
        carbs: 45,
        fat: 12
      }
    },
    {
      name: `Mock ${mealType || 'Meal'} 2`,
      description: 'Another great mock meal option',
      ingredients: [
        { item: 'Mock Ingredient 3', quantity: '150g', estimatedCostEur: 2.50 },
        { item: 'Mock Ingredient 4', quantity: '80g', estimatedCostEur: 1.50 }
      ],
      recipe: [
        'Start with mock prep',
        'Continue cooking',
        'Finish and plate'
      ],
      totalCostEur: Math.min(budget || 10, 10.00),
      cookingTimeMin: 20,
      servings: servings || 2,
      difficulty: 'medium',
      cuisineType: 'Mediterranean',
      nutritionInfo: {
        calories: 380,
        protein: 18,
        carbs: 40,
        fat: 10
      }
    },
    {
      name: `Mock ${mealType || 'Meal'} 3`,
      description: 'Quick and easy mock meal',
      ingredients: [
        { item: 'Mock Ingredient 5', quantity: '100g', estimatedCostEur: 1.80 },
        { item: 'Mock Ingredient 6', quantity: '50g', estimatedCostEur: 0.80 }
      ],
      recipe: [
        'Quick preparation',
        'Fast cooking',
        'Ready to serve'
      ],
      totalCostEur: Math.min(budget || 10, 8.00),
      cookingTimeMin: 15,
      servings: servings || 2,
      difficulty: 'easy',
      cuisineType: 'Asian',
      nutritionInfo: {
        calories: 320,
        protein: 15,
        carbs: 35,
        fat: 8
      }
    }
  ];

  return {
    meals: mockMeals,
    aiProvider: 'mock',
    model: 'mock-v1',
    tokensUsed: 0,
    processingTimeMs: 500,
    totalMeals: 3,
    avgCostEur: 10.00,
    avgCookingTimeMin: 20
  };
}

module.exports = {
  generateMealSuggestions,
  generateMealsWithOpenAI,
  generateMealsWithClaude,
  generateMockMeals,
  buildMealSuggestionPrompt,
  parseAndValidateMealResponse
};
