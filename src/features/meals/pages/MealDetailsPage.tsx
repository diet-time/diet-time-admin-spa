import { ArrowBack, BrokenImageOutlined, CalendarMonthOutlined, Edit, RestaurantOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { mealsApi } from '@/api/mealsApi';
import { WriteGuard } from '@/auth/ScreenAccess';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import { NutritionMetricCard } from '../components/NutritionMetricCard';

function MediaPreview({ title, url, alt, height }: { title: string; url?: string; alt: string; height: number }) {
  return <Stack spacing={1}>
    <Typography variant="h3">{title}</Typography>
    {url ? <Box
      component="img"
      src={url}
      alt={alt}
      sx={{ width: '100%', height, objectFit: 'contain', borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}
    /> : <Box sx={{ height, display: 'grid', placeItems: 'center', borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.default', color: 'text.secondary' }}>
      <Stack alignItems="center" spacing={1}>
        <BrokenImageOutlined sx={{ fontSize: 42 }} />
        <Typography variant="body2">No {title.toLowerCase()} uploaded</Typography>
      </Stack>
    </Box>}
  </Stack>;
}

const formatQatarDateTime = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value.includes('Z') || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}:00+03:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString('en-QA', {
    timeZone: 'Asia/Qatar',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export function MealDetailsPage() {
  const { mealId = '' } = useParams();
  const query = useQuery({ queryKey: ['meal', mealId], queryFn: ({ signal }) => mealsApi.get(mealId, signal) });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message="Unable to load this meal." onRetry={() => void query.refetch()} />;

  const meal = query.data;
  const primaryMedia = meal.media.find((media) => media.mediaType === 'MEALITEM' && media.isPrimary)
    ?? meal.media.find((media) => media.mediaType === 'MEALITEM');
  const originalImageUrl = primaryMedia?.publicUrl;
  const thumbnailImageUrl = primaryMedia?.thumbnailUrl
    ?? meal.media.find((media) => media.mediaType === 'THUMBNAIL')?.publicUrl;
  const imageAlt = primaryMedia?.altTextEn || meal.translations.en.name;
  const macroData = [
    { name: 'Protein', value: meal.nutrition.protein * 4, grams: meal.nutrition.protein, color: '#287D4A' },
    { name: 'Carbohydrates', value: meal.nutrition.carbohydrates * 4, grams: meal.nutrition.carbohydrates, color: '#D39A16' },
    { name: 'Fat', value: meal.nutrition.fat * 9, grams: meal.nutrition.fat, color: '#7048A8' },
  ].filter((macro) => macro.value > 0);
  const additionalNutrients = Object.entries(meal.nutrition).filter(([key]) =>
    !['servingQuantity', 'servingUnit', 'calories', 'protein', 'carbohydrates', 'fat'].includes(key));
  const availableFrom = formatQatarDateTime(meal.availability.availableFrom);
  const availableUntil = formatQatarDateTime(meal.availability.availableUntil);

  return <Stack spacing={3}>
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Button component={Link} to="/meals" startIcon={<ArrowBack />} sx={{ ml: -1 }}>
          Back to meals
        </Button>
        <WriteGuard>
          <Button component={Link} to={`/meals/${mealId}/edit`} variant="contained" startIcon={<Edit />}>
            Edit meal
          </Button>
        </WriteGuard>
      </Stack>
      <Box>
        <Typography variant="h1">{meal.translations.en.name}</Typography>
        <Stack direction="row" alignItems="center" gap={1} mt={0.5}>
          <Typography color="text.secondary">{meal.sku}</Typography>
          <Chip
            size="small"
            label={meal.status}
            color={meal.status === 'Active' ? 'success' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Box>
    </Stack>

    <Alert severity={meal.availability.isAvailable ? 'success' : 'warning'}>
      {meal.availability.isAvailable ? 'This meal is currently configured as selectable.' : 'This meal is unavailable.'}
    </Alert>

    <Card>
      <CardContent>
        <Typography variant="h2" mb={2}>Images & media</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <MediaPreview title="Original image" url={originalImageUrl} alt={`${imageAlt} original`} height={320} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <MediaPreview title="Thumbnail" url={thumbnailImageUrl} alt={`${imageAlt} thumbnail`} height={240} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card><CardContent>
          <Stack direction="row" alignItems="center" gap={1}>
            <RestaurantOutlined color="primary" />
            <Box>
              <Typography variant="h2">Nutrition profile</Typography>
              <Typography variant="body2" color="text.secondary">
                Per {meal.nutrition.servingQuantity} {meal.nutrition.servingUnit}
              </Typography>
            </Box>
          </Stack>
          <Grid container spacing={2.5} mt={0.5} alignItems="center">
            <Grid size={{ xs: 12, sm: 5 }}>
              <Box sx={{ height: 230, position: 'relative' }}>
                {macroData.length ? <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={83} paddingAngle={3}>
                      {macroData.map((macro) => <Cell key={macro.name} fill={macro.color} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(value, name, item) => [`${item.payload.grams} g`, name]} />
                    <Legend iconType="circle" iconSize={9} />
                  </PieChart>
                </ResponsiveContainer> : <Typography color="text.secondary" sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>No macro data</Typography>}
                <Box sx={{ position: 'absolute', inset: '54px 0 auto', textAlign: 'center', pointerEvents: 'none' }}>
                  <Typography variant="h2">{meal.nutrition.calories}</Typography>
                  <Typography variant="caption" color="text.secondary">kcal</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Grid container spacing={1.5}>
                {(['protein', 'carbohydrates', 'fat'] as const).map((key) => <Grid size={{ xs: 4, sm: 12 }} key={key}>
                  <NutritionMetricCard metric={key} value={meal.nutrition[key]} />
                </Grid>)}
              </Grid>
            </Grid>
          </Grid>
          {additionalNutrients.length > 0 && <>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="h3" mb={1.5}>Additional nutrients</Typography>
            <Grid container spacing={1.5}>
              {additionalNutrients.map(([key, value]) => <Grid size={{ xs: 6, sm: 4 }} key={key}>
                <NutritionMetricCard metric={key} value={value} />
              </Grid>)}
            </Grid>
          </>}
          <Grid container spacing={1.5} mt={2}>
            <Grid size={{ xs: 6 }}><NutritionMetricCard metric="servingQuantity" value={meal.nutrition.servingQuantity} /></Grid>
            <Grid size={{ xs: 6 }}><NutritionMetricCard metric="servingUnit" value={meal.nutrition.servingUnit} /></Grid>
          </Grid>
        </CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card><CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Stack direction="row" alignItems="center" gap={1}>
              <CalendarMonthOutlined color="primary" />
              <Typography variant="h2">Availability</Typography>
            </Stack>
            <Chip
              size="small"
              label={meal.availability.isAvailable ? (availableFrom || availableUntil ? 'Scheduled' : 'Always available') : 'Unavailable'}
              color={meal.availability.isAvailable ? 'success' : 'warning'}
              variant="outlined"
            />
          </Stack>
          <Stack mt={2.5} spacing={0}>
            <Box sx={{ position: 'relative', pl: 3, pb: 3, borderLeft: '2px solid', borderColor: 'primary.light' }}>
              <Box sx={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', bgcolor: 'primary.main', left: -7, top: 4 }} />
              <Typography variant="caption" color="text.secondary">Available from</Typography>
              <Typography fontWeight={750}>{availableFrom ?? 'No start date'}</Typography>
            </Box>
            <Box sx={{ position: 'relative', pl: 3 }}>
              <Box sx={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', bgcolor: availableUntil ? 'primary.main' : 'grey.400', left: -5, top: 4 }} />
              <Typography variant="caption" color="text.secondary">Available until</Typography>
              <Typography fontWeight={750}>{availableUntil ?? 'No end date'}</Typography>
            </Box>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mt={3}>
            All availability times are shown in Qatar time (UTC+3).
          </Typography>
        </CardContent></Card>
      </Grid>
    </Grid>
  </Stack>;
}
