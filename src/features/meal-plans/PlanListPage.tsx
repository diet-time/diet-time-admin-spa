import { EditOutlined, MenuBookOutlined, PaidOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { plansApi } from '@/api/plansApi';
import { StatusChip } from '@/components/common/StatusChip';
import { EmptyState, ErrorState } from '@/components/feedback/PageState';

export function PlanListPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['plans', 'template-versions'],
    queryFn: ({ signal }) => plansApi.list({ page: 1, pageSize: 100 }, signal),
  });
  const plans = query.data?.items ?? [];
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const plan = plans.find((item) => item.id === selectedPlanId) ?? plans[0];
  const planStatus = plan?.published ? 'Published' : 'Draft';
  const detailQuery = useQuery({
    queryKey: ['plan-card-detail', plan?.id],
    queryFn: ({ signal }) => plansApi.get(plan!.id, signal),
    enabled: !!plan && !plan.imageUrl,
  });
  const imageUrl = plan?.imageUrl ?? detailQuery.data?.imageUrl;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Meal plan templates</Typography>
        <Typography color="text.secondary">Manage the current customer meal plan and its rotating menu.</Typography>
      </Box>
      {query.isLoading ? <Card><CardContent><Skeleton variant="rounded" height={220} /></CardContent></Card> : null}
      {query.isError ? <ErrorState message="Unable to load the current meal plan." onRetry={() => void query.refetch()} /> : null}
      {!query.isLoading && !query.isError && !plan ? <EmptyState title="No meal plan templates found" /> : null}
      {plans.length > 0 && <TextField select label="Template version" value={plan?.id ?? ''} onChange={(event) => setSelectedPlanId(event.target.value)}>
        {plans.map((item) => <MenuItem key={item.id} value={item.id}>{item.nameEn} · Version {item.versionNumber} · {item.published ? 'Published' : 'Draft'} · {item.id}</MenuItem>)}
      </TextField>}
      {plan && (
        <Card>
          <Stack direction={{ xs: 'column', md: 'row' }}>
            {imageUrl ? (
              <Box sx={{
                width: { xs: '100%', md: 300 },
                minWidth: { md: 300 },
                aspectRatio: '16 / 9',
                flexShrink: 0,
                bgcolor: 'background.default',
              }}>
                <Box component="img" src={imageUrl} alt={plan.nameEn} sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
            ) : null}
            <CardContent sx={{ flex: 1, p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box><Typography variant="h2">{plan.nameEn}</Typography><Typography color="text.secondary">Version {plan.versionNumber} · {plan.id}</Typography></Box>
                  <StatusChip label={planStatus} />
                </Stack>
                <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                  <Chip label="4-Week Rotating Menu" color="primary" variant="outlined" />
                  <Chip label="24 delivery days per complete cycle" variant="outlined" />
                  <Chip label="Saturday – Thursday" variant="outlined" />
                </Stack>
                {!plan.published && <Alert severity="warning">This menu is saved as a draft and is not available to customers until it is published.</Alert>}
                {plan.shortDescription && <Typography color="text.secondary">{plan.shortDescription}</Typography>}
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                  <Button variant="contained" startIcon={<EditOutlined />} onClick={() => navigate(`/meal-plans/${plan.id}/edit`)}>Edit Menu</Button>
                  <Button component={Link} to={`/meal-plans/${plan.id}/edit?view=menu`} startIcon={<VisibilityOutlined />}>View Menu</Button>
                  <Button component={Link} to="/admin/plan-pricing" startIcon={<PaidOutlined />}>View Pricing</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Stack>
        </Card>
      )}
      {plan && !imageUrl && !detailQuery.isLoading && <Alert severity="info" icon={<MenuBookOutlined />}>Add a meal plan image from Edit Menu to show it on this card.</Alert>}
    </Stack>
  );
}
