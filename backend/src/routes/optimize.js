const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @swagger
 * /api/optimize/route:
 *   post:
 *     summary: Optimize route using AI classification and suggestions
 *     tags: [Optimization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - places
 *             properties:
 *               places:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *                     eLoc:
 *                       type: string
 *               preferences:
 *                 type: object
 *                 properties:
 *                   prioritizePopular:
 *                     type: boolean
 *                   optimizeDistance:
 *                     type: boolean
 *                   includeMeals:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Optimized route with AI suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     optimizedRoute:
 *                       type: array
 *                     suggestions:
 *                       type: array
 *                     reasoning:
 *                       type: string
 */
router.post('/route', async (req, res) => {
  try {
    const { places, preferences = {} } = req.body;

    if (!places || places.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 places are required for route optimization'
      });
    }

    // Classify and optimize places using Gemini AI
    const optimizedData = await classifyAndOptimizePlaces(places, preferences);
    
    // Calculate optimal route order
    const optimizedRoute = await calculateOptimalOrder(optimizedData.classifiedPlaces, preferences);
    
    // Generate additional suggestions based on the route
    const suggestions = await generateSuggestions(optimizedRoute, preferences);

    res.json({
      success: true,
      data: {
        optimizedRoute,
        suggestions,
        reasoning: optimizedData.reasoning,
        categories: optimizedData.categories
      }
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to optimize route'
    });
  }
});

/**
 * Classify places using Gemini AI
 */
async function classifyAndOptimizePlaces(places, preferences) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
    You are a travel planning AI. Analyze and classify the following places for an optimal trip itinerary.

    Places to analyze:
    ${places.map((place, index) => `${index + 1}. ${place.name} (Type: ${place.type || 'unknown'})`).join('\n')}

    Preferences:
    - Prioritize popular attractions: ${preferences.prioritizePopular}
    - Optimize for distance: ${preferences.optimizeDistance}
    - Include meal suggestions: ${preferences.includeMeals}

    Please provide:
    1. Classification of each place into categories (tourist_attraction, restaurant, shopping, cultural, nature, etc.)
    2. Recommended visit order based on typical travel patterns and proximity
    3. Estimated time to spend at each location
    4. Brief reasoning for the recommended order
    5. Any missing categories that would enhance the trip

    Respond in JSON format:
    {
      "classifiedPlaces": [
        {
          "id": "original_place_id",
          "name": "place_name",
          "category": "category_name",
          "recommendedDuration": minutes,
          "bestVisitTime": "morning|afternoon|evening|any",
          "priority": "high|medium|low",
          "recommendation": "brief_tip_or_insight"
        }
      ],
      "reasoning": "explanation_of_optimization_logic",
      "categories": ["list_of_identified_categories"]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean and parse JSON response
    const cleanedText = text.replace(/```json|```/g, '').trim();
    const aiResponse = JSON.parse(cleanedText);
    
    // Merge AI classifications with original place data
    const classifiedPlaces = places.map(place => {
      const aiData = aiResponse.classifiedPlaces.find(ai => 
        ai.name.toLowerCase().includes(place.name.toLowerCase()) ||
        place.name.toLowerCase().includes(ai.name.toLowerCase())
      );
      
      return {
        ...place,
        category: aiData?.category || place.type || 'location',
        recommendedDuration: aiData?.recommendedDuration || 60,
        bestVisitTime: aiData?.bestVisitTime || 'any',
        priority: aiData?.priority || 'medium',
        recommendation: aiData?.recommendation || ''
      };
    });

    return {
      classifiedPlaces,
      reasoning: aiResponse.reasoning,
      categories: aiResponse.categories
    };

  } catch (error) {
    console.error('AI classification error:', error);
    
    // Fallback classification
    return {
      classifiedPlaces: places.map(place => ({
        ...place,
        category: place.type || 'location',
        recommendedDuration: 60,
        bestVisitTime: 'any',
        priority: 'medium',
        recommendation: ''
      })),
      reasoning: 'Used fallback classification due to AI processing error',
      categories: [...new Set(places.map(p => p.type || 'location'))]
    };
  }
}

/**
 * Calculate optimal visit order
 */
async function calculateOptimalOrder(places, preferences) {
  // Simple optimization algorithm
  // In a production app, you might use more sophisticated algorithms like TSP solvers
  
  const optimized = [...places];
  
  // Sort by priority and visit time preferences
  optimized.sort((a, b) => {
    // Priority weight
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
    
    if (priorityDiff !== 0) return priorityDiff;
    
    // Time-based sorting (morning activities first, evening last)
    const timeWeight = { morning: 1, afternoon: 2, evening: 3, any: 2 };
    return (timeWeight[a.bestVisitTime] || 2) - (timeWeight[b.bestVisitTime] || 2);
  });
  
  // If optimizing for distance, try to minimize travel time
  if (preferences.optimizeDistance && optimized.length > 2) {
    // Simple nearest neighbor approach
    const reordered = [optimized[0]]; // Start with first place
    const remaining = optimized.slice(1);
    
    while (remaining.length > 0) {
      const current = reordered[reordered.length - 1];
      
      // Find nearest unvisited place
      let nearestIndex = 0;
      let minDistance = calculateDistance(current, remaining[0]);
      
      for (let i = 1; i < remaining.length; i++) {
        const distance = calculateDistance(current, remaining[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
      
      reordered.push(remaining[nearestIndex]);
      remaining.splice(nearestIndex, 1);
    }
    
    return reordered;
  }
  
  return optimized;
}

/**
 * Generate additional suggestions based on route
 */
async function generateSuggestions(route, preferences) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const categories = [...new Set(route.map(place => place.category))];
    const missingCategories = ['restaurant', 'cafe', 'shopping', 'cultural', 'nature']
      .filter(cat => !categories.includes(cat));
    
    const prompt = `
    Based on this travel itinerary, suggest 3-5 additional places to enhance the trip:

    Current itinerary:
    ${route.map((place, index) => `${index + 1}. ${place.name} (${place.category})`).join('\n')}

    Missing categories: ${missingCategories.join(', ')}
    
    Preferences:
    - Include meals: ${preferences.includeMeals}
    - Prioritize popular: ${preferences.prioritizePopular}

    Provide suggestions that would complement this itinerary. Focus on:
    1. Essential missing categories (especially restaurants if includeMeals is true)
    2. Popular attractions that would fit well
    3. Unique local experiences

    Respond in JSON format:
    {
      "suggestions": [
        {
          "name": "suggested_place_name",
          "category": "category",
          "reason": "why_this_complements_the_trip",
          "insertAfter": "place_name_to_insert_after_or_null",
          "estimatedDuration": minutes
        }
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanedText = text.replace(/```json|```/g, '').trim();
    const aiResponse = JSON.parse(cleanedText);
    
    return aiResponse.suggestions || [];

  } catch (error) {
    console.error('AI suggestions error:', error);
    
    // Fallback suggestions based on preferences
    const suggestions = [];
    
    if (preferences.includeMeals && !route.some(p => p.category === 'restaurant')) {
      suggestions.push({
        name: 'Local Restaurant',
        category: 'restaurant',
        reason: 'Meal break recommended for long itineraries',
        insertAfter: route[Math.floor(route.length / 2)]?.name || null,
        estimatedDuration: 90
      });
    }
    
    return suggestions;
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;
