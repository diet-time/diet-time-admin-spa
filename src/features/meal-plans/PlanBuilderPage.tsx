import { Add, ContentCopy, DragIndicator } from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { masterDataApi } from '@/api/masterDataApi';
import { mealsApi } from '@/api/mealsApi';
import type { MealSummary } from '@/api/apiTypes';

interface PlanOption {
  id: string;
  name: string;
  default: boolean;
}

interface Slot {
  id: string;
  mealTypeId?: string;
  title: string;
  min: number;
  max: number;
  required: boolean;
  options: PlanOption[];
}

interface Day {
  id: string;
  number: number;
  slots: Slot[];
}

const initial: Day[] = [{
  id: 'new-day-1',
  number: 1,
  slots: [{ id: 'new-slot-1', title: 'Lunch', min: 1, max: 1, required: true, options: [] }],
}];

export function PlanBuilderPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState(initial);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [mealSearch, setMealSearch] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealSummary | null>(null);
  const day = days[selectedDay];
  const slot = day?.slots[selectedSlot];

  const mealTypesQuery = useQuery({
    queryKey: ['meal-types', 'plan-builder'],
    queryFn: ({ signal }) => masterDataApi.list(
      'meal-types',
      { page: 1, pageSize: 100, sort: 'displayOrder_asc' },
      signal,
    ),
    staleTime: 5 * 60 * 1000,
  });
  const mealsQuery = useQuery({
    queryKey: ['meals', 'plan-builder', mealSearch],
    queryFn: ({ signal }) => mealsApi.list({
      page: 1,
      pageSize: 25,
      search: mealSearch.trim() || undefined,
      status: 'Active',
      available: true,
      sort: 'name_asc',
    }, signal),
    enabled: !!slot,
    staleTime: 30_000,
  });

  const mealTypes = (mealTypesQuery.data?.items ?? []).filter((mealType) => mealType.isActive);
  const meals = mealsQuery.data?.items ?? [];
  const selectedMealTypeId = slot?.mealTypeId
    ?? mealTypes.find((mealType) => mealType.nameEn === slot?.title)?.id
    ?? '';
  const issues = days.flatMap((planDay) => planDay.slots
    .filter((planSlot) => planSlot.required && planSlot.options.length < planSlot.min)
    .map((planSlot) => `Day ${planDay.number} ${planSlot.title} needs at least ${planSlot.min} active option(s).`));

  const updateSlot = (changes: Partial<Slot>) => {
    setDays((currentDays) => currentDays.map((currentDay, dayIndex) => dayIndex === selectedDay
      ? {
          ...currentDay,
          slots: currentDay.slots.map((currentSlot, slotIndex) => slotIndex === selectedSlot
            ? { ...currentSlot, ...changes }
            : currentSlot),
        }
      : currentDay));
  };

  const addDay = () => {
    setDays((currentDays) => [
      ...currentDays,
      { id: `new-day-${Date.now()}`, number: currentDays.length + 1, slots: [] },
    ]);
  };

  const addSlot = () => {
    if (!day) return;
    const firstMealType = mealTypes[0];
    setDays((currentDays) => currentDays.map((currentDay, index) => index === selectedDay
      ? {
          ...currentDay,
          slots: [...currentDay.slots, {
            id: `new-slot-${Date.now()}`,
            mealTypeId: firstMealType?.id,
            title: firstMealType?.nameEn ?? 'New slot',
            min: 1,
            max: 1,
            required: true,
            options: [],
          }],
        }
      : currentDay));
    setSelectedSlot(day.slots.length);
  };

  const addMeal = () => {
    if (!slot || !selectedMeal || slot.options.some((option) => option.id === selectedMeal.id)) return;
    updateSlot({
      options: [...slot.options, { id: selectedMeal.id, name: selectedMeal.nameEn, default: false }],
    });
    setSelectedMeal(null);
    setMealSearch('');
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h1">{planId ? 'Edit meal plan' : 'Create meal plan'}</Typography>
          <Typography color="text.secondary">Template days → meal slots → selectable meal options</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button onClick={() => navigate('/meal-plans')}>Cancel</Button>
          <Button variant="outlined">Save draft</Button>
          <Button variant="contained" disabled={issues.length > 0}>Publish</Button>
        </Stack>
      </Stack>
      {issues.length > 0 && (
        <Alert severity="error"><strong>Publishing checklist:</strong> {issues.join(' ')}</Alert>
      )}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent sx={{ p: '0 !important' }}>
          <Grid container spacing={0}>
            <Grid
              size={{ xs: 12, lg: 3 }}
              sx={{ p: { xs: 2.5, md: 3 }, borderInlineEnd: { lg: 1 }, borderBottom: { xs: 1, lg: 0 }, borderColor: 'divider', bgcolor: '#FCFDFC', minHeight: { lg: 560 } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h3">Days</Typography>
                <Button startIcon={<Add />} onClick={addDay}>Add</Button>
              </Stack>
              <List sx={{ mt: 1.5, p: 0 }}>
                {days.map((planDay, index) => (
                  <ListItemButton
                    key={planDay.id}
                    selected={index === selectedDay}
                    onClick={() => { setSelectedDay(index); setSelectedSlot(0); setSelectedMeal(null); }}
                    sx={{ mb: 1, borderRadius: 2, border: 1, borderColor: index === selectedDay ? 'rgba(0,103,78,.18)' : 'transparent', '&.Mui-selected': { bgcolor: 'rgba(0,103,78,.08)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(0,103,78,.11)' } }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}><DragIndicator /></ListItemIcon>
                    <ListItemText primary={`Day ${planDay.number}`} secondary={`${planDay.slots.length} slots`} />
                    <ContentCopy fontSize="small" color="action" />
                  </ListItemButton>
                ))}
              </List>
            </Grid>
            <Grid
              size={{ xs: 12, lg: 4 }}
              sx={{ p: { xs: 2.5, md: 3 }, borderInlineEnd: { lg: 1 }, borderBottom: { xs: 1, lg: 0 }, borderColor: 'divider', minHeight: { lg: 560 } }}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h3">Meal slots</Typography>
                <Button startIcon={<Add />} onClick={addSlot}>Add slot</Button>
              </Stack>
              {day?.slots.map((planSlot, index) => (
                <ListItemButton
                  key={planSlot.id}
                  selected={index === selectedSlot}
                  onClick={() => { setSelectedSlot(index); setSelectedMeal(null); }}
                  sx={{ mt: index === 0 ? 1.5 : 0.75, borderRadius: 2, border: 1, borderColor: index === selectedSlot ? 'rgba(0,103,78,.18)' : 'transparent', '&.Mui-selected': { bgcolor: 'rgba(0,103,78,.08)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(0,103,78,.11)' } }}
                >
                  <ListItemText primary={planSlot.title} secondary={`${planSlot.options.length} options · select ${planSlot.min}–${planSlot.max}`} />
                  {planSlot.required && <Chip size="small" label="Required" />}
                </ListItemButton>
              ))}
              {slot && (
                <Stack spacing={2} mt={2.5} p={2} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: '#FCFDFC' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Slot settings</Typography>
                    <Typography variant="caption" color="text.secondary">Set the meal type and how many choices customers can make.</Typography>
                  </Box>
                  <TextField
                    fullWidth
                    select
                    label="Meal type"
                    value={selectedMealTypeId}
                    onChange={(event) => {
                      const mealType = mealTypes.find((item) => item.id === event.target.value);
                      if (mealType) updateSlot({ mealTypeId: mealType.id, title: mealType.nameEn });
                    }}
                    disabled={mealTypesQuery.isLoading || mealTypesQuery.isError}
                    error={mealTypesQuery.isError}
                    helperText={mealTypesQuery.isError ? 'Unable to load meal types.' : undefined}
                  >
                    {!mealTypes.length && (
                      <MenuItem value="" disabled>
                        {mealTypesQuery.isLoading ? 'Loading meal types…' : 'No active meal types found'}
                      </MenuItem>
                    )}
                    {mealTypes.map((mealType) => (
                      <MenuItem value={mealType.id} key={mealType.id}>{mealType.nameEn}</MenuItem>
                    ))}
                  </TextField>
                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Minimum"
                        value={slot.min}
                        slotProps={{ htmlInput: { min: 0, max: slot.max } }}
                        onChange={(event) => updateSlot({ min: Math.max(0, Number(event.target.value)) })}
                      />
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Maximum"
                        value={slot.max}
                        slotProps={{ htmlInput: { min: slot.min } }}
                        onChange={(event) => updateSlot({ max: Math.max(slot.min, Number(event.target.value)) })}
                      />
                    </Grid>
                  </Grid>
                  <FormControlLabel
                    control={<Checkbox checked={slot.required} onChange={(_, checked) => updateSlot({ required: checked })} />}
                    label="Required slot"
                    sx={{ m: 0 }}
                  />
                </Stack>
              )}
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }} sx={{ p: { xs: 2.5, md: 3 }, minHeight: { lg: 560 } }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h3">Meal options</Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  disabled={!slot || !selectedMeal || slot.options.some((option) => option.id === selectedMeal.id)}
                  onClick={addMeal}
                >
                  Add selected
                </Button>
              </Stack>
              <Autocomplete
                sx={{ mt: 2, mb: 1 }}
                options={meals}
                value={selectedMeal}
                inputValue={mealSearch}
                loading={mealsQuery.isLoading || mealsQuery.isFetching}
                disabled={!slot}
                openOnFocus
                filterOptions={(options) => options}
                getOptionLabel={(meal) => meal.nameEn}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionDisabled={(meal) => !!slot?.options.some((option) => option.id === meal.id)}
                onChange={(_, meal) => setSelectedMeal(meal)}
                onInputChange={(_, value, reason) => {
                  if (reason !== 'reset') setMealSearch(value);
                }}
                noOptionsText={mealsQuery.isError ? 'Unable to load meals' : 'No active meals found'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Find a meal"
                    placeholder="Search active meals by name, category, tag, or allergen"
                    error={mealsQuery.isError}
                    helperText={mealsQuery.isError ? 'Unable to load active meals.' : undefined}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {(mealsQuery.isLoading || mealsQuery.isFetching) && <CircularProgress size={20} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
              {slot?.options.length ? (
                <Box py={2.5}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {slot.options.length} {slot.options.length === 1 ? 'meal' : 'meals'} added to this slot
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                  {slot.options.map((option) => (
                    <Chip
                      key={option.id}
                      label={option.name}
                      onDelete={() => updateSlot({ options: slot.options.filter((item) => item.id !== option.id) })}
                      sx={{ bgcolor: 'rgba(0,103,78,.08)', '& .MuiChip-deleteIcon': { color: 'rgba(0,103,78,.45)' } }}
                    />
                  ))}
                  </Stack>
                </Box>
              ) : (
                <Box py={5} textAlign="center">
                  <Typography fontWeight={700}>No selectable meals yet</Typography>
                  <Typography color="text.secondary">Add enough active options to meet the slot minimum.</Typography>
                </Box>
              )}
              <Divider />
              <Alert severity="info" sx={{ mt: 2 }}>
                Archived meals cannot be added. Availability conflicts and duplicate meal/variant combinations are validated before save and publish.
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}
