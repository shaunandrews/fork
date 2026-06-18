import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COMMON_MEALS } from '../data/commonMeals';

/**
 * Add common meals to a family's meal library
 * @param {string} familyId - The family ID
 * @param {Object} user - The user adding the meals (must have id and displayName)
 * @param {string[]} mealNames - Optional array of specific meal names to add. If not provided, adds all common meals.
 * @returns {Promise<number>} Number of meals added
 */
export const addCommonMeals = async (familyId, user, mealNames = null) => {
  if (!familyId || !user?.id) {
    throw new Error('Family ID and user are required');
  }

  const mealsToAdd = mealNames
    ? COMMON_MEALS.filter(meal => mealNames.includes(meal.name))
    : COMMON_MEALS;

  const mealsRef = collection(db, 'families', familyId, 'meals');
  let addedCount = 0;

  for (const meal of mealsToAdd) {
    try {
      await addDoc(mealsRef, {
        name: meal.name,
        note: meal.category ? `Category: ${meal.category}` : null,
        imageUrl: null,
        addedBy: user.id,
        addedByName: user.displayName || 'Unknown',
        favoritedBy: [],
        createdAt: serverTimestamp(),
      });
      addedCount++;
    } catch (error) {
      console.error(`Failed to add meal "${meal.name}":`, error);
    }
  }

  return addedCount;
};

/**
 * Add common meals by category
 * @param {string} familyId - The family ID
 * @param {Object} user - The user adding the meals
 * @param {string[]} categories - Array of category names to add
 * @returns {Promise<number>} Number of meals added
 */
export const addCommonMealsByCategory = async (familyId, user, categories) => {
  const mealsToAdd = COMMON_MEALS.filter(meal =>
    categories.includes(meal.category)
  );

  const mealNames = mealsToAdd.map(meal => meal.name);
  return addCommonMeals(familyId, user, mealNames);
};
