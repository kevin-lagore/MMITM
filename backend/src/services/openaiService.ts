import OpenAI from 'openai';
import { env } from '../config/env.js';
import type { InterpretedIntent } from '../types/index.js';

const openai = new OpenAI({
  apiKey: env.openaiApiKey,
});

// Mapping of our categories to Foursquare category IDs
const FOURSQUARE_CATEGORY_MAP: Record<string, string> = {
  restaurant: '13065', // Restaurants
  cafe: '13032', // Coffee Shops
  coffee: '13032',
  bar: '13003', // Bars
  pub: '13003',
  park: '16032', // Parks
  beach: '16003', // Beaches
  museum: '10027', // Museums
  library: '12051', // Libraries
  gym: '18021', // Gyms
  shopping: '17000', // Shopping
  entertainment: '10000', // Arts & Entertainment
  cinema: '10024', // Movie Theaters
  theater: '10025', // Performing Arts Venues
  food: '13000', // Food
  outdoors: '16000', // Outdoors & Recreation
};

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'categorize_venue_intent',
      description: 'Categorize a user\'s meeting place intent into structured venue categories',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: [
              'restaurant',
              'cafe',
              'bar',
              'park',
              'beach',
              'museum',
              'library',
              'gym',
              'shopping',
              'entertainment',
              'cinema',
              'theater',
              'food',
              'outdoors',
              'other',
            ],
            description: 'The main category of venue the user is looking for',
          },
          subcategory: {
            type: 'string',
            description: 'A more specific subcategory if applicable (e.g., "italian" for restaurant, "hiking trail" for outdoors)',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional search keywords extracted from the intent (e.g., "dog-friendly", "quiet", "outdoor seating")',
          },
          timeOfDay: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening', 'any'],
            description: 'The implied time of day for the meeting if mentioned',
          },
        },
        required: ['category', 'keywords'],
      },
    },
  },
];

export async function interpretIntent(userIntent: string): Promise<InterpretedIntent> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that interprets user requests for meeting places.
Your job is to understand what type of venue the user is looking for and extract relevant search criteria.
Be flexible and understand common phrases like "grab a coffee", "have lunch", "go for drinks", etc.
Extract any specific requirements like "quiet", "outdoor seating", "dog-friendly", etc.`,
        },
        {
          role: 'user',
          content: userIntent,
        },
      ],
      tools,
      tool_choice: { type: 'function', function: { name: 'categorize_venue_intent' } },
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'categorize_venue_intent') {
      // Fallback if function calling fails
      return {
        category: 'restaurant',
        keywords: [userIntent],
        foursquareCategory: FOURSQUARE_CATEGORY_MAP['restaurant'],
      };
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Map to Foursquare category
    const foursquareCategory = FOURSQUARE_CATEGORY_MAP[parsed.category] || FOURSQUARE_CATEGORY_MAP['food'];

    return {
      category: parsed.category,
      subcategory: parsed.subcategory,
      keywords: parsed.keywords || [],
      foursquareCategory,
    };
  } catch (error) {
    console.error('OpenAI intent interpretation failed:', error);
    // Fallback to basic category based on keyword matching
    return fallbackInterpretation(userIntent);
  }
}

function fallbackInterpretation(intent: string): InterpretedIntent {
  const lowerIntent = intent.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    cafe: ['coffee', 'cafe', 'latte', 'espresso', 'tea'],
    bar: ['bar', 'pub', 'drinks', 'beer', 'cocktail', 'wine'],
    restaurant: ['lunch', 'dinner', 'eat', 'food', 'restaurant', 'brunch', 'breakfast'],
    park: ['park', 'outdoor', 'nature', 'walk', 'picnic'],
    beach: ['beach', 'seaside', 'coast', 'ocean'],
    gym: ['gym', 'workout', 'fitness', 'exercise'],
    cinema: ['cinema', 'movie', 'film'],
    museum: ['museum', 'gallery', 'exhibition', 'art'],
    shopping: ['shop', 'mall', 'store', 'buy'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => lowerIntent.includes(k))) {
      return {
        category,
        keywords: [intent],
        foursquareCategory: FOURSQUARE_CATEGORY_MAP[category],
      };
    }
  }

  // Default to restaurant
  return {
    category: 'restaurant',
    keywords: [intent],
    foursquareCategory: FOURSQUARE_CATEGORY_MAP['restaurant'],
  };
}
