import type { MealFormValues } from './mealSchema';

export interface MealPublishContext {
  hasImage: boolean;
}

export function getMealPublishIssues(values: MealFormValues, context: MealPublishContext): string[] {
  const issues: string[] = [];

  if (!values.translations.ar?.name?.trim()) issues.push('Add an Arabic meal name.');
  if (values.nutrition.calories <= 0) issues.push('Enter calories greater than zero.');
  if (values.ingredients.length === 0) issues.push('Select at least one ingredient.');
  if (!values.allergenReviewConfirmed) issues.push('Confirm that the allergen information has been reviewed.');
  if (!context.hasImage) issues.push('Upload at least one meal image.');

  return issues;
}
