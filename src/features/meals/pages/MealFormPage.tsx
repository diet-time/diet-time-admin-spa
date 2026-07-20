import { zodResolver } from '@hookform/resolvers/zod';
import { AddOutlined, DeleteOutline, SpaOutlined, WarningAmberOutlined } from '@mui/icons-material';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, FormControlLabel, Grid, IconButton, MenuItem, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { masterDataApi } from '@/api/masterDataApi';
import { mealsApi } from '@/api/mealsApi';
import { queryClient } from '@/app/queryClient';
import { ImageUploader } from '@/components/media/ImageUploader';
import { AvailabilityEditor, toUtcIso } from '../components/AvailabilityEditor';
import { NutritionEditor } from '../components/NutritionEditor';
import { MealFormStepper } from '../components/MealFormStepper';
import { DietaryEditor } from '../components/DietaryEditor';
import { defaultMealValues, mealSchema, type MealFormValues } from '../schemas/mealSchema';
import { getMealPublishIssues } from '../schemas/mealPublishValidation';
const sections = ['Basic information','Translations','Nutrition','Dietary attributes','Ingredients & allergens','Images','Individual pricing','Availability','Review & publish'];
export function MealFormPage() { const { mealId } = useParams(); const [savedMealId, setSavedMealId] = useState<string>(); const activeMealId = savedMealId ?? mealId; const editing = !!activeMealId; const navigate = useNavigate(); const [section, setSection] = useState(0); const [language, setLanguage] = useState<'en'|'ar'>('en'); const query = useQuery({ queryKey: ['meal-edit',activeMealId], queryFn: () => mealsApi.get(activeMealId!), enabled: !!activeMealId }); const form = useForm<MealFormValues>({ resolver: zodResolver(mealSchema), defaultValues: defaultMealValues, mode: 'onBlur' }); const { register, control, handleSubmit, reset, watch, formState: { errors, isDirty } } = form; useEffect(() => { if (query.data) reset(query.data); }, [query.data, reset]); useEffect(() => { const beforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) event.preventDefault(); }; window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload); }, [isDirty]); const mutation = useMutation({ mutationFn: async (values: MealFormValues) => { const payload = { ...values, status: 'Draft' as const, availability: { ...values.availability, availableFrom: values.availability.isAvailable && values.availability.availableFrom ? toUtcIso(values.availability.availableFrom) : undefined, availableUntil: values.availability.isAvailable && values.availability.availableUntil ? toUtcIso(values.availability.availableUntil) : undefined } }; const result = activeMealId ? await mealsApi.update(activeMealId, payload) : await mealsApi.create(payload); return result; }, onSuccess: async (result) => { setSavedMealId(result.id); await queryClient.invalidateQueries({ queryKey: ['meals'] }); setSection((value) => Math.min(value + 1, sections.length - 1)); } }); const publishMutation = useMutation({ mutationFn: async (values: MealFormValues) => { const payload = { ...values, availability: { ...values.availability, availableFrom: values.availability.isAvailable && values.availability.availableFrom ? toUtcIso(values.availability.availableFrom) : undefined, availableUntil: values.availability.isAvailable && values.availability.availableUntil ? toUtcIso(values.availability.availableUntil) : undefined } }; let targetMealId = activeMealId; if (targetMealId) { const updated = await mealsApi.update(targetMealId, payload); targetMealId = updated.id; } else { const created = await mealsApi.create(payload); targetMealId = created.id; setSavedMealId(created.id); } await mealsApi.status(targetMealId, 'ACTIVE'); return targetMealId; }, onSuccess: async (publishedMealId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['meals'] }), queryClient.invalidateQueries({ queryKey: ['meal', publishedMealId] }), queryClient.invalidateQueries({ queryKey: ['meal-edit', publishedMealId] })]); navigate(`/meals/${publishedMealId}`); } }); const saveAndContinue = handleSubmit((values) => mutation.mutate(values)); const nutrition = watch('nutrition'); const primaryMedia = query.data?.media.find((media) => media.mediaType === 'IMAGE' && media.isPrimary) ?? query.data?.media.find((media) => media.mediaType === 'IMAGE'); const originalImageUrl = primaryMedia?.publicUrl; const thumbnailImageUrl = primaryMedia?.thumbnailUrl; if (query.isLoading) return <CircularProgress />; return <Stack spacing={3} component="form" onSubmit={saveAndContinue}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h1">{editing ? 'Edit meal' : 'Create meal'}</Typography><Typography color="text.secondary">Keep draft content together and review it before publishing.</Typography></Box><Stack direction="row" gap={1}><Button onClick={() => navigate('/meals')}>Cancel</Button><Button type="button" variant="contained" disabled={mutation.isPending} onClick={saveAndContinue}>Save and continue</Button></Stack></Stack>{mutation.isError && <Alert severity="error">The meal could not be saved. Review the fields and try again.</Alert>}<Grid container spacing={3}><Grid size={{ xs: 12, lg: 3 }}><MealFormStepper sections={sections} activeStep={section} onStepChange={setSection} errors={errors} /></Grid><Grid size={{ xs: 12, lg: 9 }}><Card><CardContent sx={{ p: { xs: 2, md: 4 } }}>{section === 0 && <Basic register={register} control={control} errors={errors} readOnlySku={editing} />}{section === 1 && <Translations register={register} errors={errors} language={language} setLanguage={setLanguage} />}{section === 2 && <NutritionEditor register={register} nutrition={nutrition} errors={errors} />}{section === 3 && <DietaryEditor control={control} />}{section === 4 && <IngredientsAndAllergens control={control} />}{section === 5 && <><Typography variant="h2" mb={2}>Images & media</Typography><ImageUploader mealId={activeMealId} originalPreviewUrl={originalImageUrl} thumbnailPreviewUrl={thumbnailImageUrl} onComplete={() => query.refetch()} /></>}{section === 6 && <IndividualPricing control={control} register={register} errors={errors} />}{section === 7 && <AvailabilityEditor control={control} register={register} errors={errors} />}{section === 8 && <Review values={watch()} errors={errors} hasImage={Boolean(primaryMedia)} onPublish={handleSubmit((values) => publishMutation.mutate(values))} isPublishing={publishMutation.isPending} publishError={publishMutation.isError} />}</CardContent></Card></Grid></Grid><Stack direction="row" justifyContent="flex-end" gap={1}><Button disabled={section === 0} onClick={() => setSection((v) => v-1)}>Previous</Button><Button variant="contained" disabled={section === sections.length-1} onClick={() => setSection((v) => v+1)}>Next section</Button></Stack></Stack>; }
type Register = ReturnType<typeof useForm<MealFormValues>>['register']; type Errors = ReturnType<typeof useForm<MealFormValues>>['formState']['errors'];
function Basic({ register, control, errors, readOnlySku }: { register: Register; control: ReturnType<typeof useForm<MealFormValues>>['control']; errors: Errors; readOnlySku: boolean }) { const categories=useQuery({queryKey:['meal-categories','dropdown'],queryFn:({signal})=>masterDataApi.list('meal-categories',{page:1,pageSize:100,sort:'displayOrder_asc'},signal),staleTime:5*60*1000}); return <Stack spacing={3}><Typography variant="h2">Basic information</Typography><Grid container spacing={2}><Grid size={{xs:12,md:6}}><TextField fullWidth label="SKU" {...register('sku')} slotProps={{ input: { readOnly: readOnlySku } }} error={!!errors.sku} helperText={errors.sku?.message ?? (readOnlySku ? 'SKU cannot be changed after the meal is created.' : undefined)} /></Grid><Grid size={{xs:12,md:6}}><Controller control={control} name="categoryId" render={({field})=>{const options=(categories.data?.items??[]).filter(category=>category.isActive||category.id===field.value);return <TextField {...field} value={field.value??''} fullWidth select label="Category" disabled={categories.isLoading||categories.isError} error={!!errors.categoryId||categories.isError} helperText={categories.isError?'Unable to load categories.':errors.categoryId?.message}><MenuItem value="" disabled>{categories.isLoading?'Loading categories…':'Select a category'}</MenuItem>{options.map(category=><MenuItem value={category.id} key={category.id}>{category.nameEn}{!category.isActive?' — Inactive':''}</MenuItem>)}</TextField>;}}/></Grid><Grid size={{xs:12,md:6}}><TextField fullWidth type="number" label="Preparation time (minutes)" {...register('preparationMinutes')} /></Grid></Grid></Stack>; }
function IngredientsAndAllergens({ control }: { control: ReturnType<typeof useForm<MealFormValues>>['control'] }) {
  const ingredientsQuery = useQuery({ queryKey: ['ingredients', 'meal-form'], queryFn: ({ signal }) => masterDataApi.list('ingredients', { page: 1, pageSize: 100, sort: 'nameEn_asc' }, signal), staleTime: 5 * 60 * 1000 });
  const allergensQuery = useQuery({ queryKey: ['allergens', 'meal-form'], queryFn: ({ signal }) => masterDataApi.list('allergens', { page: 1, pageSize: 100, sort: 'nameEn_asc' }, signal), staleTime: 5 * 60 * 1000 });
  const ingredients = ingredientsQuery.data?.items ?? [];
  const allergens = allergensQuery.data?.items ?? [];
  return <Stack spacing={2.5}>
    <Box>
      <Typography variant="h2">Ingredients & allergens</Typography>
      <Typography color="text.secondary" mt={0.5}>Choose what goes into this meal and identify any known allergens.</Typography>
    </Box>
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#FCFDFC' }}>
    <Grid container spacing={0}>
      <Grid size={{ xs: 12, lg: 6 }} sx={{ p: { xs: 2, md: 2.5 } }}>
        <Controller control={control} name="ingredients" render={({ field }) => {
          const ids = new Set(field.value.map((link) => link.ingredientId));
          const options = ingredients.filter((item) => item.isActive || ids.has(item.id));
          const selected = options.filter((item) => ids.has(item.id));
          return <Stack spacing={1.75}>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,103,78,.09)', color: 'primary.main', '& svg': { fontSize: 20 } }}><SpaOutlined /></Box>
              <Box flex={1}><Typography variant="h3">Ingredients</Typography><Typography variant="caption" color="text.secondary">Items used to prepare the meal</Typography></Box>
              <Typography variant="caption" color="text.secondary">{field.value.length} selected</Typography>
            </Stack>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={options}
              value={selected}
              loading={ingredientsQuery.isLoading}
              noOptionsText="No ingredients found"
              getOptionLabel={(item) => `${item.nameEn} (${item.code})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionDisabled={(item) => !item.isActive && !ids.has(item.id)}
              onChange={(_, values) => field.onChange(values.map((item, index) => { const existing = field.value.find((link) => link.ingredientId === item.id); return existing ? { ...existing, displayOrder: index } : { ingredientId: item.id, isOptional: false, canBeRemoved: false, canBeReplaced: false, isPrimaryIngredient: false, displayOrder: index }; }))}
              renderTags={() => null}
              renderInput={(params) => <TextField {...params} label="Search ingredients" placeholder="Type a name or code" error={ingredientsQuery.isError} helperText={ingredientsQuery.isError ? 'Unable to load ingredients.' : undefined} sx={{ bgcolor: 'background.paper' }} />}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">Selected ingredients</Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} mt={0.75}>
                {selected.length ? selected.map((item) => <Chip key={item.id} size="small" label={item.nameEn} onDelete={() => field.onChange(field.value.filter((link) => link.ingredientId !== item.id))} sx={{ bgcolor: 'rgba(0,103,78,.08)', color: 'primary.dark', '& .MuiChip-deleteIcon': { color: 'rgba(0,103,78,.45)' } }} />) : <Typography variant="body2" color="text.disabled">None selected</Typography>}
              </Stack>
            </Box>
          </Stack>;
        }} />
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }} sx={{ p: { xs: 2, md: 2.5 }, borderTop: { xs: 1, lg: 0 }, borderInlineStart: { lg: 1 }, borderColor: 'divider' }}>
        <Controller control={control} name="allergens" render={({ field }) => {
          const ids = new Set(field.value.map((link) => link.allergenId));
          const options = allergens.filter((item) => item.isActive || ids.has(item.id));
          const selected = options.filter((item) => ids.has(item.id));
          return <Stack spacing={1.75}>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(254,90,53,.10)', color: 'warning.main', '& svg': { fontSize: 20 } }}><WarningAmberOutlined /></Box>
              <Box flex={1}><Typography variant="h3">Allergens</Typography><Typography variant="caption" color="text.secondary">Known allergen declarations</Typography></Box>
              <Typography variant="caption" color={field.value.length ? 'warning.main' : 'text.secondary'}>{field.value.length} selected</Typography>
            </Stack>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={options}
              value={selected}
              loading={allergensQuery.isLoading}
              noOptionsText="No allergens found"
              getOptionLabel={(item) => `${item.nameEn} (${item.code})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionDisabled={(item) => !item.isActive && !ids.has(item.id)}
              onChange={(_, values) => field.onChange(values.map((item) => field.value.find((link) => link.allergenId === item.id) ?? { allergenId: item.id, level: 'CONTAINS' as const }))}
              renderTags={() => null}
              renderInput={(params) => <TextField {...params} label="Search allergens" placeholder="Type a name or code" error={allergensQuery.isError} helperText={allergensQuery.isError ? 'Unable to load allergens.' : undefined} sx={{ bgcolor: 'background.paper' }} />}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">Selected allergens</Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} mt={0.75}>
                {selected.length ? selected.map((item) => <Chip key={item.id} size="small" label={item.nameEn} onDelete={() => field.onChange(field.value.filter((link) => link.allergenId !== item.id))} sx={{ bgcolor: 'rgba(254,90,53,.09)', color: '#96361F', '& .MuiChip-deleteIcon': { color: 'rgba(150,54,31,.45)' } }} />) : <Typography variant="body2" color="text.disabled">None selected</Typography>}
              </Stack>
            </Box>
            <Stack direction="row" alignItems="center" gap={0.75} color="warning.main"><WarningAmberOutlined sx={{ fontSize: 16 }} /><Typography variant="caption">Selections must be verified by an authorized reviewer.</Typography></Stack>
          </Stack>;
        }} />
      </Grid>
    </Grid>
    </Box>
    <Controller control={control} name="allergenReviewConfirmed" render={({ field }) => (
      <FormControlLabel
        control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
        label="I confirm that the allergen information has been reviewed."
      />
    )} />
  </Stack>;
}
function Translations({ register, errors, language, setLanguage }: { register: Register; errors: Errors; language: 'en'|'ar'; setLanguage: (l:'en'|'ar') => void }) { const p = `translations.${language}` as const; return <Stack key={language} spacing={2} dir={language === 'ar' ? 'rtl' : 'ltr'}><Typography variant="h2">Translations</Typography><Tabs value={language} onChange={(_,v:'en'|'ar') => setLanguage(v)}><Tab value="en" label="English" /><Tab value="ar" label="العربية" /></Tabs><TextField label="Name" {...register(`${p}.name`)} error={language === 'en' && !!errors.translations?.en?.name} helperText={language === 'en' ? errors.translations?.en?.name?.message : undefined} /><TextField label="Short description" multiline rows={2} {...register(`${p}.shortDescription`)} /><TextField label="Full description" multiline rows={5} {...register(`${p}.fullDescription`)} /><TextField label="Preparation instructions" multiline rows={3} {...register(`${p}.preparationInstructions`)} /><TextField label="Serving notes" {...register(`${p}.servingNotes`)} /></Stack>; }
function defaultPriceStart() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function IndividualPricing({ control, register, errors }: { control: ReturnType<typeof useForm<MealFormValues>>['control']; register: Register; errors: Errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'prices' });
  const addPrice = () => append({ priceType: 'INDIVIDUAL', currencyCode: 'QAR', amount: 0, effectiveFrom: defaultPriceStart(), effectiveUntil: '', isActive: true });

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
      <Box><Typography variant="h2">Individual pricing</Typography><Typography color="text.secondary">Set the customer price and the period when it applies.</Typography></Box>
      {!!fields.length && <Button variant="outlined" size="small" startIcon={<AddOutlined />} onClick={addPrice}>Add price</Button>}
    </Stack>
    {!fields.length ? <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 3, py: 5, px: 2, textAlign: 'center', bgcolor: 'background.default' }}>
      <Typography variant="h3" mb={0.5}>No individual price yet</Typography>
      <Typography color="text.secondary" mb={2}>Add a price to make individual meal pricing available.</Typography>
      <Button variant="contained" startIcon={<AddOutlined />} onClick={addPrice}>Add price</Button>
    </Box> : fields.map((field, index) => {
      const fieldErrors = errors.prices?.[index];
      return <Box key={field.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="center" gap={1}><Typography variant="h3">Price {index + 1}</Typography><Chip size="small" label="Individual" color="primary" variant="outlined" /></Stack>
          <IconButton size="small" color="error" aria-label={`Remove price ${index + 1}`} onClick={() => remove(index)}><DeleteOutline /></IconButton>
        </Stack>
        <input type="hidden" {...register(`prices.${index}.priceType`)} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth select label="Currency" defaultValue="QAR" {...register(`prices.${index}.currencyCode`)} error={!!fieldErrors?.currencyCode} helperText={fieldErrors?.currencyCode?.message}><MenuItem value="QAR">QAR</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth type="number" label="Amount" inputProps={{ min: 0, step: '0.01' }} {...register(`prices.${index}.amount`)} error={!!fieldErrors?.amount} helperText={fieldErrors?.amount?.message} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="datetime-local" label="Effective from" InputLabelProps={{ shrink: true }} {...register(`prices.${index}.effectiveFrom`)} error={!!fieldErrors?.effectiveFrom} helperText={fieldErrors?.effectiveFrom?.message} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="datetime-local" label="Effective until (optional)" InputLabelProps={{ shrink: true }} {...register(`prices.${index}.effectiveUntil`)} error={!!fieldErrors?.effectiveUntil} helperText={fieldErrors?.effectiveUntil?.message} /></Grid>
          <Grid size={{ xs: 12 }}><Controller control={control} name={`prices.${index}.isActive`} render={({ field: activeField }) => <FormControlLabel control={<Switch checked={activeField.value} onChange={(_, value) => activeField.onChange(value)} />} label="Price is active" />} /></Grid>
        </Grid>
      </Box>;
    })}
  </Stack>;
}

