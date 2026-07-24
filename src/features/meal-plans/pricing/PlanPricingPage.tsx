import { Add, DeleteOutline, EditOutlined, MoreHoriz, Search, VisibilityOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Switch,
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
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { planPricingApi, type PlanPrice, type PlanPriceInput, type PlanPriceStatus } from '@/api/planPricingApi';
import { plansApi } from '@/api/plansApi';
import type { PlanSummary } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';

const statuses: Array<{ value: '' | PlanPriceStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'INACTIVE', label: 'Inactive' },
];

interface Filters {
  search: string;
  mealPlanTemplateId: string;
  status: '' | PlanPriceStatus;
  currencyCode: string;
}

interface FormValues {
  mealPlanTemplateId: string;
  durationDays: string;
  mealsPerDay: string;
  snacksPerDay: string;
  currencyCode: string;
  amount: string;
  effectiveFrom: string;
  effectiveUntil: string;
  isActive: boolean;
}

interface ApiErrorEnvelope {
  errors?: Array<{ code?: string; message?: string }>;
}

const initialFilters: Filters = { search: '', mealPlanTemplateId: '', status: '', currencyCode: '' };
const toLocalDateTime = (value?: string | null) => value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : '';
const newForm = (currency = 'QAR'): FormValues => ({
  mealPlanTemplateId: '',
  durationDays: '',
  mealsPerDay: '',
  snacksPerDay: '0',
  currencyCode: currency,
  amount: '',
  effectiveFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  effectiveUntil: '',
  isActive: true,
});
const editForm = (price: PlanPrice): FormValues => ({
  mealPlanTemplateId: price.mealPlanTemplateId,
  durationDays: String(price.durationDays),
  mealsPerDay: String(price.mealsPerDay),
  snacksPerDay: String(price.snacksPerDay),
  currencyCode: price.currencyCode,
  amount: String(price.amount),
  effectiveFrom: toLocalDateTime(price.effectiveFrom),
  effectiveUntil: toLocalDateTime(price.effectiveUntil),
  isActive: price.isActive,
});
const apiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    return error.response?.data?.errors?.[0]?.message ?? fallback;
  }
  return fallback;
};
const priceLabel = (price: PlanPrice) =>
  `${price.currencyCode} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price.amount)}`;
const periodLabel = (price: PlanPrice) =>
  `${format(parseISO(price.effectiveFrom), 'dd MMM yyyy')} – ${price.effectiveUntil ? format(parseISO(price.effectiveUntil), 'dd MMM yyyy') : 'Ongoing'}`;

