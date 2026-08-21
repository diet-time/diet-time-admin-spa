import { Add, EditOutlined, Search, ToggleOffOutlined, ToggleOnOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  mealPlanPricePackagesApi,
  type MealPlanPricePackage,
  type MealPlanPricePackageRequest,
} from '@/api/planPricingApi';
import { queryClient } from '@/app/queryClient';
import { StatusChip } from '@/components/common/StatusChip';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';

type PackageStatusFilter = 'all' | 'active' | 'inactive';

interface PackageFormValues {
  code: string;
  nameEn: string;
  nameAr: string;
  durationDays: string;
  displayOrder: string;
  isActive: boolean;
}

type PackageFormErrors = Partial<Record<keyof PackageFormValues, string>>;

const emptyForm = (): PackageFormValues => ({
  code: '',
  nameEn: '',
  nameAr: '',
  durationDays: '',
  displayOrder: '0',
  isActive: true,
});

const packageForm = (item: MealPlanPricePackage): PackageFormValues => ({
  code: item.code,
  nameEn: item.nameEn,
  nameAr: item.nameAr,
  durationDays: String(item.durationDays),
  displayOrder: String(item.displayOrder),
  isActive: item.isActive,
});

const validatePackage = (values: PackageFormValues): PackageFormErrors => {
  const errors: PackageFormErrors = {};
  if (!values.code.trim()) errors.code = 'Package code is required.';
  else if (values.code.trim().length > 50) errors.code = 'Package code must be 50 characters or fewer.';
  if (!values.nameEn.trim()) errors.nameEn = 'English name is required.';
  if (!values.nameAr.trim()) errors.nameAr = 'Arabic name is required.';
  if (!Number.isInteger(Number(values.durationDays)) || Number(values.durationDays) <= 0) errors.durationDays = 'Service days must be a whole number greater than zero.';
  if (!Number.isInteger(Number(values.displayOrder)) || Number(values.displayOrder) < 0) errors.displayOrder = 'Display order must be a whole number of zero or greater.';
  return errors;
};

interface ValidationEnvelope {
  errors?: Record<string, string[]> | Array<{ code?: string; message?: string; field?: string }>;
}

const packageApiError = (error: unknown) => {
  if (!axios.isAxiosError<ValidationEnvelope>(error)) return { message: 'Unable to save the price package. Please try again.', fields: {} as PackageFormErrors };
  const errors = error.response?.data?.errors;
  const fields: PackageFormErrors = {};
  let message = 'Unable to save the price package. Please try again.';
  if (Array.isArray(errors)) {
    const first = errors[0];
    const code = first?.code?.toLowerCase() ?? '';
    if (code.includes('duplicate')) fields.code = 'A package with this code already exists.';
    else if (code.includes('duration') || code.includes('referenced')) fields.durationDays = 'Service days cannot be changed because the package is already used.';
    message = first?.message ?? message;
  } else if (errors) {
    for (const [field, messages] of Object.entries(errors)) {
      const normalized = field.toLowerCase();
      if (normalized.includes('code')) fields.code = messages[0];
      if (normalized.includes('nameen')) fields.nameEn = messages[0];
      if (normalized.includes('namear')) fields.nameAr = messages[0];
      if (normalized.includes('duration')) fields.durationDays = messages[0];
      if (normalized.includes('displayorder')) fields.displayOrder = messages[0];
    }
  }
  return { message, fields };
};

const durationLocked = (item?: MealPlanPricePackage) =>
  !!item && (item.canEditDurationDays === false || (item.usageCount ?? 0) > 0);

