import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material';
import { Box, ButtonBase, Card, CardContent, Chip, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { FieldErrors } from 'react-hook-form';
import type { MealFormValues } from '../schemas/mealSchema';

interface MealFormStepperProps {
  sections: readonly string[];
  activeStep: number;
  onStepChange: (step: number) => void;
  errors: FieldErrors<MealFormValues>;
}

const sectionHasError = (errors: FieldErrors<MealFormValues>, step: number) => {
  switch (step) {
    case 0: return !!(errors.sku || errors.categoryId || errors.preparationMinutes || errors.status);
    case 1: return !!errors.translations;
    case 2: return !!errors.nutrition;
    case 3: return !!errors.dietary;
    case 4: return !!(errors.ingredients || errors.allergens || errors.allergenReviewConfirmed);
    case 6: return !!errors.prices;
    case 7: return !!errors.availability;
    case 8: return Object.keys(errors).length > 0;
    default: return false;
  }
};

export function MealFormStepper({ sections, activeStep, onStepChange, errors }: MealFormStepperProps) {
  const progress = ((activeStep + 1) / sections.length) * 100;
  const errorCount = Object.keys(errors).length;

  return <>
    <Card sx={{ display: { xs: 'block', lg: 'none' } }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.25}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>MEAL SETUP</Typography>
            <Typography fontWeight={700}>Step {activeStep + 1} of {sections.length}</Typography>
          </Box>
          {errorCount > 0 && <Chip size="small" color="error" variant="outlined" label={`${errorCount} to review`} />}
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 99, mb: 2 }} />
        <TextField select fullWidth size="small" label="Current section" value={activeStep} onChange={(event) => onStepChange(Number(event.target.value))}>
          {sections.map((section, index) => <MenuItem key={section} value={index}>
            {index + 1}. {section}{sectionHasError(errors, index) ? ' — Needs attention' : ''}
          </MenuItem>)}
        </TextField>
      </CardContent>
    </Card>

    <Card sx={{ display: { xs: 'none', lg: 'block' }, position: 'sticky', top: 24, overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, pb: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={800} lineHeight={1}>MEAL SETUP</Typography>
            <Typography variant="h3" mt={0.5}>Step {activeStep + 1} of {sections.length}</Typography>
          </Box>
          {errorCount > 0 && <Chip size="small" color="error" variant="outlined" label={errorCount} aria-label={`${errorCount} sections need attention`} />}
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 7, borderRadius: 99, mt: 2 }} />
        <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>{Math.round(progress)}% through this meal</Typography>
      </Box>

      <Stack component="nav" aria-label="Meal form sections" sx={{ p: 1.25 }}>
        {sections.map((section, index) => {
          const active = index === activeStep;
          const hasError = sectionHasError(errors, index);
          const visited = index < activeStep;
          return <ButtonBase
            key={section}
            onClick={() => onStepChange(index)}
            aria-current={active ? 'step' : undefined}
            sx={{ width: '100%', minHeight: 52, px: 1.25, py: 0.75, borderRadius: 2, justifyContent: 'flex-start', textAlign: 'left', color: active ? 'primary.main' : 'text.primary', bgcolor: active ? 'rgba(0,103,78,.08)' : 'transparent', '&:hover': { bgcolor: active ? 'rgba(0,103,78,.11)' : 'action.hover' }, transition: 'background-color .18s ease' }}
          >
            <Box sx={{ width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: active ? 'common.white' : hasError ? 'error.main' : visited ? 'primary.main' : 'text.secondary', bgcolor: active ? 'primary.main' : hasError ? 'rgba(211,47,47,.08)' : visited ? 'rgba(0,103,78,.08)' : 'background.default', border: '1px solid', borderColor: active ? 'primary.main' : hasError ? 'error.light' : visited ? 'primary.light' : 'divider' }}>
              {visited && !hasError ? <CheckCircleOutline sx={{ fontSize: 18 }} /> : index + 1}
            </Box>
            <Typography variant="body2" fontWeight={active ? 800 : 600} ml={1.25} flex={1}>{section}</Typography>
            {hasError && <ErrorOutline color="error" sx={{ fontSize: 19 }} aria-label="Needs attention" />}
            {active && <Typography variant="caption" fontWeight={800} ml={0.75}>CURRENT</Typography>}
          </ButtonBase>;
        })}
      </Stack>
    </Card>
  </>;
}
