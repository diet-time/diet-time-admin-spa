import { InsightsOutlined, RestaurantOutlined, ScienceOutlined } from '@mui/icons-material';
import { Box, Chip, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { NutritionMetricCard } from './NutritionMetricCard';
import { nutritionVisuals, type NutritionMetricKey } from './nutritionVisuals';
import type { MealFormValues } from '../schemas/mealSchema';

interface NutritionEditorProps {
  register: UseFormRegister<MealFormValues>;
  nutrition: MealFormValues['nutrition'];
  errors: FieldErrors<MealFormValues>;
}

const macroFields = ['calories', 'protein', 'carbohydrates', 'fat'] as const;
const detailFields = ['saturatedFat', 'transFat', 'fibre', 'sugar', 'sodium', 'cholesterol'] as const;

function NutritionInput({ field, register, errors }: { field: NutritionMetricKey; register: UseFormRegister<MealFormValues>; errors: FieldErrors<MealFormValues> }) {
  const visual = nutritionVisuals[field];
  const error = field === 'servingUnit' ? errors.nutrition?.servingUnit : field === 'servingQuantity' ? errors.nutrition?.servingQuantity : errors.nutrition?.[field];

  return <Box sx={{ height: '100%', p: 1.5, borderRadius: 2.5, bgcolor: visual.background, border: '1px solid', borderColor: `${visual.color}40`, borderTop: `4px solid ${visual.color}`, transition: 'transform .18s, box-shadow .18s', '&:focus-within': { boxShadow: `0 6px 20px ${visual.color}20`, transform: 'translateY(-1px)' } }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
      <Typography variant="body2" fontWeight={800} sx={{ color: visual.color }}>{visual.label}</Typography>
      {visual.unit && <Chip size="small" label={visual.unit} sx={{ height: 22, bgcolor: `${visual.color}15`, color: visual.color, fontWeight: 800 }} />}
    </Stack>
    <TextField
      fullWidth
      type={field === 'servingUnit' ? 'text' : 'number'}
      aria-label={visual.label}
      {...register(`nutrition.${field}`)}
      error={!!error}
      helperText={error?.message}
      slotProps={{
        htmlInput: field === 'servingUnit' ? undefined : { min: 0, step: field === 'servingQuantity' ? 0.1 : 1 },
        input: visual.unit ? { endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight={800} sx={{ color: visual.color }}>{visual.unit}</Typography></InputAdornment> } : undefined,
      }}
      sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,.82)', '& fieldset': { borderColor: `${visual.color}38` }, '&:hover fieldset': { borderColor: visual.color }, '&.Mui-focused fieldset': { borderColor: visual.color } } }}
    />
  </Box>;
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <Stack direction="row" alignItems="center" gap={1.25}>
    <Box sx={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,103,78,.09)', color: 'primary.main' }}>{icon}</Box>
    <Box>
      <Typography variant="h3">{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Box>
  </Stack>;
}

export function NutritionEditor({ register, nutrition, errors }: NutritionEditorProps) {
  return <Stack spacing={3.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} justifyContent="space-between" gap={1}>
      <Box>
        <Typography variant="h2">Nutrition</Typography>
        <Typography color="text.secondary" mt={0.5}>Enter values for one serving. Units are shown beside each nutrient.</Typography>
      </Box>
      <Chip icon={<RestaurantOutlined />} label="Per serving" color="primary" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 800 }} />
    </Stack>

    <Grid container spacing={1.5}>
      {macroFields.map((metric) => <Grid key={metric} size={{ xs: 6, md: 3 }}><NutritionMetricCard metric={metric} value={nutrition[metric]} /></Grid>)}
    </Grid>

    <Box sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
      <SectionHeading icon={<RestaurantOutlined />} title="Serving basis" description="Define what one serving means for this meal." />
      <Grid container spacing={1.5} mt={1}>
        <Grid size={{ xs: 12, sm: 6 }}><NutritionInput field="servingQuantity" register={register} errors={errors} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><NutritionInput field="servingUnit" register={register} errors={errors} /></Grid>
      </Grid>
    </Box>

    <Box>
      <SectionHeading icon={<InsightsOutlined />} title="Core nutrients" description="The primary values customers use to compare meals." />
      <Grid container spacing={1.5} mt={1}>
        {macroFields.map((field) => <Grid key={field} size={{ xs: 12, sm: 6, xl: 3 }}><NutritionInput field={field} register={register} errors={errors} /></Grid>)}
      </Grid>
    </Box>

    <Box>
      <SectionHeading icon={<ScienceOutlined />} title="Additional nutrients" description="Optional details for a more complete nutrition profile." />
      <Grid container spacing={1.5} mt={1}>
        {detailFields.map((field) => <Grid key={field} size={{ xs: 12, sm: 6, xl: 4 }}><NutritionInput field={field} register={register} errors={errors} /></Grid>)}
      </Grid>
    </Box>
  </Stack>;
}
