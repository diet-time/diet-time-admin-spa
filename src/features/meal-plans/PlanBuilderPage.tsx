import { Add, CloudUploadOutlined, ContentCopy, DeleteOutline, DragIndicator } from '@mui/icons-material';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { masterDataApi } from '@/api/masterDataApi';
import { mealsApi } from '@/api/mealsApi';
import { plansApi } from '@/api/plansApi';
import type { MealSummary } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import {
  MVP_MENU_WEEKDAYS,
  defaultWeekdayDisplayOrder,
  isWeekdayConfigured,
  sortMenuDays,
  type MenuWeekday,
} from './menuWeekdays';

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

interface MenuDay {
  id: string;
  menuWeekday: MenuWeekday;
  displayOrder: number;
  isActive: boolean;
  slots: Slot[];
}

interface PlanDetails {
  code: string;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  planType: string;
  isCustomizable: boolean;
  durationDays: number;
}

const planTypes = ['STANDARD', 'WEIGHT_LOSS', 'WEIGHT_GAIN', 'KETO', 'DIABETIC', 'VEGETARIAN', 'VEGAN', 'HIGH_PROTEIN', 'LOW_CARB', 'BALANCED', 'CUSTOM'];

const initial: MenuDay[] = MVP_MENU_WEEKDAYS.map((menuWeekday) => ({
  id: `new-day-${menuWeekday}`,
  menuWeekday,
  displayOrder: defaultWeekdayDisplayOrder(menuWeekday),
  isActive: true,
  slots: [],
}));

