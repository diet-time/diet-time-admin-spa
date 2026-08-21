import { Add, ArrowDownward, ArrowUpward, DeleteOutline, Star, StarBorder } from '@mui/icons-material';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, FormControlLabel, Grid, IconButton, MenuItem, Snackbar, Stack, Switch, TextField, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { masterDataApi } from '@/api/masterDataApi';
import { mealsApi } from '@/api/mealsApi';
import { plansApi } from '@/api/plansApi';
import { weeklyMenuApi, type Weekday, type WeeklyMenuDay, type WeeklyMenuItem, type WeeklyMenuSection } from '@/api/subscriptionConfigurationApi';
import { queryClient } from '@/app/queryClient';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';

const DAYS: Array<{ value: Weekday; label: string }> = [
  { value: 'SUNDAY', label: 'Sunday' }, { value: 'MONDAY', label: 'Monday' }, { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' }, { value: 'THURSDAY', label: 'Thursday' }, { value: 'FRIDAY', label: 'Friday' }, { value: 'SATURDAY', label: 'Saturday' },
];

export function WeeklyMenuPage() {
  const { mealPlanId: routePlanId } = useParams();
  const navigate = useNavigate();
  const [day, setDay] = useState<Weekday>('SUNDAY');
  const [draft, setDraft] = useState<WeeklyMenuDay | null>(null);
  const [mealSearch, setMealSearch] = useState('');
  const [notice, setNotice] = useState('');
  const plans = useQuery({ queryKey: ['meal-plans', 'weekly-menu-lookup'], queryFn: ({ signal }) => plansApi.list({ page: 1, pageSize: 100 }, signal) });
  const mealTypes = useQuery({ queryKey: ['master', 'meal-types', 'weekly-menu'], queryFn: ({ signal }) => masterDataApi.list('meal-types', { page: 1, pageSize: 100, isActive: true, sort: 'displayOrder_asc' }, signal) });
  const meals = useQuery({ queryKey: ['meals', 'weekly-menu', mealSearch], queryFn: ({ signal }) => mealsApi.list({ page: 1, pageSize: 50, search: mealSearch.trim() || undefined, status: 'ACTIVE', available: true }, signal) });
  const menu = useQuery({ queryKey: ['weekly-menu', routePlanId], enabled: !!routePlanId, queryFn: ({ signal }) => weeklyMenuApi.get(routePlanId!, signal) });
  const currentFromApi = menu.data?.days?.find((candidate) => candidate.dayOfWeek === day);
  useEffect(() => {
    if (!routePlanId) { setDraft(null); return; }
    const sections: WeeklyMenuSection[] = currentFromApi?.sections ?? (mealTypes.data?.items ?? []).filter((type) => type.isActive).map((type, index) => ({ mealTypeId: type.id, mealTypeCode: type.code, mealTypeName: type.nameEn, displayOrder: type.displayOrder ?? index + 1, items: [] }));
    setDraft({ dayOfWeek: day, isActive: currentFromApi?.isActive ?? day !== 'FRIDAY', sections });
  }, [currentFromApi, day, mealTypes.data, routePlanId]);
  const save = useMutation({ mutationFn: (body: WeeklyMenuDay) => weeklyMenuApi.updateDay(routePlanId!, day, body), onSuccess: async () => { setNotice(`${DAYS.find((item) => item.value === day)?.label} menu saved successfully.`); await queryClient.invalidateQueries({ queryKey: ['weekly-menu', routePlanId] }); } });

  const updateSection = (id: string, update: (section: WeeklyMenuSection) => WeeklyMenuSection) => setDraft((current) => current ? { ...current, sections: current.sections.map((section) => section.mealTypeId === id ? update(section) : section) } : current);
  const addMeal = (section: WeeklyMenuSection, meal: { id: string; nameEn: string } | null) => {
    if (!meal || section.items.some((item) => item.mealId === meal.id)) return;
    updateSection(section.mealTypeId, (current) => ({ ...current, items: [...current.items, { mealId: meal.id, mealName: meal.nameEn, displayOrder: current.items.length + 1, isDefault: current.items.length === 0, isActive: true }] }));
  };
  const patchItem = (sectionId: string, mealId: string, patch: Partial<WeeklyMenuItem>) => updateSection(sectionId, (section) => ({ ...section, items: section.items.map((item) => item.mealId === mealId ? { ...item, ...patch } : patch.isDefault ? { ...item, isDefault: false } : item) }));
  const move = (sectionId: string, index: number, delta: number) => updateSection(sectionId, (section) => { const items = [...section.items]; const target = index + delta; if (target < 0 || target >= items.length) return section; const moved = items[index]; if (!moved) return section; items.splice(index, 1); items.splice(target, 0, moved); return { ...section, items: items.map((item, order) => ({ ...item, displayOrder: order + 1 })) }; });
  const warnings = useMemo(() => draft?.isActive ? draft.sections.flatMap((section) => { const activeItems = section.items.filter((item) => item.isActive); if (!activeItems.length) return [`No ${section.mealTypeName.toLowerCase()} options configured for ${DAYS.find((item) => item.value === day)?.label}.`]; if (!activeItems.some((item) => item.isDefault)) return [`No default ${section.mealTypeName.toLowerCase()} configured for ${DAYS.find((item) => item.value === day)?.label}.`]; return []; }) ?? [] : [], [day, draft]);

  return <Stack spacing={2.5}>
    <Box><Typography variant="h2">Weekly Menu</Typography><Typography color="text.secondary">Configure each weekday once. The same menu repeats every week.</Typography></Box>
    <Card><CardContent><TextField select fullWidth label="Meal Plan" value={routePlanId ?? ''} onChange={(e) => navigate(e.target.value ? `/admin/meal-plans/${e.target.value}/weekly-menu` : '/admin/weekly-menu')}><MenuItem value="">Select a meal plan</MenuItem>{(plans.data?.items ?? []).map((plan) => <MenuItem value={plan.id} key={plan.id}>{plan.nameEn}</MenuItem>)}</TextField></CardContent></Card>
    {!routePlanId ? <Card><Box py={7} textAlign="center"><Typography variant="h3">Select a meal plan</Typography><Typography color="text.secondary" mt={1}>Choose a plan to view and edit its recurring weekly menu.</Typography></Box></Card> : menu.isLoading || mealTypes.isLoading ? <LoadingState /> : menu.isError ? <ErrorState message="Unable to load the weekly menu." onRetry={() => void menu.refetch()} /> : <>
      <Stack direction="row" gap={1} flexWrap="wrap">{DAYS.map((item) => { const configured = menu.data?.days?.find((candidate) => candidate.dayOfWeek === item.value); return <Chip key={item.value} label={`${item.label}${configured?.isActive === false ? ' · Inactive' : ''}`} color={day === item.value ? 'primary' : 'default'} variant={day === item.value ? 'filled' : 'outlined'} onClick={() => setDay(item.value)} />; })}</Stack>
      {save.isError && <Alert severity="error">The weekly menu could not be saved. Please try again.</Alert>}
      <Grid container spacing={2.5}><Grid size={{ xs: 12, lg: 8 }}><Stack spacing={2}>
        <Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Box><Typography variant="h3">{DAYS.find((item) => item.value === day)?.label}</Typography><Typography color="text.secondary">Available meals by meal type</Typography></Box><FormControlLabel control={<Switch checked={draft?.isActive ?? false} onChange={(_, checked) => setDraft((current) => current ? { ...current, isActive: checked } : current)} />} label="Service day active" /></Stack></CardContent></Card>
        {draft?.isActive === false && <Alert severity="info">This is an inactive service day. It can remain without menu options.</Alert>}
        {[...(draft?.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder).map((section) => <Card key={section.mealTypeId}><CardContent><Stack spacing={2}>
          <Box><Typography variant="overline" color="primary.main" fontWeight={800}>{section.mealTypeName}</Typography><Typography variant="h3">Available Meals</Typography></Box>
          <Autocomplete options={meals.data?.items ?? []} filterOptions={(options) => options} loading={meals.isLoading || meals.isFetching} getOptionLabel={(meal) => meal.nameEn} isOptionEqualToValue={(a, b) => a.id === b.id} getOptionDisabled={(meal) => section.items.some((item) => item.mealId === meal.id)} value={null} inputValue={mealSearch} onInputChange={(_, value, reason) => { if (reason !== 'reset') setMealSearch(value); }} onChange={(_, meal) => { addMeal(section, meal); setMealSearch(''); }} renderInput={(params) => <TextField {...params} label={`Add ${section.mealTypeName} meal`} placeholder="Search the Meals master" slotProps={{ input: { ...params.InputProps, startAdornment: <Add sx={{ ml: 1, color: 'text.secondary' }} />, endAdornment: <>{meals.isFetching && <CircularProgress size={18} />}{params.InputProps.endAdornment}</> } }} />} />
          {!section.items.length ? <Box py={2} textAlign="center"><Typography fontWeight={700}>No meals added</Typography><Typography variant="body2" color="text.secondary">Use the searchable selector above to add an option.</Typography></Box> : <Stack spacing={1}>{section.items.map((item, index) => <Box key={item.mealId} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, border: 1, borderColor: item.isDefault ? 'primary.main' : 'divider', borderRadius: 2, opacity: item.isActive ? 1 : .58 }}><IconButton size="small" color={item.isDefault ? 'primary' : 'default'} aria-label={`Make ${item.mealName} default`} onClick={() => patchItem(section.mealTypeId, item.mealId, { isDefault: true, isActive: true })}>{item.isDefault ? <Star /> : <StarBorder />}</IconButton><Box flex={1}><Typography fontWeight={700}>{item.mealName}</Typography>{item.isDefault && <Typography variant="caption" color="primary.main">Default Meal</Typography>}</Box><IconButton size="small" disabled={index === 0} onClick={() => move(section.mealTypeId, index, -1)}><ArrowUpward fontSize="small" /></IconButton><IconButton size="small" disabled={index === section.items.length - 1} onClick={() => move(section.mealTypeId, index, 1)}><ArrowDownward fontSize="small" /></IconButton><Switch size="small" checked={item.isActive} onChange={(_, checked) => patchItem(section.mealTypeId, item.mealId, { isActive: checked, ...(checked ? {} : { isDefault: false }) })} /><IconButton color="error" size="small" onClick={() => updateSection(section.mealTypeId, (current) => ({ ...current, items: current.items.filter((candidate) => candidate.mealId !== item.mealId).map((candidate, order) => ({ ...candidate, displayOrder: order + 1 })) }))}><DeleteOutline fontSize="small" /></IconButton></Box>)}</Stack>}
        </Stack></CardContent></Card>)}
        <Stack direction="row" justifyContent="flex-end"><Button variant="contained" size="large" disabled={!draft || save.isPending} onClick={() => draft && save.mutate(draft)}>{save.isPending ? 'Saving…' : `Save ${DAYS.find((item) => item.value === day)?.label}`}</Button></Stack>
      </Stack></Grid><Grid size={{ xs: 12, lg: 4 }}><Card sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}><CardContent><Typography variant="h3">Weekly Menu Summary</Typography><Typography color="text.secondary" mb={2}>{menu.data?.mealPlanName ?? plans.data?.items.find((plan) => plan.id === routePlanId)?.nameEn}</Typography><Stack spacing={1.5}>{DAYS.map((item) => { const configured = item.value === day ? draft : menu.data?.days?.find((candidate) => candidate.dayOfWeek === item.value); return <Box key={item.value} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.25 }}><Typography fontWeight={750}>{item.label}{configured?.isActive === false ? ' · Inactive' : ''}</Typography>{configured?.isActive !== false && (configured?.sections ?? []).map((section) => <Typography key={section.mealTypeId} variant="body2" color="text.secondary">{section.mealTypeName}: {section.items.filter((meal) => meal.isActive).length} options</Typography>)}</Box>; })}</Stack>{warnings.length > 0 && <Stack spacing={1} mt={2}>{warnings.map((warning) => <Alert severity="warning" key={warning}>{warning}</Alert>)}</Stack>}</CardContent></Card></Grid></Grid>
    </>}
    <Snackbar open={!!notice} autoHideDuration={4000} message={notice} onClose={() => setNotice('')} />
  </Stack>;
}
