/**
 * Common meals list that can be easily added to a family's meal library
 */

export const COMMON_MEALS = [
  // American Classics
  { name: 'Tacos', category: 'Mexican' },
  { name: 'Spaghetti & Meatballs', category: 'Italian' },
  { name: 'Mac & Cheese', category: 'Comfort Food' },
  { name: 'Burgers', category: 'American' },
  { name: 'Hot Dogs', category: 'American' },
  { name: 'Pizza', category: 'Italian' },
  { name: 'Grilled Cheese & Soup', category: 'Comfort Food' },

  // Chicken Dishes
  { name: 'Chicken Nuggets', category: 'American' },
  { name: 'Chicken Parmesan', category: 'Italian' },
  { name: 'Chicken Stir Fry', category: 'Asian' },
  { name: 'Baked Chicken', category: 'American' },
  { name: 'Chicken Tenders', category: 'American' },
  { name: 'Chicken Fajitas', category: 'Mexican' },
  { name: 'BBQ Chicken', category: 'American' },
  { name: 'Chicken Alfredo', category: 'Italian' },

  // Pasta Dishes
  { name: 'Lasagna', category: 'Italian' },
  { name: 'Fettuccine Alfredo', category: 'Italian' },
  { name: 'Pasta Primavera', category: 'Italian' },
  { name: 'Baked Ziti', category: 'Italian' },
  { name: 'Spaghetti Carbonara', category: 'Italian' },

  // Mexican/Tex-Mex
  { name: 'Quesadillas', category: 'Mexican' },
  { name: 'Burritos', category: 'Mexican' },
  { name: 'Enchiladas', category: 'Mexican' },
  { name: 'Nachos', category: 'Mexican' },
  { name: 'Taco Salad', category: 'Mexican' },

  // Asian
  { name: 'Fried Rice', category: 'Asian' },
  { name: 'Lo Mein', category: 'Asian' },
  { name: 'Teriyaki Chicken', category: 'Asian' },
  { name: 'Orange Chicken', category: 'Asian' },
  { name: 'Pad Thai', category: 'Asian' },
  { name: 'Sushi', category: 'Asian' },

  // Seafood
  { name: 'Fish Sticks', category: 'Seafood' },
  { name: 'Salmon', category: 'Seafood' },
  { name: 'Fish Tacos', category: 'Seafood' },
  { name: 'Shrimp Scampi', category: 'Seafood' },
  { name: 'Tuna Casserole', category: 'Seafood' },

  // Beef/Pork
  { name: 'Meatloaf', category: 'Comfort Food' },
  { name: 'Pot Roast', category: 'Comfort Food' },
  { name: 'Beef Stew', category: 'Comfort Food' },
  { name: 'Pork Chops', category: 'American' },
  { name: 'Pulled Pork', category: 'American' },
  { name: 'Meatballs', category: 'Italian' },
  { name: 'Shepherd\'s Pie', category: 'Comfort Food' },

  // Breakfast for Dinner
  { name: 'Pancakes', category: 'Breakfast' },
  { name: 'French Toast', category: 'Breakfast' },
  { name: 'Breakfast Burritos', category: 'Breakfast' },
  { name: 'Eggs & Bacon', category: 'Breakfast' },

  // Soups & Salads
  { name: 'Chicken Noodle Soup', category: 'Soup' },
  { name: 'Chili', category: 'Soup' },
  { name: 'Tomato Soup', category: 'Soup' },
  { name: 'Caesar Salad', category: 'Salad' },
  { name: 'Cobb Salad', category: 'Salad' },

  // Sandwiches
  { name: 'BLT', category: 'Sandwich' },
  { name: 'Club Sandwich', category: 'Sandwich' },
  { name: 'Philly Cheesesteak', category: 'Sandwich' },
  { name: 'Sloppy Joes', category: 'Sandwich' },
  { name: 'Pulled Pork Sandwich', category: 'Sandwich' },

  // Vegetarian
  { name: 'Veggie Stir Fry', category: 'Vegetarian' },
  { name: 'Vegetable Soup', category: 'Vegetarian' },
  { name: 'Veggie Burgers', category: 'Vegetarian' },
  { name: 'Cheese Pizza', category: 'Vegetarian' },

  // Other
  { name: 'Leftovers', category: 'Other' },
  { name: 'Takeout', category: 'Other' },
  { name: 'Frozen Dinner', category: 'Other' },
];

/**
 * Get meals by category
 */
export const getMealsByCategory = () => {
  const categorized = {};

  COMMON_MEALS.forEach(meal => {
    if (!categorized[meal.category]) {
      categorized[meal.category] = [];
    }
    categorized[meal.category].push(meal);
  });

  return categorized;
};

/**
 * Get all unique categories
 */
export const getCategories = () => {
  return [...new Set(COMMON_MEALS.map(meal => meal.category))].sort();
};

/**
 * Search meals by name
 */
export const searchMeals = (query) => {
  const lowerQuery = query.toLowerCase();
  return COMMON_MEALS.filter(meal =>
    meal.name.toLowerCase().includes(lowerQuery)
  );
};