export function PlanBuilderPage() {
  const { t } = useTranslation();
  const { planId } = useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState(initial);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [mealSearch, setMealSearch] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealSummary | null>(null);
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [newWeekday, setNewWeekday] = useState<MenuWeekday | ''>('');
  const [newDisplayOrder, setNewDisplayOrder] = useState(1);
  const [newDayActive, setNewDayActive] = useState(true);
  const [dayError, setDayError] = useState('');
  const [draggedDay, setDraggedDay] = useState<number | null>(null);
  const [planImage, setPlanImage] = useState<File | null>(null);
  const [planImagePreview, setPlanImagePreview] = useState('');
  const [planImageError, setPlanImageError] = useState('');
  const [planImageProgress, setPlanImageProgress] = useState<number | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails>({
    code: '',
    nameEn: '',
    nameAr: '',
    shortDescriptionEn: '',
    shortDescriptionAr: '',
    planType: 'STANDARD',
    isCustomizable: true,
    durationDays: 20,
  });
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
  const planQuery = useQuery({
    queryKey: ['plan', planId],
    queryFn: ({ signal }) => plansApi.get(planId!, signal),
    enabled: !!planId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const createDayMutation = useMutation({
    mutationFn: (body: { menuWeekday: MenuWeekday; displayOrder: number; isActive: boolean }) =>
      plansApi.createTemplateDay(planId!, body),
    onSuccess: async () => {
      await planQuery.refetch();
      setAddDayOpen(false);
    },
    onError: (error) => {
      const code = axios.isAxiosError<{ code?: string; message?: string }>(error) ? error.response?.data?.code : undefined;
      const message = axios.isAxiosError<{ code?: string; message?: string }>(error) ? error.response?.data?.message : undefined;
      setDayError(code === 'DUPLICATE_TEMPLATE_WEEKDAY' ? t('weeklySchedule.duplicateWeekday') : message ?? t('weeklySchedule.saveError'));
    },
  });
  const deleteDayMutation = useMutation({
    mutationFn: (dayId: string) => plansApi.deleteTemplateDay(planId!, dayId),
    onSuccess: async () => { await planQuery.refetch(); },
  });

  const mealTypes = (mealTypesQuery.data?.items ?? []).filter((mealType) => mealType.isActive);
  const meals = mealsQuery.data?.items ?? [];
  const selectedMealTypeId = slot?.mealTypeId
    ?? mealTypes.find((mealType) => mealType.nameEn === slot?.title)?.id
    ?? '';
  const issues = days.flatMap((planDay) => planDay.slots
    .filter((planSlot) => planSlot.required && planSlot.options.length < planSlot.min)
    .map((planSlot) => `${t(`weekdays.${planDay.menuWeekday}`)} ${planSlot.title} needs at least ${planSlot.min} active option(s).`));
  const mealTypeIdFor = (planSlot: Slot) => planSlot.mealTypeId
    ?? mealTypes.find((mealType) => mealType.nameEn === planSlot.title)?.id;
  const hasIncompleteArabicTranslation = !!planDetails.shortDescriptionAr.trim()
    && !planDetails.nameAr.trim();
  const canSave = !!planDetails.code.trim()
    && !!planDetails.nameEn.trim()
    && !hasIncompleteArabicTranslation
    && days.length > 0
    && days.every((planDay) => planDay.slots.every((planSlot) => !!mealTypeIdFor(planSlot)));
  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const input = {
        code: planDetails.code.trim().toUpperCase(),
        planType: planDetails.planType,
        durationDays: planDetails.durationDays,
        isCustomizable: planDetails.isCustomizable,
        validFrom: null,
        validUntil: null,
        translations: [
          {
            languageCode: 'en' as const,
            name: planDetails.nameEn.trim(),
            shortDescription: planDetails.shortDescriptionEn.trim() || undefined,
          },
          ...(planDetails.nameAr.trim() ? [{
            languageCode: 'ar' as const,
            name: planDetails.nameAr.trim(),
            shortDescription: planDetails.shortDescriptionAr.trim() || undefined,
          }] : []),
        ],
        days: days.map((planDay) => ({
          menuWeekday: planDay.menuWeekday,
          displayOrder: planDay.displayOrder,
          isActive: planDay.isActive,
          slots: planDay.slots.map((planSlot, slotIndex) => ({
            mealTypeId: mealTypeIdFor(planSlot)!,
            displayOrder: slotIndex,
            minimumSelection: planSlot.min,
            maximumSelection: planSlot.max,
            isRequired: planSlot.required,
            selectionCutoffTime: null,
            allowsPaidUpgrade: false,
            options: planSlot.options.map((option, optionIndex) => ({
              mealItemId: option.id,
              additionalPrice: 0,
              isDefault: option.default,
              isAvailable: true,
              displayOrder: optionIndex,
            })),
          })),
        })),
        publish,
      };

      let savedPlanId: string;
      if (planId) {
        const updatedPlan = await plansApi.update(planId, input);
        savedPlanId = updatedPlan.id;
      } else {
        const createdPlan = await plansApi.create(input);
        savedPlanId = createdPlan.id;
      }

      if (planImage) {
        setPlanImageProgress(0);
        const uploaded = await plansApi.uploadImage(savedPlanId, planImage, setPlanImageProgress);
        setPlanImagePreview(uploaded.publicUrl);
        setPlanImageProgress(100);
      }
      return savedPlanId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate('/meal-plans');
    },
  });

  useEffect(() => {
    const plan = planQuery.data;
    if (!plan) return;
    const english = plan.translations.find((translation) => translation.languageCode.toLowerCase() === 'en');
    const arabic = plan.translations.find((translation) => translation.languageCode.toLowerCase() === 'ar');
    setPlanDetails({
      code: plan.code,
      nameEn: english?.name ?? '',
      nameAr: arabic?.name ?? '',
      shortDescriptionEn: english?.shortDescription ?? '',
      shortDescriptionAr: arabic?.shortDescription ?? '',
      planType: plan.planType,
      isCustomizable: plan.isCustomizable,
      durationDays: plan.durationDays,
    });
    setDays(plan.days.map((planDay) => ({
      id: planDay.id,
      menuWeekday: planDay.menuWeekday,
      displayOrder: planDay.displayOrder,
      isActive: planDay.isActive,
      slots: planDay.slots.map((planSlot) => ({
        id: planSlot.id,
        mealTypeId: planSlot.mealTypeId,
        title: planSlot.mealTypeName,
        min: planSlot.minimumSelection,
        max: planSlot.maximumSelection,
        required: planSlot.isRequired,
        options: planSlot.options.map((option) => ({
          id: option.mealItemId,
          name: option.mealName,
          default: option.isDefault,
        })),
      })),
    })));
    setSelectedDay(0);
    setSelectedSlot(0);
    setSelectedMeal(null);
    setPlanImagePreview(plan.imageUrl ?? '');
  }, [planQuery.data]);

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

  const openAddDay = () => {
    const available = MVP_MENU_WEEKDAYS.find((weekday) => !isWeekdayConfigured(days, weekday));
    setNewWeekday(available ?? '');
    setNewDisplayOrder(available ? defaultWeekdayDisplayOrder(available) : days.length + 1);
    setNewDayActive(true);
    setDayError('');
    setAddDayOpen(true);
  };

  const addDay = async () => {
    if (!newWeekday) { setDayError(t('weeklySchedule.weekdayRequired')); return; }
    if (newDisplayOrder <= 0) { setDayError(t('weeklySchedule.invalidDisplayOrder')); return; }
    if (isWeekdayConfigured(days, newWeekday)) { setDayError(t('weeklySchedule.duplicateWeekday')); return; }
    if (planId) {
      await createDayMutation.mutateAsync({ menuWeekday: newWeekday, displayOrder: newDisplayOrder, isActive: newDayActive }).catch(() => undefined);
      return;
    }
    const next = sortMenuDays([...days, { id: `new-day-${Date.now()}`, menuWeekday: newWeekday, displayOrder: newDisplayOrder, isActive: newDayActive, slots: [] }]);
    setDays(next);
    setSelectedDay(next.findIndex((item) => item.menuWeekday === newWeekday));
    setSelectedSlot(0);
    setAddDayOpen(false);
  };

  const deleteDay = async (index: number) => {
    const target = days[index];
    if (!target) return;
    if (planId && !target.id.startsWith('new-day-')) {
      await deleteDayMutation.mutateAsync(target.id);
      return;
    }
    const next = days.filter((_, dayIndex) => dayIndex !== index);
    setDays(next);
    setSelectedDay(Math.max(0, Math.min(index, next.length - 1)));
    setSelectedSlot(0);
  };

  const reorderDay = (from: number, to: number) => {
    if (from === to) return;
    setDays((currentDays) => {
      const next = [...currentDays];
      const [moved] = next.splice(from, 1);
      if (!moved) return currentDays;
      next.splice(to, 0, moved);
      return next.map((item, index) => ({ ...item, displayOrder: index + 1 }));
    });
    setSelectedDay(to);
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

  const selectPlanImage = (file?: File) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = Number(import.meta.env.VITE_UPLOAD_MAX_MB ?? 8) * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size > maxSize) {
      setPlanImageError(`Choose a JPEG, PNG, or WebP image smaller than ${Math.round(maxSize / 1024 / 1024)} MB.`);
      return;
    }
    setPlanImageError('');
    setPlanImage(file);
    setPlanImageProgress(null);
    setPlanImagePreview(URL.createObjectURL(file));
  };

  if (planId && planQuery.isFetching) return <LoadingState />;
  if (planId && (planQuery.isError || !planQuery.data)) {
    return <ErrorState message="Unable to load this meal plan." onRetry={() => void planQuery.refetch()} />;
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h1">{planId ? 'Edit meal plan' : 'Create meal plan'}</Typography>
          <Typography color="text.secondary">{t('weeklySchedule.hierarchy')}</Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button onClick={() => navigate('/meal-plans')}>Cancel</Button>
          <Button
            variant="outlined"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate(false)}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            variant="contained"
            disabled={!canSave || issues.length > 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate(true)}
          >
            {saveMutation.isPending && saveMutation.variables ? 'Publishing…' : 'Publish'}
          </Button>
        </Stack>
      </Stack>
      {issues.length > 0 && (
        <Alert severity="error"><strong>Publishing checklist:</strong> {issues.join(' ')}</Alert>
      )}
      {saveMutation.isError && (
        <Alert severity="error">{saveMutation.variables ? 'The meal plan could not be saved and published. Review the plan and try again.' : 'The draft could not be saved. Review the plan details and try again.'}</Alert>
      )}
      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h3">Plan details</Typography>
              <Typography variant="body2" color="text.secondary">Enter the required information before saving this draft.</Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  required
                  fullWidth
                  label="Plan code"
                  value={planDetails.code}
                  slotProps={{ htmlInput: { maxLength: 50 } }}
                  onChange={(event) => setPlanDetails((current) => ({ ...current, code: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label={t('weeklySchedule.templateType')}
                  value={planDetails.planType}
                  onChange={(event) => setPlanDetails((current) => ({ ...current, planType: event.target.value }))}
                >
                  {planTypes.map((type) => <MenuItem value={type} key={type}>{type.replaceAll('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControlLabel
                  control={<Checkbox checked={planDetails.isCustomizable} onChange={(_, checked) => setPlanDetails((current) => ({ ...current, isCustomizable: checked }))} />}
                  label="Customer customizable"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography variant="body2" color="text.secondary">{t('weeklySchedule.schedule')}</Typography>
                <Typography fontWeight={700}>{t('weeklySchedule.saturdayToThursday')}</Typography>
              </Grid>
            </Grid>
            <Divider />
            <Box>
              <Typography fontWeight={700}>Translations</Typography>
              <Typography variant="body2" color="text.secondary">Add the customer-facing name and a short description in each language.</Typography>
            </Box>
            <Grid container spacing={2} alignItems="stretch">
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ height: '100%', p: 2.5 }}>
                  <Stack spacing={2}>
                    <Typography variant="h3">English</Typography>
                    <TextField
                      required
                      fullWidth
                      label="Plan name"
                      value={planDetails.nameEn}
                      onChange={(event) => setPlanDetails((current) => ({ ...current, nameEn: event.target.value }))}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Short description"
                      value={planDetails.shortDescriptionEn}
                      slotProps={{ htmlInput: { maxLength: 300 } }}
                      helperText={`${planDetails.shortDescriptionEn.length}/300 characters`}
                      onChange={(event) => setPlanDetails((current) => ({ ...current, shortDescriptionEn: event.target.value }))}
                    />
                  </Stack>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ height: '100%', p: 2.5 }} dir="rtl">
                  <Stack spacing={2}>
                    <Typography variant="h3">العربية</Typography>
                    <TextField
                      fullWidth
                      label="اسم الخطة"
                      value={planDetails.nameAr}
                      error={hasIncompleteArabicTranslation}
                      helperText={hasIncompleteArabicTranslation ? 'Enter the Arabic plan name to save this translation.' : undefined}
                      onChange={(event) => setPlanDetails((current) => ({ ...current, nameAr: event.target.value }))}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="وصف مختصر"
                      value={planDetails.shortDescriptionAr}
                      slotProps={{ htmlInput: { maxLength: 300 } }}
                      helperText={`${planDetails.shortDescriptionAr.length}/300 حرف`}
                      onChange={(event) => setPlanDetails((current) => ({ ...current, shortDescriptionAr: event.target.value }))}
                    />
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h3">Meal plan image</Typography>
              <Typography variant="body2" color="text.secondary">Upload the image shown on guest plan cards and the plan banner. It will be stored with image type MEALPLAN when the plan is saved.</Typography>
            </Box>
            {planImageError && <Alert severity="error">{planImageError}</Alert>}
            <Grid container spacing={2} alignItems="stretch">
              <Grid size={{ xs: 12, md: 5 }}>
                {planImagePreview ? (
                  <Box
                    component="img"
                    src={planImagePreview}
                    alt="Meal plan preview"
                    sx={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      objectFit: 'contain',
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                    }}
                  />
                ) : (
                  <Box sx={{ width: '100%', aspectRatio: '16 / 9', display: 'grid', placeItems: 'center', border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default', color: 'text.secondary' }}>No plan image uploaded</Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Paper variant="outlined" sx={{ height: '100%', minHeight: 220, display: 'grid', placeItems: 'center', p: 3, borderStyle: 'dashed', textAlign: 'center' }}>
                  <Stack alignItems="center" spacing={1}>
                    <CloudUploadOutlined color="primary" sx={{ fontSize: 44 }} />
                    <Typography fontWeight={700}>Choose a meal plan image</Typography>
                    <Typography variant="body2" color="text.secondary">JPEG, PNG or WebP · recommended 1600 × 900</Typography>
                    <Button component="label" variant="outlined">
                      Browse image
                      <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectPlanImage(event.target.files?.[0])} />
                    </Button>
                    {planImage && <Typography variant="caption">{planImage.name} · uploads with the next save or publish</Typography>}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
            {planImageProgress !== null && <Box aria-live="polite"><LinearProgress variant="determinate" value={planImageProgress} /><Typography variant="caption">Plan image upload {planImageProgress}% complete</Typography></Box>}
          </Stack>
        </CardContent>
      </Card>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent sx={{ p: '0 !important' }}>
          <Grid container spacing={0}>
            <Grid
              size={{ xs: 12, lg: 3 }}
              sx={{ p: { xs: 2.5, md: 3 }, borderInlineEnd: { lg: 1 }, borderBottom: { xs: 1, lg: 0 }, borderColor: 'divider', bgcolor: '#FCFDFC', minHeight: { lg: 560 } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h3">{t('weeklySchedule.title')}</Typography>
                <Button startIcon={<Add />} onClick={openAddDay}>{t('weeklySchedule.addMenuDay')}</Button>
              </Stack>
              <List sx={{ mt: 1.5, p: 0 }}>
                {days.map((planDay, index) => (
                  <ListItemButton
                    key={planDay.id}
                    selected={index === selectedDay}
                    draggable
                    onDragStart={() => setDraggedDay(index)}
                    onDragEnd={() => setDraggedDay(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => { if (draggedDay !== null) reorderDay(draggedDay, index); setDraggedDay(null); }}
                    onClick={() => { setSelectedDay(index); setSelectedSlot(0); setSelectedMeal(null); }}
                    sx={{ mb: 1, borderRadius: 2, border: 1, borderColor: index === selectedDay ? 'rgba(0,103,78,.18)' : 'transparent', '&.Mui-selected': { bgcolor: 'rgba(0,103,78,.08)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(0,103,78,.11)' } }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}><DragIndicator /></ListItemIcon>
                    <ListItemText
                      primary={t(`weekdays.${planDay.menuWeekday}`)}
                      secondary={`${planDay.slots.length} ${t('weeklySchedule.slots')} · ${t(planDay.isActive ? 'weeklySchedule.active' : 'weeklySchedule.inactive')}`}
                    />
                    <ContentCopy fontSize="small" color="action" sx={{ mx: 0.5 }} />
                    <DeleteOutline
                      fontSize="small"
                      color="action"
                      role="button"
                      aria-label={t('weeklySchedule.deleteMenuDay')}
                      onClick={(event) => { event.stopPropagation(); void deleteDay(index); }}
                    />
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
      <Dialog open={addDayOpen} onClose={() => { if (!createDayMutation.isPending) setAddDayOpen(false); }} fullWidth maxWidth="xs">
        <DialogTitle>{t('weeklySchedule.addMenuDay')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {dayError && <Alert severity="error">{dayError}</Alert>}
            <TextField
              select
              required
              fullWidth
              label={t('weeklySchedule.weekday')}
              value={newWeekday}
              onChange={(event) => {
                const weekday = event.target.value as MenuWeekday;
                setNewWeekday(weekday);
                setNewDisplayOrder(defaultWeekdayDisplayOrder(weekday));
                setDayError('');
              }}
            >
              {MVP_MENU_WEEKDAYS.map((weekday) => (
                <MenuItem key={weekday} value={weekday} disabled={isWeekdayConfigured(days, weekday)}>
                  {t(`weekdays.${weekday}`)}{isWeekdayConfigured(days, weekday) ? ` — ${t('weeklySchedule.alreadyAdded')}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              fullWidth
              type="number"
              label={t('weeklySchedule.displayOrder')}
              value={newDisplayOrder}
              slotProps={{ htmlInput: { min: 1 } }}
              onChange={(event) => setNewDisplayOrder(Number(event.target.value))}
            />
            <FormControlLabel control={<Checkbox checked={newDayActive} onChange={(_, checked) => setNewDayActive(checked)} />} label={t('weeklySchedule.active')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDayOpen(false)} disabled={createDayMutation.isPending}>{t('weeklySchedule.cancel')}</Button>
          <Button variant="contained" onClick={() => void addDay()} disabled={createDayMutation.isPending || !newWeekday}>
            {createDayMutation.isPending ? t('weeklySchedule.saving') : t('weeklySchedule.addMenuDay')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
