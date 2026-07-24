import { ArrowBack, BrokenImageOutlined, Edit } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { mealsApi } from '@/api/mealsApi';
import { RoleGuard } from '@/auth/RoleGuard';
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

  return <Stack spacing={3}>
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Button component={Link} to="/meals" startIcon={<ArrowBack />} sx={{ ml: -1 }}>
          Back to meals
        </Button>
        <RoleGuard allowedRoles={['Dietitian', 'ContentManager']}>
          <Button component={Link} to={`/meals/${mealId}/edit`} variant="contained" startIcon={<Edit />}>
            Edit meal
          </Button>
        </RoleGuard>
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
          <Typography variant="h2">Nutrition</Typography>
          <Grid container spacing={2} mt={1}>
            {Object.entries(meal.nutrition).map(([key, value]) => <Grid size={{ xs: 6, sm: 3 }} key={key}>
              <NutritionMetricCard metric={key} value={value} />
            </Grid>)}
          </Grid>
        </CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card><CardContent>
          <Typography variant="h2">Availability timeline</Typography>
          <Typography mt={2}>Mode: {meal.availability.mode}</Typography>
          <Typography>From: {meal.availability.availableFrom || 'No start'}</Typography>
          <Typography>Until: {meal.availability.availableUntil || 'No end'}</Typography>
        </CardContent></Card>
      </Grid>
    </Grid>
  </Stack>;
}