export function PlanPricingPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [dialog, setDialog] = useState<{ mode: 'add' | 'edit' | 'view'; price?: PlanPrice } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; price: PlanPrice } | null>(null);
  const [deletePrice, setDeletePrice] = useState<PlanPrice | null>(null);

  const listQuery = useQuery({
    queryKey: ['plan-pricing', page, filters],
    queryFn: ({ signal }) => planPricingApi.list({
      page: page + 1,
      pageSize: 25,
      search: filters.search.trim() || undefined,
      mealPlanTemplateId: filters.mealPlanTemplateId || undefined,
      status: filters.status || undefined,
      currencyCode: filters.currencyCode || undefined,
    }, signal),
  });
  const summaryQuery = useQuery({
    queryKey: ['plan-pricing-summary'],
    queryFn: ({ signal }) => planPricingApi.summary(signal),
  });
  const currenciesQuery = useQuery({
    queryKey: ['plan-pricing-currencies'],
    queryFn: ({ signal }) => planPricingApi.currencies(signal),
    staleTime: 5 * 60 * 1000,
  });
  const plansQuery = useQuery({
    queryKey: ['plans', 'pricing-options'],
    queryFn: ({ signal }) => plansApi.list({ page: 1, pageSize: 100 }, signal),
    staleTime: 60_000,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plan-pricing'] }),
      queryClient.invalidateQueries({ queryKey: ['plan-pricing-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['plan-pricing-currencies'] }),
    ]);
  };
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PlanPriceInput }) =>
      id ? planPricingApi.update(id, body) : planPricingApi.create(body),
    onSuccess: async () => {
      setDialog(null);
      await refresh();
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ price, isActive }: { price: PlanPrice; isActive: boolean }) =>
      planPricingApi.setStatus(price.id, isActive),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => planPricingApi.remove(id),
    onSuccess: async () => {
      setDeletePrice(null);
      if ((listQuery.data?.items.length ?? 0) === 1 && page > 0) setPage((current) => current - 1);
      await refresh();
    },
  });

  const items = listQuery.data?.items ?? [];
  const plans = plansQuery.data?.items ?? [];
  const currencies = currenciesQuery.data?.length ? currenciesQuery.data : ['QAR'];
  const summary = summaryQuery.data ?? { active: 0, scheduled: 0, expired: 0, inactive: 0 };
  const clearFilters = () => { setFilters(initialFilters); setPage(0); };
  const closeMenu = () => setRowMenu(null);
  const openFromMenu = (mode: 'view' | 'edit') => {
    if (!rowMenu) return;
    setDialog({ mode, price: rowMenu.price });
    closeMenu();
  };
  const changeStatus = () => {
    if (!rowMenu) return;
    const price = rowMenu.price;
    closeMenu();
    statusMutation.mutate({ price, isActive: !price.isActive });
  };
  const selectDelete = () => {
    if (!rowMenu) return;
    setDeletePrice(rowMenu.price);
    closeMenu();
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h1">Plan Pricing</Typography>
          <Typography color="text.secondary">Manage pricing packages for each meal plan based on duration, meals per day, snacks per day, currency, and effective dates.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ mode: 'add' })}>Add Pricing</Button>
      </Stack>

      <Grid container spacing={2}>
        <SummaryCard label="Active Prices" value={summary.active} color="success.main" />
        <SummaryCard label="Scheduled Prices" value={summary.scheduled} color="info.main" />
        <SummaryCard label="Expired Prices" value={summary.expired} color="text.secondary" />
        <SummaryCard label="Inactive Prices" value={summary.inactive} color="warning.main" />
      </Grid>

      {(statusMutation.isError || deleteMutation.isError) && (
        <Alert severity="error">
          {apiErrorMessage(statusMutation.error ?? deleteMutation.error, 'The pricing record could not be updated. Please try again.')}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                value={filters.search}
                placeholder="Search meal plan name or code"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
                onChange={(event) => { setFilters((current) => ({ ...current, search: event.target.value })); setPage(0); }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <TextField select fullWidth label="Meal plan template" value={filters.mealPlanTemplateId} onChange={(event) => { setFilters((current) => ({ ...current, mealPlanTemplateId: event.target.value })); setPage(0); }}>
                <MenuItem value="">All meal plans</MenuItem>
                {plans.map((plan) => <MenuItem key={plan.id} value={plan.id}>{plan.nameEn} ({plan.code})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField select fullWidth label="Status" value={filters.status} onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value as Filters['status'] })); setPage(0); }}>
                {statuses.map((status) => <MenuItem key={status.value || 'all'} value={status.value}>{status.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <TextField select fullWidth label="Currency" value={filters.currencyCode} onChange={(event) => { setFilters((current) => ({ ...current, currencyCode: event.target.value })); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {currencies.map((currency) => <MenuItem key={currency} value={currency}>{currency}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button fullWidth onClick={clearFilters} disabled={!filters.search && !filters.mealPlanTemplateId && !filters.status && !filters.currencyCode}>Clear filters</Button>
            </Grid>
          </Grid>
        </CardContent>

        {listQuery.isLoading ? (
          <Box p={2}><LoadingState /></Box>
        ) : listQuery.isError ? (
          <Box p={2}><ErrorState message="Unable to load plan pricing." onRetry={() => void listQuery.refetch()} /></Box>
        ) : !items.length ? (
          <Stack alignItems="center" spacing={2} py={5}>
            <Typography variant="h3">No pricing packages have been configured yet.</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ mode: 'add' })}>Add first pricing package</Button>
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1100, '& .MuiTableCell-head': { color: 'text.secondary', fontWeight: 750, bgcolor: '#FBFCFB' }, '& .MuiTableCell-root': { py: 1.75 } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Meal Plan</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell align="center">Meals / Day</TableCell>
                  <TableCell align="center">Snacks / Day</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Effective Period</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((price) => (
                  <TableRow key={price.id} hover>
                    <TableCell><Typography fontWeight={700}>{price.mealPlanName}</Typography><Typography variant="caption" color="text.secondary">{price.mealPlanCode}</Typography></TableCell>
                    <TableCell>{price.durationDays} days</TableCell>
                    <TableCell align="center">{price.mealsPerDay}</TableCell>
                    <TableCell align="center">{price.snacksPerDay}</TableCell>
                    <TableCell><Typography fontWeight={700}>{priceLabel(price)}</Typography></TableCell>
                    <TableCell>{periodLabel(price)}</TableCell>
                    <TableCell><PricingStatus status={price.status} /></TableCell>
                    <TableCell align="center">
                      <IconButton aria-label={`Actions for ${price.mealPlanName} ${price.durationDays} day pricing`} onClick={(event) => setRowMenu({ anchor: event.currentTarget, price })}><MoreHoriz /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination component="div" count={listQuery.data?.totalCount ?? 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, value) => setPage(value)} />
      </Card>

      <Menu anchorEl={rowMenu?.anchor} open={!!rowMenu} onClose={closeMenu}>
        <MenuItem onClick={() => openFromMenu('view')}><VisibilityOutlined fontSize="small" sx={{ mr: 1 }} /> View</MenuItem>
        <MenuItem onClick={() => openFromMenu('edit')}><EditOutlined fontSize="small" sx={{ mr: 1 }} /> Edit</MenuItem>
        <MenuItem onClick={changeStatus}>{rowMenu?.price.isActive ? 'Deactivate' : 'Activate'}</MenuItem>
        {rowMenu?.price.canDelete && <MenuItem onClick={selectDelete} sx={{ color: 'error.main' }}><DeleteOutline fontSize="small" sx={{ mr: 1 }} /> Delete</MenuItem>}
      </Menu>

      {dialog && (
        <PricingDialog
          key={`${dialog.mode}-${dialog.price?.id ?? 'new'}`}
          mode={dialog.mode}
          price={dialog.price}
          plans={plans}
          currencies={currencies}
          pending={saveMutation.isPending}
          error={saveMutation.isError ? apiErrorMessage(saveMutation.error, 'The pricing package could not be saved. Review the fields and try again.') : undefined}
          onClose={() => { setDialog(null); saveMutation.reset(); }}
          onSave={(body) => saveMutation.mutate({ id: dialog.price?.id, body })}
        />
      )}

      <Dialog open={!!deletePrice} onClose={() => !deleteMutation.isPending && setDeletePrice(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete pricing package?</DialogTitle>
        <DialogContent>
          <Typography>This removes the future inactive pricing package for <strong>{deletePrice?.mealPlanName}</strong>. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePrice(null)} disabled={deleteMutation.isPending}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!deletePrice || deleteMutation.isPending} onClick={() => deletePrice && deleteMutation.mutate(deletePrice.id)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h2" color={color}>{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function PricingStatus({ status }: { status: PlanPriceStatus }) {
  const color = status === 'ACTIVE' ? 'success' : status === 'SCHEDULED' ? 'info' : status === 'INACTIVE' ? 'warning' : 'default';
  return <Chip size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={status[0] + status.slice(1).toLowerCase()} />;
}

function PricingDialog({ mode, price, plans, currencies, pending, error, onClose, onSave }: {
  mode: 'add' | 'edit' | 'view';
  price?: PlanPrice;
  plans: PlanSummary[];
  currencies: string[];
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSave: (body: PlanPriceInput) => void;
}) {
  const readOnly = mode === 'view';
  const [values, setValues] = useState<FormValues>(price ? editForm(price) : newForm(currencies[0]));
  const endBeforeStart = !!values.effectiveUntil && !!values.effectiveFrom
    && new Date(values.effectiveUntil).getTime() < new Date(values.effectiveFrom).getTime();
  const invalid = !values.mealPlanTemplateId
    || Number(values.durationDays) <= 0
    || !Number.isInteger(Number(values.durationDays))
    || Number(values.mealsPerDay) <= 0
    || !Number.isInteger(Number(values.mealsPerDay))
    || Number(values.snacksPerDay) < 0
    || !Number.isInteger(Number(values.snacksPerDay))
    || !values.currencyCode
    || Number(values.amount) <= 0
    || !values.effectiveFrom
    || endBeforeStart;
  const submit = () => onSave({
    mealPlanTemplateId: values.mealPlanTemplateId,
    durationDays: Number(values.durationDays),
    mealsPerDay: Number(values.mealsPerDay),
    snacksPerDay: Number(values.snacksPerDay),
    currencyCode: values.currencyCode,
    amount: Number(values.amount),
    effectiveFrom: new Date(values.effectiveFrom).toISOString(),
    effectiveUntil: values.effectiveUntil ? new Date(values.effectiveUntil).toISOString() : null,
    isActive: values.isActive,
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'add' ? 'Add Pricing' : mode === 'edit' ? 'Edit Pricing' : 'Pricing Details'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Typography fontWeight={700} mb={1}>Meal Plan Template</Typography>
            <TextField required select fullWidth disabled={readOnly} label="Meal plan template" value={values.mealPlanTemplateId} onChange={(event) => setValues({ ...values, mealPlanTemplateId: event.target.value })}>
              {plans.map((plan) => <MenuItem key={plan.id} value={plan.id}>{plan.nameEn} ({plan.code})</MenuItem>)}
            </TextField>
          </Box>
          <Box>
            <Typography fontWeight={700} mb={1}>Package Configuration</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField required fullWidth disabled={readOnly} type="number" label="Duration in days" value={values.durationDays} slotProps={{ htmlInput: { min: 1, step: 1 } }} onChange={(event) => setValues({ ...values, durationDays: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField required fullWidth disabled={readOnly} type="number" label="Meals per day" value={values.mealsPerDay} slotProps={{ htmlInput: { min: 1, step: 1 } }} onChange={(event) => setValues({ ...values, mealsPerDay: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><TextField required fullWidth disabled={readOnly} type="number" label="Snacks per day" value={values.snacksPerDay} slotProps={{ htmlInput: { min: 0, step: 1 } }} onChange={(event) => setValues({ ...values, snacksPerDay: event.target.value })} /></Grid>
            </Grid>
          </Box>
          <Box>
            <Typography fontWeight={700} mb={1}>Pricing</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField required select fullWidth disabled={readOnly} label="Currency" value={values.currencyCode} onChange={(event) => setValues({ ...values, currencyCode: event.target.value })}>
                  {currencies.map((currency) => <MenuItem key={currency} value={currency}>{currency}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}><TextField required fullWidth disabled={readOnly} type="number" label="Amount" value={values.amount} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} onChange={(event) => setValues({ ...values, amount: event.target.value })} /></Grid>
            </Grid>
          </Box>
          <Box>
            <Typography fontWeight={700} mb={1}>Effective Period</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth disabled={readOnly} type="datetime-local" label="Effective from" value={values.effectiveFrom} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setValues({ ...values, effectiveFrom: event.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth disabled={readOnly} type="datetime-local" label="Effective until" value={values.effectiveUntil} error={endBeforeStart} helperText={endBeforeStart ? 'Effective until cannot be earlier than effective from.' : undefined} slotProps={{ inputLabel: { shrink: true } }} onChange={(event) => setValues({ ...values, effectiveUntil: event.target.value })} /></Grid>
            </Grid>
          </Box>
          <FormControlLabel disabled={readOnly} control={<Switch checked={values.isActive} onChange={(_, checked) => setValues({ ...values, isActive: checked })} />} label="Active" />
          {!readOnly && <Alert severity="info">Pricing periods cannot overlap for the same plan, duration, meals, snacks, and currency combination.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
        {!readOnly && <Button variant="contained" disabled={pending || invalid} onClick={submit}>{pending ? 'Saving…' : 'Save'}</Button>}
      </DialogActions>
    </Dialog>
  );
}
