import { describe, expect, it } from 'vitest';
import { defaultMealValues } from './mealSchema';
import { getMealPublishIssues } from './mealPublishValidation';

const publishableMeal = () => ({
  ...defaultMealValues,
  translations: { en: { name: 'Chicken bowl' }, ar: { name: 'وعاء الدجاج' } },
  nutrition: { ...defaultMealValues.nutrition, calories: 450 },
  ingredients: [{
    ingredientId: 'ingredient-1',
    isOptional: false,
    canBeRemoved: false,
    canBeReplaced: false,
    isPrimaryIngredient: true,
    displayOrder: 0,
  }],
  allergenReviewConfirmed: true,
});

describe('getMealPublishIssues', () => {
  it('returns all publication requirements that are missing', () => {
    expect(getMealPublishIssues(defaultMealValues, { hasImage: false })).toEqual([
      'Add an Arabic meal name.',
      'Enter calories greater than zero.',
      'Select at least one ingredient.',
      'Confirm that the allergen information has been reviewed.',
      'Upload at least one meal image.',
    ]);
  });

  it('allows a complete meal to be published', () => {
    expect(getMealPublishIssues(publishableMeal(), { hasImage: true })).toEqual([]);
  });
});
