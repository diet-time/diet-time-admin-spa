import { LocalFireDepartmentOutlined, NoFoodOutlined, SetMealOutlined, SpaOutlined } from '@mui/icons-material';
import { Box, Checkbox, Grid, Slider, Stack, Typography } from '@mui/material';
import { useController, type Control } from 'react-hook-form';
import type { ReactNode } from 'react';
import type { MealFormValues } from '../schemas/mealSchema';

interface DietaryTileProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
  tone?: 'green' | 'amber';
}

function DietaryTile({ label, description, checked, onChange, icon, tone = 'green' }: DietaryTileProps) {
  const color = tone === 'amber' ? '#B45309' : '#00674E';
  const background = tone === 'amber' ? '#FFF7ED' : '#EFF8F4';

  return <Box
    component="label"
    sx={{ height: '100%', minHeight: 108, p: 2, borderRadius: 2.5, border: '1px solid', borderColor: checked ? color : 'divider', bgcolor: checked ? background : 'background.paper', display: 'flex', alignItems: 'flex-start', gap: 1.5, cursor: 'pointer', transition: 'border-color .18s, background-color .18s, box-shadow .18s', boxShadow: checked ? `0 0 0 2px ${color}14` : 'none', '&:hover': { borderColor: color, bgcolor: checked ? background : 'background.default' }, '&:focus-within': { boxShadow: `0 0 0 3px ${color}24` } }}
  >
    <Box sx={{ width: 38, height: 38, flex: '0 0 auto', borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: checked ? color : 'background.default', color: checked ? 'common.white' : color, transition: 'background-color .18s, color .18s' }}>
      {icon}
    </Box>
    <Box flex={1}>
      <Typography fontWeight={800}>{label}</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.25}>{description}</Typography>
    </Box>
    <Checkbox checked={checked} onChange={(_, value) => onChange(value)} inputProps={{ 'aria-label': label }} sx={{ p: 0.25, color }} />
  </Box>;
}

const spiceMarks = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 3, label: 'Medium' },
  { value: 5, label: 'Hot' },
];

export function DietaryEditor({ control }: { control: Control<MealFormValues> }) {
  const vegetarian = useController({ control, name: 'dietary.vegetarian' });
  const vegan = useController({ control, name: 'dietary.vegan' });
  const glutenFree = useController({ control, name: 'dietary.glutenFree' });
  const dairyFree = useController({ control, name: 'dietary.dairyFree' });
  const nutFree = useController({ control, name: 'dietary.nutFree' });
  const spicy = useController({ control, name: 'dietary.spicy' });
  const spiceLevel = useController({ control, name: 'dietary.spiceLevel' });

  const setVegetarian = (checked: boolean) => {
    vegetarian.field.onChange(checked);
    if (!checked && vegan.field.value) vegan.field.onChange(false);
  };

  const setVegan = (checked: boolean) => {
    vegan.field.onChange(checked);
    if (checked) vegetarian.field.onChange(true);
  };

  const setSpicy = (checked: boolean) => {
    spicy.field.onChange(checked);
    if (!checked) spiceLevel.field.onChange(0);
  };

  return <Stack spacing={3}>
    <Box>
      <Typography variant="h2">Dietary attributes</Typography>
      <Typography color="text.secondary" mt={0.5}>Select every attribute that accurately applies to this meal.</Typography>
    </Box>

    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, sm: 6, xl: 4 }}><DietaryTile label="Vegetarian" description="Contains no meat or fish" checked={vegetarian.field.value} onChange={setVegetarian} icon={<SpaOutlined />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 4 }}><DietaryTile label="Vegan" description="Contains no animal products" checked={vegan.field.value} onChange={setVegan} icon={<SpaOutlined />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 4 }}><DietaryTile label="Gluten-free" description="Prepared without gluten ingredients" checked={glutenFree.field.value} onChange={glutenFree.field.onChange} icon={<SetMealOutlined />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 4 }}><DietaryTile label="Dairy-free" description="Contains no milk-based ingredients" checked={dairyFree.field.value} onChange={dairyFree.field.onChange} icon={<NoFoodOutlined />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 4 }}><DietaryTile label="Nut-free" description="Contains no declared nut ingredients" checked={nutFree.field.value} onChange={nutFree.field.onChange} icon={<NoFoodOutlined />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, xl: 4 }}><DietaryTile label="Spicy" description="Has noticeable chilli heat" checked={spicy.field.value} onChange={setSpicy} icon={<LocalFireDepartmentOutlined />} tone="amber" /></Grid>
    </Grid>

    {spicy.field.value && <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5, bgcolor: '#FFF7ED', border: '1px solid', borderColor: 'rgba(180,83,9,.28)' }}>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <LocalFireDepartmentOutlined sx={{ color: '#B45309' }} />
        <Box>
          <Typography variant="h3">Spice intensity</Typography>
          <Typography variant="body2" color="text.secondary">Choose the closest heat level customers can expect.</Typography>
        </Box>
      </Stack>
      <Box px={{ xs: 1, sm: 2 }} pb={1}>
        <Slider
          value={spiceLevel.field.value}
          onChange={(_, value) => spiceLevel.field.onChange(value)}
          min={0}
          max={5}
          step={1}
          marks={spiceMarks}
          valueLabelDisplay="on"
          aria-label="Spice intensity"
          sx={{ color: '#B45309' }}
        />
      </Box>
    </Box>}
  </Stack>;
}
