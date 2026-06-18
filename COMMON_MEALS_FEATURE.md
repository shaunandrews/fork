# Common Meals Feature

This document describes the common meals feature that was added to the Fork app.

## Overview

Users can now browse and add from a curated list of 70+ common meals organized by category. This makes it easier for new families to quickly populate their meal library instead of manually entering each meal.

## Files Added

### 1. `/app/src/data/commonMeals.js`
- Contains `COMMON_MEALS` array with 70+ common meals
- Each meal has a `name` and `category`
- Categories include: American, Italian, Mexican, Asian, Seafood, Comfort Food, Breakfast, Soup, Salad, Sandwich, Vegetarian, Other
- Utility functions:
  - `getMealsByCategory()` - Groups meals by category
  - `getCategories()` - Returns list of all categories
  - `searchMeals(query)` - Search meals by name

### 2. `/app/src/utils/initializeCommonMeals.js`
- `addCommonMeals(familyId, user, mealNames)` - Adds selected common meals to a family's Firestore collection
- `addCommonMealsByCategory(familyId, user, categories)` - Adds all meals from specified categories
- Handles Firebase operations with proper error handling

### 3. `/app/src/screens/AddCommonMeals.jsx`
- Full-featured UI for browsing and selecting common meals
- Features:
  - Category filtering (All, American, Italian, Mexican, etc.)
  - Multi-select with visual checkboxes
  - "Select All" / "Deselect All" for current category
  - Shows count of selected meals
  - Fixed bottom button to add selected meals
  - Returns to meals screen with success message

## Integration

### Routes Added
- `/add-common-meals` - Protected route requiring family membership

### UI Updates
- **Meals Screen**: Added "Browse common meals" link below filter buttons
- **Empty State**: When no meals exist, shows link to browse common meals
- Seamless navigation between adding custom meals and selecting common meals

## How to Use

1. Navigate to the Meals screen (`/meals`)
2. Click "Browse common meals" link
3. Filter by category (optional)
4. Tap meals to select/deselect them
5. Use "Select All" to quickly select all meals in current category
6. Tap "Add X Meals" button at bottom
7. Selected meals are added to family's meal library with current user as the "added by" person

## Data Structure

When a common meal is added, it becomes a regular meal in Firestore with:
```javascript
{
  name: "Tacos",
  note: "Category: Mexican",  // Optional category label
  imageUrl: null,
  addedBy: userId,
  addedByName: userName,
  favoritedBy: [],
  createdAt: serverTimestamp()
}
```

## Future Enhancements

Potential improvements:
- Add meal images to common meals data
- Allow filtering/searching common meals by ingredients
- Track which common meals are most popular
- Allow families to suggest additions to common meals list
- Import recipes or cooking instructions with common meals
