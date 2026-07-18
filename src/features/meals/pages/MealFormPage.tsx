import { zodResolver } from '@hookform/resolvers/zod';
import { AddOutlined, DeleteOutline, SpaOutlined, WarningAmberOutlined } from '@mui/icons-material';
import { Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Divider, FormControlLabel, Grid, IconButton, MenuItem, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { masterDataApi } from '@/api/masterDataApi';
import { mealsApi } from '@/api/mealsApi';
import { queryClient } from '@/app/queryClient';
import { ImageUploader } from '@/components/media/ImageUploader';
import { AvailabilityEditor, toUtcIso } from '../components/AvailabilityEditor';
import { defaultMealValues, mealSchema, type MealFormValues } from '../schemas/mealSchema';
const sections = ['Basic information','Translations','Nutrition','Dietary attributes','Ingredients & allergens','Images','Individual pricing','Availability','Review & publish'];
export function MealFormPage() { const { mealId } = useParams(); const [savedMealId, setSavedMealId] = useState<string>(); const activeMealId = mealId ?? savedMealId; const editing = !!activeMealId; const navigate = useNavigate(); const [section, setSection] = useState(0); const [language, setLanguage] = useState<'en'|'ar'>('en'); const query = useQuery({ queryKey: ['meal-edit',activeMealId], queryFn: () => mealsApi.get(activeMealId!), enabled: !!activeMealId }); const form = useForm<MealFormValues>({ resolver: zodResolver(mealSchema), defaultValues: defaultMealValues, mode: 'onBlur' }); const { register, control, handleSubmit, reset, watch, formState: { errors, isDirty } } = form; useEffect(() => { if (query.data) reset(query.data); }, [query.data, reset]); useEffect(() => { const beforeUnload = (event: BeforeUnloadEvent) => { if (isDirty) event.preventDefault(); }; window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload); }, [isDirty]); const mutation = useMutation({ mutationFn: async ({ values, intent }: { values: MealFormValues; intent: 'draft' | 'continue' }) => { const payload = { ...values, availability: { ...values.availability, availableFrom: values.availability.availableFrom ? toUtcIso(values.availability.availableFrom) : undefined, availableUntil: values.availability.availableUntil ? toUtcIso(values.availability.availableUntil) : undefined } }; const result = activeMealId ? await mealsApi.update(activeMealId, payload) : await mealsApi.create(payload); return { result, intent }; }, onSuccess: async ({ result, intent }) => { if (!activeMealId && result && typeof result === 'object' && 'id' in result) setSavedMealId(result.id); await queryClient.invalidateQueries({ queryKey: ['meals'] }); if (intent === 'continue') setSection((value) => Math.min(value + 1, sections.length - 1)); else navigate('/meals'); } }); const submit = handleSubmit((values) => mutation.mutate({ values, intent: 'draft' })); const saveAndContinue = handleSubmit((values) => mutation.mutate({ values, intent: 'continue' })); const nutrition = watch('nutrition'); const from = watch('availability.availableFrom'); const until = watch('availability.availableUntil'); const primaryMedia = query.data?.media.find((media) => media.mediaType === 'IMAGE' && media.isPrimary) ?? query.data?.media.find((media) => media.mediaType === 'IMAGE'); const originalImageUrl = primaryMedia?.publicUrl; const thumbnailImageUrl = primaryMedia?.thumbnailUrl; if (query.isLoading) return <CircularProgress />; return <Stack spacing={3} component="form" onSubmit={submit}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h1">{editing ? 'Edit meal' : 'Create meal'}</Typography><Typography color="text.secondary">Keep draft content together and review it before publishing.</Typography></Box><Stack direction="row" gap={1}><Button onClick={() => navigate('/meals')}>Cancel</Button><Button type="submit" variant="outlined" disabled={mutation.isPending}>Save draft</Button><Button type="button" variant="contained" disabled={mutation.isPending} onClick={saveAndContinue}>Save and continue</Button></Stack></Stack>{mutation.isError && <Alert severity="error">The meal could not be saved. Review the fields and try again.</Alert>}<Grid container spacing={3}><Grid size={{ xs: 12, lg: 3 }}><Card><Tabs orientation="vertical" value={section} onChange={(_, v: number) => setSection(v)} variant="scrollable" aria-label="Meal form sections">{sections.map((s,i) => <Tab key={s} label={`${i+1}. ${s}`} sx={{ alignItems: 'flex-start' }} />)}</Tabs></Card></Grid><Grid size={{ xs: 12, lg: 9 }}><Card><CardContent sx={{ p: { xs: 2, md: 4 } }}>{section === 0 && <Basic register={register} control={control} errors={errors} />}{section === 1 && <Translations register={register} errors={errors} language={language} setLanguage={setLanguage} />}{section === 2 && <Nutrition register={register} nutrition={nutrition} errors={errors} />}{section === 3 && <Dietary control={control} register={register} />}{section === 4 && <IngredientsAndAllergens control={control} />}{section === 5 && <><Typography variant="h2" mb={2}>Images & media</Typography><ImageUploader mealId={activeMealId} originalPreviewUrl={originalImageUrl} thumbnailPreviewUrl={thumbnailImageUrl} onComplete={() => query.refetch()} /></>}{section === 6 && <IndividualPricing control={control} register={register} errors={errors} />}{section === 7 && <><Typography variant="h2" mb={2}>Availability timeline</Typography><AvailabilityEditor control={control} register={register} errors={errors} from={from} until={until} /></>}{section === 8 && <Review values={watch()} errors={errors} />}</CardContent></Card></Grid></Grid><Stack direction="row" justifyContent="flex-end" gap={1}><Button disabled={section === 0} onClick={() => setSection((v) => v-1)}>Previous</Button><Button variant="contained" disabled={section === sections.length-1} onClick={() => setSection((v) => v+1)}>Next section</Button></Stack></Stack>; }
type Register = ReturnType<typeof useForm<MealFormValues>>['register']; type Errors = ReturnType<typeof useForm<MealFormValues>>['formState']['errors'];
function Basic({ register, control, errors }: { register: Register; control: ReturnType<typeof useForm<MealFormValues>>['control']; errors: Errors }) { const categories=useQuery({queryKey:['meal-categories','dropdown'],queryFn:({signal})=>masterDataApi.list('meal-categories',{page:1,pageSize:100,sort:'displayOrder_asc'},signal),staleTime:5*60*1000}); return <Stack spacing={3}><Typography variant="h2">Basic information</Typography><Grid container spacing={2}><Grid size={{xs:12,md:6}}><TextField fullWidth label="SKU" {...register('sku')} error={!!errors.sku} helperText={errors.sku?.message} /></Grid><Grid size={{xs:12,md:6}}><Controller control={control} name="categoryId" render={({field})=>{const options=(categories.data?.items??[]).filter(category=>category.isActive||category.id===field.value);return <TextField {...field} value={field.value??''} fullWidth select label="Category" disabled={categories.isLoading||categories.isError} error={!!errors.categoryId||categories.isError} helperText={categories.isError?'Unable to load categories.':errors.categoryId?.message}><MenuItem value="" disabled>{categories.isLoading?'Loading categories…':'Select a category'}</MenuItem>{options.map(category=><MenuItem value={category.id} key={category.id}>{category.nameEn}{!category.isActive?' — Inactive':''}</MenuItem>)}</TextField>;}}/></Grid><Grid size={{xs:12,md:6}}><TextField fullWidth type="number" label="Preparation time (minutes)" {...register('preparationMinutes')} /></Grid><Grid size={{xs:12,md:6}}><Controller control={control} name="status" render={({field})=><TextField {...field} value={field.value} fullWidth select label="Status">{['Draft','Published','Active','Inactive','Archived'].map((value)=><MenuItem value={value} key={value} disabled={value==='Published'&&field.value!=='Published'}>{value}{value==='Published'?' (read-only)':''}</MenuItem>)}</TextField>}/></Grid></Grid></Stack>; }
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

function Nutrition({ register, nutrition, errors }: { register: Register; nutrition: MealFormValues['nutrition']; errors: Errors }) { const fields = ['calories','protein','carbohydrates','fat','saturatedFat','transFat','fibre','sugar','sodium','cholesterol'] as const; return <Stack spacing={3}><Typography variant="h2">Nutrition</Typography><Grid container spacing={2}><Grid size={{xs:6,md:3}}><TextField fullWidth type="number" label="Serving quantity" {...register('nutrition.servingQuantity')} /></Grid><Grid size={{xs:6,md:3}}><TextField fullWidth label="Serving unit" {...register('nutrition.servingUnit')} /></Grid>{fields.map((f) => <Grid key={f} size={{xs:6,md:3}}><TextField fullWidth type="number" label={f.replace(/([A-Z])/g,' $1')} {...register(`nutrition.${f}`)} error={!!errors.nutrition?.[f]} helperText={errors.nutrition?.[f]?.message} /></Grid>)}</Grid><Divider /><Box display="grid" gridTemplateColumns="repeat(4,1fr)" gap={1}>{[['Calories',nutrition.calories,'kcal'],['Protein',nutrition.protein,'g'],['Carbs',nutrition.carbohydrates,'g'],['Fat',nutrition.fat,'g']].map(([l,v,u]) => <Box key={String(l)} textAlign="center" p={2} bgcolor="background.default" borderRadius={2}><Typography variant="h3">{v}{u}</Typography><Typography variant="caption">{l}</Typography></Box>)}</Box></Stack>; }
function Dietary({ control, register }: { control: ReturnType<typeof useForm<MealFormValues>>['control']; register: Register }) { const fields = [['vegetarian','Vegetarian'],['vegan','Vegan'],['glutenFree','Gluten-free'],['dairyFree','Dairy-free'],['nutFree','Nut-free'],['spicy','Spicy']] as const; return <Stack spacing={2}><Typography variant="h2">Dietary attributes</Typography>{fields.map(([name,label]) => <Controller key={name} control={control} name={`dietary.${name}`} render={({field}) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(_,v) => field.onChange(v)} />} label={label} />} />)}<TextField type="number" label="Spice level (0–5)" {...register('dietary.spiceLevel')} /></Stack>; }
function Review({ values, errors }: { values: MealFormValues; errors: Errors }) { const errorCount = Object.keys(errors).length; return <Stack spacing={2}><Typography variant="h2">Review & publish</Typography><Alert severity={errorCount ? 'error' : 'success'}>{errorCount ? `${errorCount} section(s) need attention before publishing.` : 'Core meal validation is complete.'}</Alert><Typography><strong>SKU:</strong> {values.sku || 'Missing'}</Typography><Typography><strong>English name:</strong> {values.translations.en.name || 'Missing'}</Typography><Typography><strong>Arabic translation:</strong> {values.translations.ar?.name || 'Missing — publishing policy may block this'}</Typography><Typography><strong>Availability:</strong> {values.availability.mode}</Typography><Button variant="contained" disabled={errorCount > 0}>Publish meal</Button></Stack>; }
