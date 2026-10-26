import { discountError, discountPreview } from './packageDiscount';
import { Add, EditOutlined, InfoOutlined, ToggleOffOutlined, ToggleOnOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Snackbar, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, FormControlLabel } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { plansApi } from '@/api/plansApi';
import type { PlanSummary } from '@/api/apiTypes';
import { packageOptionsApi, subscriptionPricingApi, type MealPlanPrice, type MealPlanPriceInput } from '@/api/subscriptionConfigurationApi';
import { queryClient } from '@/app/queryClient';
import { StatusChip } from '@/components/common/StatusChip';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import { pricingSaveError } from './planPricingTranslations';

type ActiveFilter = 'all' | 'active' | 'inactive';
const pricingPlanLabel = (plan: { nameEn: string; versionNumber?: number; published?: boolean }) =>
  `${plan.nameEn} · Version ${plan.versionNumber ?? '?'} · ${plan.published ? 'Published' : 'Draft'}`;
const money = (value: number, currency: string) => new Intl.NumberFormat('en-QA', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
const isStatusOnlyChange = (item: MealPlanPrice | undefined, values: MealPlanPriceInput) => !!item
  && item.isActive !== values.isActive
  && item.mealPlanId === values.mealPlanId && item.durationId === values.durationId
  && item.packageOptionId === values.packageOptionId && item.price === values.price && item.currency === values.currency
  && (item.discountedPrice ?? null) === (values.discountedPrice ?? null);
const availabilityHint = (price: MealPlanPrice) => !price.packageOptionId
  ? 'Choose a package option in Edit Price before offering this price to customers.'
  : !price.durationId
    ? 'Choose a duration in Edit Price before offering this price to customers.'
    : 'Not currently offered to customers. Check the published plan version, package, duration and effective dates.';

export function SubscriptionPlanPricingPage() {
  const [mealPlanId, setMealPlanId] = useState('');
  const [durationId, setDurationId] = useState('');
  const [active, setActive] = useState<ActiveFilter>('all');
  const [dialog, setDialog] = useState<MealPlanPrice | 'new' | null>(null);
  const [statusTarget, setStatusTarget] = useState<MealPlanPrice | null>(null);
  const [notice, setNotice] = useState('');
  const plans = useQuery({ queryKey: ['meal-plans', 'pricing-lookup'], queryFn: ({ signal }) => plansApi.list({ page: 1, pageSize: 100 }, signal) });
  const durations = useQuery({ queryKey: ['durations', 'lookup'], queryFn: ({ signal }) => subscriptionPricingApi.durations(signal) });
  const packages = useQuery({ queryKey: ['package-options', 'pricing-lookup'], queryFn: ({ signal }) => packageOptionsApi.list({ page: 1, pageSize: 100, isActive: true }, signal) });
  const prices = useQuery({ queryKey: ['meal-plan-prices', mealPlanId, durationId, active], queryFn: ({ signal }) => subscriptionPricingApi.list({ page: 1, pageSize: 100, mealPlanId: mealPlanId || undefined, durationId: durationId || undefined, isActive: active === 'all' ? undefined : active === 'active' }, signal) });
  const refreshPrices = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['meal-plan-prices'] }),
    queryClient.invalidateQueries({ queryKey: ['plan-pricing'] }),
  ]);
  const save = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: MealPlanPriceInput }) => id
      ? isStatusOnlyChange(dialog && dialog !== 'new' ? dialog : undefined, body)
        ? subscriptionPricingApi.setStatus(id, body.isActive)
        : subscriptionPricingApi.update(id, body)
      : subscriptionPricingApi.create(body),
    onSuccess: async (_, value) => {
      setDialog(null);
      setNotice(value.id ? 'Price updated successfully.' : 'Price added successfully.');
      await refreshPrices();
    },
  });
  const status = useMutation({
    mutationFn: (price: MealPlanPrice) => subscriptionPricingApi.setStatus(price.id, !price.isActive),
    onSuccess: async (_, price) => {
      setStatusTarget(null);
      setNotice(`Price ${price.isActive ? 'deactivated' : 'activated'} successfully.`);
      await refreshPrices();
    },
  });
  const planItems = plans.data?.items ?? [];
  const durationItems = durations.data ?? [];
  const packageItems = packages.data?.items ?? [];
  const priceItems = prices.data?.items ?? [];
  const selectedPlan = planItems.find((item) => item.id === mealPlanId);
  const selectedDuration = durationItems.find((item) => item.id === durationId)?.name;
  const unavailableCount = priceItems.filter((price) => price.isActive && price.isAvailable === false).length;
  const lookupsUnavailable = plans.isPending || durations.isPending || packages.isPending || plans.isError || durations.isError || packages.isError;
  const openPrice = (price: MealPlanPrice | 'new') => { save.reset(); setDialog(price); };

  return <Stack spacing={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="h2">Plan Pricing</Typography><Typography color="text.secondary">Set a price for each meal plan, duration, and package option.</Typography></Box>
      <Button variant="contained" startIcon={<Add />} disabled={lookupsUnavailable} onClick={() => openPrice('new')}>Add Price</Button>
    </Stack>
    {(plans.isError || durations.isError || packages.isError) && <Alert severity="error">Pricing lookup data could not be loaded. Reload this page before configuring prices.</Alert>}
    <Card sx={{ p: 2.5 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField select fullWidth label="Meal Plan" value={mealPlanId} onChange={(e) => setMealPlanId(e.target.value)}>
            <MenuItem value="">All meal plans</MenuItem>
            {planItems.map((plan) => <MenuItem value={plan.id} key={plan.id} title={plan.id}>{pricingPlanLabel(plan)}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField select fullWidth label="Duration" value={durationId} onChange={(e) => setDurationId(e.target.value)}>
            <MenuItem value="">All durations</MenuItem>
            {durationItems.map((duration) => <MenuItem value={duration.id} key={duration.id}>{duration.name}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField select fullWidth label="Status" value={active} onChange={(e) => setActive(e.target.value as ActiveFilter)}>
            <MenuItem value="all">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Grid>
      </Grid>
    </Card>
    {(selectedPlan || selectedDuration) && <Typography variant="h3">{selectedPlan ? pricingPlanLabel(selectedPlan) : 'All meal plans'} · {selectedDuration ?? 'All durations'}</Typography>}
    {!prices.isLoading && !prices.isError && <Typography color="text.secondary">{priceItems.length} prices</Typography>}
    {unavailableCount > 0 && <Alert severity="info">{unavailableCount} active {unavailableCount === 1 ? 'price is' : 'prices are'} not currently offered to customers. Hover the status info icon for details. You can edit or deactivate these prices.</Alert>}
    <Card>
      {prices.isLoading ? <Box p={3}><LoadingState /></Box>
        : prices.isError ? <Box p={3}><ErrorState message="Unable to load plan prices." onRetry={() => void prices.refetch()} /></Box>
          : !priceItems.length ? <Box textAlign="center" py={6}><Typography variant="h3">No prices match these filters</Typography><Typography color="text.secondary" mt={1}>Add a price for a package option to get started.</Typography></Box>
            : <TableContainer><Table sx={{ minWidth: 780 }}>
              <TableHead><TableRow><TableCell>Meal Plan</TableCell><TableCell>Duration</TableCell><TableCell>Package</TableCell><TableCell>Price</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>{priceItems.map((price) => {
                const plan = planItems.find((item) => item.id === price.mealPlanId);
                const daysLabel = `${price.serviceDays} delivery ${price.serviceDays === 1 ? 'day' : 'days'}`;
                const counts = price.mealCount === undefined ? '' : `${price.mealCount} meals + ${price.snackCount ?? 0} snacks per day`;
                return <TableRow hover key={price.id}>
                  <TableCell><Tooltip title={`Plan ID: ${price.mealPlanId}`}><Box component="span">{price.mealPlanName}{plan && <Typography variant="caption" display="block" color="text.secondary">Version {plan.versionNumber ?? '?'} · {plan.published ? 'Published' : 'Draft'}</Typography>}</Box></Tooltip></TableCell>
                  <TableCell><Tooltip title={price.serviceDays ? daysLabel : ''}><Box component="span">{price.durationName}</Box></Tooltip></TableCell>
                  <TableCell><Tooltip title={counts}><Typography fontWeight={700}>{price.packageOptionName}</Typography></Tooltip></TableCell>
                  <TableCell>{price.discountedPrice != null ? <Stack spacing={0.25}>
                    <Typography fontWeight={800}>{money(price.effectivePrice ?? price.discountedPrice, price.currency)}</Typography>
                    <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>{money(price.price, price.currency)}</Typography>
                    <Typography variant="caption">{(price.discountPercentage ?? discountPreview(price.price, price.discountedPrice)?.percentage ?? 0).toFixed(0)}% OFF · Saves {money(price.discountAmount ?? discountPreview(price.price, price.discountedPrice)?.savings ?? 0, price.currency)}</Typography>
                  </Stack> : money(price.price, price.currency)}</TableCell>
                  <TableCell><Stack direction="row" spacing={0.75} alignItems="center"><StatusChip label={price.isActive ? 'Active' : 'Inactive'} />
                    {price.isActive && price.isAvailable === false && <Tooltip title={availabilityHint(price)}><IconButton size="small" aria-label={`Availability details for ${price.packageOptionName}`}><InfoOutlined fontSize="small" /></IconButton></Tooltip>}
                  </Stack></TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit price"><IconButton color="primary" aria-label={`Edit ${price.packageOptionName} price`} onClick={() => openPrice(price)}><EditOutlined /></IconButton></Tooltip>
                    <Tooltip title={price.isActive ? 'Deactivate price' : 'Activate price'}><IconButton color={price.isActive ? 'warning' : 'success'} aria-label={`${price.isActive ? 'Deactivate' : 'Activate'} ${price.packageOptionName} price`} onClick={() => { status.reset(); setStatusTarget(price); }}>{price.isActive ? <ToggleOffOutlined /> : <ToggleOnOutlined />}</IconButton></Tooltip>
                  </TableCell>
                </TableRow>;
              })}</TableBody>
            </Table></TableContainer>}
    </Card>
    {dialog && <PriceDialog item={dialog === 'new' ? undefined : dialog} plans={planItems} durations={durationItems} packages={packageItems} existing={priceItems} pending={save.isPending}
      errorMessage={save.isError ? pricingSaveError(save.error, undefined, 'The price could not be saved. Review the fields and try again.').message : undefined}
      onClose={() => { setDialog(null); save.reset(); }} onSave={(body) => save.mutate({ id: dialog === 'new' ? undefined : dialog.id, body })} />}
    <Dialog open={!!statusTarget} onClose={() => !status.isPending && setStatusTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle>{statusTarget?.isActive ? 'Deactivate price?' : 'Activate price?'}</DialogTitle>
      <DialogContent>
        {status.isError && <Alert severity="error" sx={{ mb: 2 }}>{pricingSaveError(status.error, undefined, 'The price status could not be changed. Please try again.').message}</Alert>}
        <Typography>{statusTarget?.isActive ? 'This price will no longer be offered to new subscriptions. Historical customer order values will not change.' : 'This enables the price. Customers can select it when its plan, package and duration are available.'}</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={status.isPending} onClick={() => setStatusTarget(null)}>Cancel</Button>
        <Button variant="contained" disabled={status.isPending} color={statusTarget?.isActive ? 'warning' : 'primary'} onClick={() => statusTarget && status.mutate(statusTarget)}>{status.isPending ? 'Saving…' : 'Confirm'}</Button>
      </DialogActions>
    </Dialog>
    <Snackbar open={!!notice} autoHideDuration={4000} message={notice} onClose={() => setNotice('')} />
  </Stack>;
}

function PriceDialog({ item, plans, durations, packages, existing, pending, errorMessage, onClose, onSave }: {
  item?: MealPlanPrice;
  plans: PlanSummary[];
  durations: Array<{ id: string; name: string }>;
  packages: Array<{ id: string; name: string }>;
  existing: MealPlanPrice[];
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSave: (body: MealPlanPriceInput) => void;
}) {
  const [values, setValues] = useState<MealPlanPriceInput>(item ? { mealPlanId: item.mealPlanId, durationId: item.durationId, packageOptionId: item.packageOptionId, price: item.price, discountedPrice: item.discountedPrice ?? null, currency: item.currency, isActive: item.isActive } : { mealPlanId: '', durationId: '', packageOptionId: '', price: 0, discountedPrice: null, currency: 'QAR', isActive: true });
  const [submitted, setSubmitted] = useState(false);
  const duplicate = useMemo(() => values.isActive && existing.some((price) => price.id !== item?.id && price.isActive && price.mealPlanId === values.mealPlanId && price.durationId === values.durationId && price.packageOptionId === values.packageOptionId), [existing, item?.id, values]);
  const priceError = discountError(values.price, values.discountedPrice);
  const preview = discountPreview(values.price, values.discountedPrice);
  const invalid = !isStatusOnlyChange(item, values)
    && (!values.mealPlanId || !values.durationId || !values.packageOptionId || !!priceError || !values.currency.trim() || duplicate);
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !pending && onClose()}>
    <DialogTitle>{item ? 'Edit Price' : 'Add Price'}</DialogTitle>
    <DialogContent><Stack spacing={2} mt={1}>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {duplicate && <Alert severity="error">An active price already exists for this meal plan, duration, and package.</Alert>}
      <TextField required select label="Meal Plan" value={values.mealPlanId} error={submitted && !values.mealPlanId} helperText={submitted && !values.mealPlanId ? 'Meal plan is required.' : undefined} onChange={(e) => setValues({ ...values, mealPlanId: e.target.value })}>
        {item && !plans.some((plan) => plan.id === item.mealPlanId) && <MenuItem value={item.mealPlanId} title={item.mealPlanId}>{item.mealPlanName} · Other version</MenuItem>}
        {plans.map((plan) => <MenuItem value={plan.id} key={plan.id} title={plan.id}>{pricingPlanLabel(plan)}</MenuItem>)}
      </TextField>
      <TextField required select label="Duration" value={values.durationId} error={submitted && !values.durationId} helperText={submitted && !values.durationId ? 'Duration is required.' : undefined} onChange={(e) => setValues({ ...values, durationId: e.target.value })}>
        {item?.durationId && !durations.some((duration) => duration.id === item.durationId) && <MenuItem value={item.durationId} disabled>{item.durationName} (unavailable)</MenuItem>}
        {durations.map((duration) => <MenuItem value={duration.id} key={duration.id}>{duration.name}</MenuItem>)}
      </TextField>
      <TextField required select label="Package Option" value={values.packageOptionId} error={submitted && !values.packageOptionId} helperText={submitted && !values.packageOptionId ? 'Package is required.' : undefined} onChange={(e) => setValues({ ...values, packageOptionId: e.target.value })}>
        {item?.packageOptionId && !packages.some((option) => option.id === item.packageOptionId) && <MenuItem value={item.packageOptionId} disabled>{item.packageOptionName} (unavailable)</MenuItem>}
        {packages.map((option) => <MenuItem value={option.id} key={option.id}>{option.name}</MenuItem>)}
      </TextField>
      <Grid container spacing={2}>
        <Grid size={{ xs: 8 }}><TextField required fullWidth type="number" label={`Regular Price (${values.currency || 'QAR'})`} value={values.price} error={submitted && !!discountError(values.price)} helperText={submitted ? discountError(values.price) : undefined} slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }} onChange={(e) => setValues({ ...values, price: Number(e.target.value) })} /></Grid>
        <Grid size={{ xs: 4 }}><TextField required fullWidth label="Currency" value={values.currency} error={submitted && !values.currency.trim()} onChange={(e) => setValues({ ...values, currency: e.target.value.toUpperCase() })} /></Grid>
      </Grid>
      <TextField fullWidth type="number" label={`Discounted Price (${values.currency || 'QAR'}) — Optional`}
        value={values.discountedPrice ?? ''} slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
        error={!!priceError && (submitted || values.discountedPrice != null)}
        helperText={priceError && (submitted || values.discountedPrice != null) ? priceError : 'Leave blank to remove the promotion.'}
        onChange={(e) => setValues({ ...values, discountedPrice: e.target.value === '' ? null : Number(e.target.value) })} />
      {preview && <Alert severity="success">Discount: {preview.percentage.toFixed(0)}% · Customer Saves: {money(preview.savings, /^[A-Za-z]{3}$/.test(values.currency) ? values.currency : 'QAR')}</Alert>}
      <FormControlLabel control={<Switch checked={values.isActive} onChange={(_, checked) => setValues({ ...values, isActive: checked })} />} label="Active" />
      <Alert severity="info">Changing this master price does not alter historical customer order values.</Alert>
    </Stack></DialogContent>
    <DialogActions>
      <Button disabled={pending} onClick={onClose}>Cancel</Button>
      <Button variant="contained" disabled={pending} onClick={() => { setSubmitted(true); if (!invalid) onSave({ ...values, currency: values.currency.trim().toUpperCase() }); }}>{pending ? 'Saving…' : 'Save Price'}</Button>
    </DialogActions>
  </Dialog>;
}