export function PricePackagesTab({ createRequest = 0 }: { createRequest?: number }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PackageStatusFilter>('all');
  const [dialog, setDialog] = useState<{ item?: MealPlanPricePackage } | null>(null);
  const [confirmPackage, setConfirmPackage] = useState<MealPlanPricePackage | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (createRequest > 0) setDialog({});
  }, [createRequest]);

  const listQuery = useQuery({
    queryKey: ['meal-plan-price-packages', page, search, status],
    queryFn: ({ signal }) => mealPlanPricePackagesApi.list({
      page: page + 1,
      pageSize: 25,
      search: search.trim() || undefined,
      isActive: status === 'all' ? undefined : status === 'active',
    }, signal),
  });

  const refreshPackages = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meal-plan-price-packages'] }),
      queryClient.invalidateQueries({ queryKey: ['meal-plan-price-package-lookup'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id?: string; body: MealPlanPricePackageRequest }) =>
      id ? mealPlanPricePackagesApi.update(id, body) : mealPlanPricePackagesApi.create(body),
    onSuccess: async (_, variables) => {
      setDialog(null);
      setSuccess(variables.id ? 'Price package updated successfully.' : 'Price package created successfully.');
      await refreshPackages();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (item: MealPlanPricePackage) => mealPlanPricePackagesApi.setStatus(item.id, !item.isActive),
    onSuccess: async (_, item) => {
      setConfirmPackage(null);
      setSuccess(`Price package ${item.isActive ? 'deactivated' : 'activated'} successfully.`);
      await refreshPackages();
    },
  });

  const items = listQuery.data?.items ?? [];
  const clearFilters = () => { setSearch(''); setStatus('all'); setPage(0); };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h2">Price Packages</Typography>
          <Typography color="text.secondary">Manage customer-facing pricing durations used when configuring meal-plan prices.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({})}>Add Package</Button>
      </Stack>

      {statusMutation.isError && <Alert severity="error">Unable to update the price package status. Please try again.</Alert>}

      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                value={search}
                placeholder="Search package code or name"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
                onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              />
            </Grid>
            <Grid size={{ xs: 7, md: 3 }}>
              <TextField select fullWidth label="Status" value={status} onChange={(event) => { setStatus(event.target.value as PackageStatusFilter); setPage(0); }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 5, md: 3 }}>
              <Button fullWidth onClick={clearFilters} disabled={!search && status === 'all'}>Clear filters</Button>
            </Grid>
          </Grid>
        </CardContent>

        {listQuery.isLoading ? <Box p={2}><LoadingState /></Box> : listQuery.isError ? (
          <Box p={2}><ErrorState message="Unable to load price packages." onRetry={() => void listQuery.refetch()} /></Box>
        ) : !items.length ? (
          <Stack alignItems="center" spacing={2} py={5}>
            <Typography variant="h3">No price packages found.</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({})}>Add Package</Button>
          </Stack>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 950, '& .MuiTableCell-head': { color: 'text.secondary', fontWeight: 750, bgcolor: '#FBFCFB' }, '& .MuiTableCell-root': { py: 1.75 } }}>
              <TableHead><TableRow>
                <TableCell>Display Order</TableCell><TableCell>Package Code</TableCell><TableCell>English Name</TableCell><TableCell>Arabic Name</TableCell><TableCell>Service Days</TableCell><TableCell>Status</TableCell><TableCell>Updated At</TableCell><TableCell align="center">Actions</TableCell>
              </TableRow></TableHead>
              <TableBody>{items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.displayOrder}</TableCell>
                  <TableCell><Typography fontWeight={700}>{item.code}</Typography></TableCell>
                  <TableCell>{item.nameEn}</TableCell>
                  <TableCell dir="rtl" sx={{ textAlign: 'left' }}>{item.nameAr}</TableCell>
                  <TableCell>{item.durationDays}</TableCell>
                  <TableCell><StatusChip label={item.isActive ? 'Active' : 'Inactive'} /></TableCell>
                  <TableCell>{item.updatedAt ? format(parseISO(item.updatedAt), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit package"><IconButton color="primary" aria-label={`Edit ${item.nameEn}`} onClick={() => setDialog({ item })}><EditOutlined /></IconButton></Tooltip>
                    <Tooltip title={item.isActive ? 'Deactivate package' : 'Activate package'}><IconButton color={item.isActive ? 'warning' : 'success'} aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.nameEn}`} onClick={() => setConfirmPackage(item)}>{item.isActive ? <ToggleOffOutlined /> : <ToggleOnOutlined />}</IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination component="div" count={listQuery.data?.totalCount ?? 0} page={page} rowsPerPage={25} rowsPerPageOptions={[25]} onPageChange={(_, value) => setPage(value)} />
      </Card>

      {dialog && (
        <PackageDialog
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          pending={saveMutation.isPending}
          apiError={saveMutation.isError ? packageApiError(saveMutation.error) : undefined}
          onClose={() => { if (!saveMutation.isPending) { setDialog(null); saveMutation.reset(); } }}
          onSave={(body) => saveMutation.mutate({ id: dialog.item?.id, body })}
        />
      )}

      <Dialog open={!!confirmPackage} onClose={() => !statusMutation.isPending && setConfirmPackage(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmPackage?.isActive ? <>Deactivate &ldquo;{confirmPackage.nameEn}&rdquo;?</> : <>Activate &ldquo;{confirmPackage?.nameEn}&rdquo;?</>}</DialogTitle>
        <DialogContent><Typography>{confirmPackage?.isActive ? 'This package will no longer be available when creating new prices. Existing pricing records will remain unchanged.' : 'This package will be available when creating new prices.'}</Typography></DialogContent>
        <DialogActions>
          <Button disabled={statusMutation.isPending} onClick={() => setConfirmPackage(null)}>Cancel</Button>
          <Button variant="contained" color={confirmPackage?.isActive ? 'warning' : 'primary'} disabled={!confirmPackage || statusMutation.isPending} onClick={() => confirmPackage && statusMutation.mutate(confirmPackage)}>{confirmPackage?.isActive ? 'Deactivate' : 'Activate'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')} message={success} />
    </Stack>
  );
}

function PackageDialog({ item, pending, apiError, onClose, onSave }: {
  item?: MealPlanPricePackage;
  pending: boolean;
  apiError?: { message: string; fields: PackageFormErrors };
  onClose: () => void;
  onSave: (body: MealPlanPricePackageRequest) => void;
}) {
  const [values, setValues] = useState<PackageFormValues>(item ? packageForm(item) : emptyForm());
  const [errors, setErrors] = useState<PackageFormErrors>({});
  const serviceDaysLocked = durationLocked(item);
  const fieldErrors = { ...errors, ...apiError?.fields };

  const submit = () => {
    const nextErrors = validatePackage(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave({
      code: values.code.trim().toUpperCase(),
      nameEn: values.nameEn.trim(),
      nameAr: values.nameAr.trim(),
      durationDays: Number(values.durationDays),
      displayOrder: Number(values.displayOrder),
      isActive: values.isActive,
    });
  };

  return (
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown={pending} onClose={(_, reason) => { if (!pending && reason !== 'backdropClick') onClose(); }}>
      <DialogTitle>{item ? 'Edit Price Package' : 'Add Price Package'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} mt={1}>
          {apiError && !Object.keys(apiError.fields).length && <Alert severity="error">{apiError.message}</Alert>}
          <TextField required label="Package Code" placeholder="WEEK" value={values.code} disabled={pending || !!item} error={!!fieldErrors.code} helperText={fieldErrors.code} slotProps={{ htmlInput: { maxLength: 50 } }} onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })} />
          <TextField required label="English Name" placeholder="1 Week" value={values.nameEn} disabled={pending} error={!!fieldErrors.nameEn} helperText={fieldErrors.nameEn} onChange={(event) => setValues({ ...values, nameEn: event.target.value })} />
          <TextField required label="Arabic Name" placeholder="أسبوع واحد" value={values.nameAr} disabled={pending} error={!!fieldErrors.nameAr} helperText={fieldErrors.nameAr} slotProps={{ htmlInput: { dir: 'rtl' } }} onChange={(event) => setValues({ ...values, nameAr: event.target.value })} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth type="number" label="Service Days" value={values.durationDays} disabled={pending || serviceDaysLocked} error={!!fieldErrors.durationDays} helperText={fieldErrors.durationDays ?? (serviceDaysLocked ? 'Service days cannot be changed because this package is already used by meal-plan pricing.' : 'Number of meal-service days included in this package.')} slotProps={{ htmlInput: { min: 1, step: 1 } }} onChange={(event) => setValues({ ...values, durationDays: event.target.value })} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth type="number" label="Display Order" value={values.displayOrder} disabled={pending} error={!!fieldErrors.displayOrder} helperText={fieldErrors.displayOrder} slotProps={{ htmlInput: { min: 0, step: 1 } }} onChange={(event) => setValues({ ...values, displayOrder: event.target.value })} /></Grid>
          </Grid>
          <FormControlLabel disabled={pending} control={<Switch checked={values.isActive} onChange={(_, checked) => setValues({ ...values, isActive: checked })} />} label="Active" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={pending} onClick={submit}>{pending ? 'Saving…' : 'Save Package'}</Button>
      </DialogActions>
    </Dialog>
  );
}