function Review({ values, errors, hasImage, onPublish, isPublishing, publishError }: { values: MealFormValues; errors: Errors; hasImage: boolean; onPublish: () => void; isPublishing: boolean; publishError: boolean }) {
  const errorCount = Object.keys(errors).length;
  const publishIssues = getMealPublishIssues(values, { hasImage });
  const hasIssues = errorCount > 0 || publishIssues.length > 0;

  return <Stack spacing={2}>
    <Typography variant="h2">Review & publish</Typography>
    <Alert severity={hasIssues ? 'error' : 'success'}>
      {hasIssues ? 'Complete the required items before publishing.' : 'This meal is ready to publish.'}
    </Alert>
    {errorCount > 0 && <Typography color="error.main">{errorCount} form section(s) contain invalid values.</Typography>}
    {publishIssues.length > 0 && (
      <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 3 }}>
        {publishIssues.map((issue) => <Typography component="li" key={issue}>{issue}</Typography>)}
      </Stack>
    )}
    {publishError && <Alert severity="error">The meal was saved, but it could not be published. Please try again.</Alert>}
    <Typography><strong>SKU:</strong> {values.sku || 'Missing'}</Typography>
    <Typography><strong>English name:</strong> {values.translations.en.name || 'Missing'}</Typography>
    <Typography><strong>Arabic translation:</strong> {values.translations.ar?.name || 'Missing'}</Typography>
    <Typography><strong>Availability:</strong> {values.availability.mode}</Typography>
    <Button type="button" variant="contained" disabled={hasIssues || isPublishing} onClick={onPublish}>
      {isPublishing ? 'Publishing…' : 'Publish meal'}
    </Button>
  </Stack>;
}
