import { EditOutlined, MenuBookOutlined, PaidOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { plansApi } from '@/api/plansApi';
import type { PlanSummary } from '@/api/apiTypes';
import { StatusChip } from '@/components/common/StatusChip';
import { EmptyState, ErrorState } from '@/components/feedback/PageState';

export function PlanListPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['plans', 'complete-balance-current'],
    queryFn: ({ signal }) => plansApi.list({ page: 1, pageSize: 100 }, signal),
  });
  const compareVersions = (left: PlanSummary, right: PlanSummary) =>
    (right.versionNumber ?? 0) - (left.versionNumber ?? 0) || right.updatedAt.localeCompare(left.updatedAt);
  const completeBalanceVersions = (query.data?.items ?? [])
    .filter((item) => item.nameEn.trim().toLocaleLowerCase() === 'complete balance');
  const publishedPlan = completeBalanceVersions.filter((item) => item.published && item.active).sort(compareVersions)[0];
  const draftPlan = completeBalanceVersions.filter((item) => !item.published).sort(compareVersions)[0];
  const plan = publishedPlan ?? draftPlan;
  const planStatus = publishedPlan ? 'Published' : 'Draft';
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
      {!query.isLoading && !query.isError && !plan ? <EmptyState title="No published Complete Balance plan found" /> : null}
      {plan && (
        <Card>
          <Stack direction={{ xs: 'column', md: 'row' }}>
            {imageUrl ? <Box component="img" src={imageUrl} alt="Complete Balance" sx={{ width: { xs: '100%', md: 300 }, height: { xs: 190, md: 'auto' }, objectFit: 'cover' }} /> : null}
            <CardContent sx={{ flex: 1, p: { xs: 2.5, md: 3 } }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box><Typography variant="h2">Complete Balance</Typography><Typography color="text.secondary">Standard Meal Plan</Typography></Box>
                  <StatusChip label={planStatus} />
                </Stack>
                <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                  <Chip label="4-Week Rotating Menu" color="primary" variant="outlined" />
                  <Chip label="24 delivery days per complete cycle" variant="outlined" />
                  <Chip label="Saturday – Thursday" variant="outlined" />
                </Stack>
                {!publishedPlan && <Alert severity="warning">This menu is saved as a draft and is not available to customers until it is published.</Alert>}
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
