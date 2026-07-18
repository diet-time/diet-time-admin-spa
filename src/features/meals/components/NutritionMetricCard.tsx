import { Box, Typography } from '@mui/material';
import { nutritionVisuals, type NutritionMetricKey } from './nutritionVisuals';

export function NutritionMetricCard({ metric, value, label, unit }: { metric: string; value: unknown; label?: string; unit?: string }) {
  const visual = nutritionVisuals[metric as NutritionMetricKey] ?? nutritionVisuals.servingUnit;
  const displayValue = value === undefined || value === null || value === '' ? '—' : String(value);
  const displayUnit = unit ?? visual.unit;

  return <Box sx={{ height: '100%', minHeight: 92, p: 2, borderRadius: 2.5, bgcolor: visual.background, border: '1px solid', borderColor: `${visual.color}26`, borderInlineStart: `5px solid ${visual.color}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <Typography sx={{ color: visual.color, fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.2 }}>
      {displayValue}{displayUnit ? <Box component="span" sx={{ ml: 0.35, fontSize: '0.8rem', fontWeight: 700 }}>{displayUnit}</Box> : null}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>
      {label ?? visual.label}
    </Typography>
  </Box>;
}
