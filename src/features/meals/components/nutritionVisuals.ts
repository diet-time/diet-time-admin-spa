export interface NutritionVisual {
  label: string;
  unit?: string;
  color: string;
  background: string;
}

export type NutritionMetricKey = 'servingQuantity' | 'servingUnit' | 'calories' | 'protein' | 'carbohydrates' | 'fat' | 'saturatedFat' | 'transFat' | 'fibre' | 'sugar' | 'sodium' | 'cholesterol';

export const nutritionVisuals: Record<NutritionMetricKey, NutritionVisual> = {
  servingQuantity: { label: 'Serving quantity', color: '#3F51B5', background: '#EEF0FF' },
  servingUnit: { label: 'Serving unit', color: '#52606D', background: '#F1F4F6' },
  calories: { label: 'Calories', unit: 'kcal', color: '#C25B16', background: '#FFF1E6' },
  protein: { label: 'Protein', unit: 'g', color: '#287D4A', background: '#E8F6ED' },
  carbohydrates: { label: 'Carbohydrates', unit: 'g', color: '#9A6A00', background: '#FFF7D6' },
  fat: { label: 'Fat', unit: 'g', color: '#7048A8', background: '#F3ECFC' },
  saturatedFat: { label: 'Saturated fat', unit: 'g', color: '#9A4874', background: '#FBEAF3' },
  transFat: { label: 'Trans fat', unit: 'g', color: '#A2485A', background: '#FDECEF' },
  fibre: { label: 'Fibre', unit: 'g', color: '#147D74', background: '#E5F7F4' },
  sugar: { label: 'Sugar', unit: 'g', color: '#B44335', background: '#FDECE9' },
  sodium: { label: 'Sodium', unit: 'mg', color: '#246AA5', background: '#E9F3FC' },
  cholesterol: { label: 'Cholesterol', unit: 'mg', color: '#5E55A5', background: '#EFEEFC' },
};

export const nutritionFieldSx = (key: NutritionMetricKey) => {
  const visual = nutritionVisuals[key];
  return {
    '& .MuiOutlinedInput-root': {
      bgcolor: visual.background,
      transition: 'box-shadow .2s, background-color .2s',
      '& fieldset': { borderColor: `${visual.color}55` },
      '&:hover fieldset': { borderColor: visual.color },
      '&.Mui-focused': { boxShadow: `0 0 0 3px ${visual.color}1F` },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: visual.color },
  };
};
