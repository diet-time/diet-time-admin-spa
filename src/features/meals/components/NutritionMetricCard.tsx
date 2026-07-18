import { Box, Typography } from '@mui/material';
import { nutritionVisuals, type NutritionMetricKey } from './nutritionVisuals';

export function NutritionMetricCard({ metric, value, label, unit }: { metric: string; value: unknown; label?: string; unit?: string }) {
  const visual = nutritionVisuals[metric as NutritionMetricKey] ?? nutritionVisuals.servingUnit;
  const displayValue = value === undefined || value === null || value === '' ? '—' : String(value);
  const displayUnit = unit ?? visual.unit;

  return <Box sx={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: 108, p: 2, borderRadius: 2.5, background: `linear-gradient(135deg, ${visual.background} 0%, #fff 145%)`, border: '1px solid', borderColor: `${visual.color}45`, boxShadow: `0 6px 18px ${visual.color}12`, display: 'flex', flexDirection: 'column', justifyContent: 'center', '&::before': { content: '""', position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 6, bgcolor: visual.color } }}>
    <Typography sx={{ color: visual.color, fontWeight: 900, fontSize: { xs: '1.35rem', sm: '1.55rem' }, lineHeight: 1.15 }}>
      {displayValue}{displayUnit ? <Box component="span" sx={{ ml: 0.35, fontSize: '0.8rem', fontWeight: 700 }}>{displayUnit}</Box> : null}
    </Typography>
    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>
      {label ?? visual.label}
    </Typography>
  </Box>;
}
