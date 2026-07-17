import { Add, DeleteOutline, EditOutlined, MoreHoriz, Search } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { plansApi } from '@/api/plansApi';
import type { PlanSummary } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { RoleGuard } from '@/auth/RoleGuard';
import { StatusChip } from '@/components/common/StatusChip';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

interface RowMenuState {
  anchor: HTMLElement;
  plan: PlanSummary;
}

export function PlanListPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const [deletePlan, setDeletePlan] = useState<PlanSummary | null>(null);
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['plans', { page, search }],
    queryFn: ({ signal }) => plansApi.list({ page: page + 1, pageSize: 25, search: search || undefined }, signal),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess: async () => {
      setDeletePlan(null);
      if ((query.data?.items.length ?? 0) === 1 && page > 0) setPage((current) => current - 1);
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
  const items = query.data?.items ?? [];

  const closeMenu = () => setRowMenu(null);
  const editSelectedPlan = () => {
    if (!rowMenu) return;
    const id = rowMenu.plan.id;
    closeMenu();
    navigate(`/meal-plans/${id}/edit`);
  };
  const confirmSelectedPlanDeletion = () => {
    if (!rowMenu) return;
    setDeletePlan(rowMenu.plan);
    closeMenu();
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography variant="h1">Meal plan templates</Typography>
          <Typography color="text.secondary">Build, validate, price, and publish customer meal programmes.</Typography>
        </Box>
        <RoleGuard allowedRoles={['Dietitian']}>
          <Button component={Link} to="/meal-plans/new" variant="contained" startIcon={<Add />}>Create plan</Button>
        </RoleGuard>
      </Stack>
      <Card>
        <Box p={2}>
          <TextField
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Search plan code or name"
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
          />
        </Box>
        {deleteMutation.isError && (
          <Alert severity="error" sx={{ mx: 2, mb: 2 }}>The plan could not be deleted. Please try again.</Alert>
        )}
        {query.isLoading ? (
          <Box p={2}><LoadingState /></Box>
        ) : query.isError ? (
          <Box p={2}><ErrorState message="Unable to load meal plans." onRetry={() => void query.refetch()} /></Box>
        ) : !items.length ? (
          <EmptyState title="No plan templates found" />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['Code', 'Name', 'Plan type', 'Duration', 'Customizable', 'Published', 'Active', 'Validity', 'Price from', 'Updated', 'Actions'].map((heading) => (
                    <TableCell key={heading}>{heading}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.code}</TableCell>
                    <TableCell>{plan.nameEn}<Typography variant="caption" display="block" dir="rtl">{plan.nameAr}</Typography></TableCell>
                    <TableCell>{plan.planType}</TableCell>
                    <TableCell>{plan.durationDays} days</TableCell>
                    <TableCell>{plan.customizable ? 'Yes' : 'No'}</TableCell>
                    <TableCell><StatusChip label={plan.published ? 'Published' : 'Draft'} /></TableCell>
                    <TableCell><StatusChip label={plan.active ? 'Active' : 'Inactive'} /></TableCell>
                    <TableCell>{plan.validFrom || 'Open'} – {plan.validUntil || 'Open'}</TableCell>
                    <TableCell>{plan.priceFrom === undefined ? '—' : `QAR ${plan.priceFrom}`}</TableCell>
                    <TableCell>{new Date(plan.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(event) => setRowMenu({ anchor: event.currentTarget, plan })}
                        aria-label={`Actions for ${plan.nameEn || plan.code}`}
                        aria-haspopup="menu"
                      >
                        <MoreHoriz />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={query.data?.totalCount ?? 0}
          page={page}
          rowsPerPage={25}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPageOptions={[25]}
        />
      </Card>

      <Menu anchorEl={rowMenu?.anchor} open={!!rowMenu} onClose={closeMenu}>
        <MenuItem onClick={editSelectedPlan}>
          <EditOutlined fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={confirmSelectedPlanDeletion} sx={{ color: 'error.main' }}>
          <DeleteOutline fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog open={!!deletePlan} onClose={() => !deleteMutation.isPending && setDeletePlan(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete meal plan?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deletePlan?.nameEn || deletePlan?.code}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={deleteMutation.isPending} onClick={() => setDeletePlan(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!deletePlan || deleteMutation.isPending}
            onClick={() => deletePlan && deleteMutation.mutate(deletePlan.id)}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
