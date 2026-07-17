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
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography variant="h1">{planId ? 'Edit meal plan' : 'Create meal plan'}</Typography>
          <Typography color="text.secondary">Template days → meal slots → selectable meal options</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button onClick={() => navigate('/meal-plans')}>Cancel</Button>
          <Button variant="outlined">Save draft</Button>
          <Button variant="contained" disabled={issues.length > 0}>Publish</Button>
        </Stack>
      </Stack>
      {issues.length > 0 && (
        <Alert severity="error"><strong>Publishing checklist:</strong> {issues.join(' ')}</Alert>
      )}
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 3 }} sx={{ borderInlineEnd: { lg: '1px solid' }, borderColor: 'divider', pr: { lg: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h3">Days</Typography>
                <Button startIcon={<Add />} onClick={addDay}>Add</Button>
              </Stack>
              <List>
                {days.map((planDay, index) => (
                  <ListItemButton
                    key={planDay.id}
                    selected={index === selectedDay}
                    onClick={() => { setSelectedDay(index); setSelectedSlot(0); setSelectedMeal(null); }}
                  >
                    <ListItemIcon><DragIndicator /></ListItemIcon>
                    <ListItemText primary={`Day ${planDay.number}`} secondary={`${planDay.slots.length} slots`} />
                    <ContentCopy fontSize="small" />
                  </ListItemButton>
                ))}
              </List>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }} sx={{ borderInlineEnd: { lg: '1px solid' }, borderColor: 'divider', pr: { lg: 2 } }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h3">Meal slots</Typography>
                <Button startIcon={<Add />} onClick={addSlot}>Add slot</Button>
              </Stack>
              {day?.slots.map((planSlot, index) => (
                <ListItemButton
                  key={planSlot.id}
                  selected={index === selectedSlot}
                  onClick={() => { setSelectedSlot(index); setSelectedMeal(null); }}
                >
                  <ListItemText primary={planSlot.title} secondary={`${planSlot.options.length} options · select ${planSlot.min}–${planSlot.max}`} />
                  {planSlot.required && <Chip size="small" label="Required" />}
                </ListItemButton>
              ))}
              {slot && (
                <Stack spacing={2} mt={3}>
                  <TextField
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
                  <Stack direction="row" gap={1}>
                    <TextField
                      type="number"
                      label="Minimum"
                      value={slot.min}
                      slotProps={{ htmlInput: { min: 0, max: slot.max } }}
                      onChange={(event) => updateSlot({ min: Math.max(0, Number(event.target.value)) })}
                    />
                    <TextField
                      type="number"
                      label="Maximum"
                      value={slot.max}
                      slotProps={{ htmlInput: { min: slot.min } }}
                      onChange={(event) => updateSlot({ max: Math.max(slot.min, Number(event.target.value)) })}
                    />
                  </Stack>
                  <FormControlLabel
                    control={<Checkbox checked={slot.required} onChange={(_, checked) => updateSlot({ required: checked })} />}
                    label="Required slot"
                  />
                </Stack>
              )}
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h3">Meal options</Typography>
                <Button
                  startIcon={<Add />}
                  disabled={!slot || !selectedMeal || slot.options.some((option) => option.id === selectedMeal.id)}
                  onClick={addMeal}
                >
                  Add meal
                </Button>
              </Stack>
              <Autocomplete
                sx={{ my: 2 }}
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
                <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} py={2}>
                  {slot.options.map((option) => (
                    <Chip
                      key={option.id}
                      label={option.name}
                      onDelete={() => updateSlot({ options: slot.options.filter((item) => item.id !== option.id) })}
                    />
                  ))}
                </Stack>
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
