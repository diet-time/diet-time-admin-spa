import { Add, EditOutlined, ToggleOffOutlined, ToggleOnOutlined, Search } from '@mui/icons-material';
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Grid, IconButton, InputAdornment, Snackbar, Stack, Switch, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { packageOptionsApi, type PackageOption, type PackageOptionInput } from '@/api/subscriptionConfigurationApi';
import { queryClient } from '@/app/queryClient';
import { StatusChip } from '@/components/common/StatusChip';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';

type FormValues = PackageOptionInput;

const emptyValues = (): FormValues => ({ name: '', mealCount: 1, snackCount: 0, displayOrder: 0, isActive: true });

export function PackageOptionsPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PackageOption | 'new' | null>(null);
  const [statusTarget, setStatusTarget] = useState<PackageOption | null>(null);
  const [notice, setNotice] = useState('');
  const listQuery = useQuery({
    queryKey: ['package-options', search],
    queryFn: ({ signal }) => packageOptionsApi.list({ page: 1, pageSize: 100, search: search.trim() || undefined }, signal),
  });
  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: FormValues }) => {
      const body: PackageOptionInput = { name: values.name.trim(), mealCount: values.mealCount, snackCount: values.snackCount, displayOrder: values.displayOrder, isActive: values.isActive };
      if (id) await packageOptionsApi.update(id, body);
      else await packageOptionsApi.create(body);
      return !!id;
    },
    onSuccess: async (updated) => {
      setEditing(null); setNotice(updated ? 'Package updated successfully.' : 'Package created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['package-options'] });
    },
  });
  const status = useMutation({
    mutationFn: (item: PackageOption) => packageOptionsApi.setStatus(item.id, !item.isActive),
    onSuccess: async (_, item) => {
      setStatusTarget(null); setNotice(`Package ${item.isActive ? 'deactivated' : 'activated'} successfully.`);
      await queryClient.invalidateQueries({ queryKey: ['package-options'] });
    },
  });
  const items = [...(listQuery.data?.items ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);

  return <Stack spacing={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="h2">Package Options</Typography><Typography color="text.secondary">Configure meal and snack combinations available with subscriptions.</Typography></Box>
      <Button variant="contained" startIcon={<Add />} onClick={() => setEditing('new')}>Add Package</Button>
    </Stack>
    {(status.isError || save.isError) && <Alert severity="error">The change could not be saved. Review the values and try again.</Alert>}
    <Card>
      <CardContent><TextField fullWidth placeholder="Search package name" value={search} onChange={(event) => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} /></CardContent>
      {listQuery.isLoading ? <Box p={3}><LoadingState /></Box> : listQuery.isError ? <Box p={3}><ErrorState message="Unable to load package options." onRetry={() => void listQuery.refetch()} /></Box> : !items.length ?
        <Box py={6} textAlign="center"><Typography variant="h3">No package options found</Typography><Typography color="text.secondary" mt={1}>Add the first meal package offered to customers.</Typography></Box> :
        <TableContainer><Table sx={{ minWidth: 760 }}><TableHead><TableRow><TableCell>Package Name</TableCell><TableCell>Meals</TableCell><TableCell>Snacks</TableCell><TableCell>Display Order</TableCell><TableCell>Active</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{items.map((item) => <TableRow hover key={item.id}><TableCell><Typography fontWeight={700}>{item.name}</Typography></TableCell><TableCell>{item.mealCount}</TableCell><TableCell>{item.snackCount}</TableCell><TableCell>{item.displayOrder}</TableCell><TableCell><StatusChip label={item.isActive ? 'Active' : 'Inactive'} /></TableCell><TableCell align="right"><Tooltip title="Edit package"><IconButton color="primary" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}><EditOutlined /></IconButton></Tooltip><Tooltip title={item.isActive ? 'Deactivate package' : 'Activate package'}><IconButton color={item.isActive ? 'warning' : 'success'} aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`} onClick={() => setStatusTarget(item)}>{item.isActive ? <ToggleOffOutlined /> : <ToggleOnOutlined />}</IconButton></Tooltip></TableCell></TableRow>)}</TableBody>
        </Table></TableContainer>}
    </Card>
    {editing && <PackageDialog item={editing === 'new' ? undefined : editing} allPackages={items} pending={save.isPending} onClose={() => { setEditing(null); save.reset(); }} onSave={(values) => save.mutate({ id: editing === 'new' ? undefined : editing.id, values })} />}
    <Dialog open={!!statusTarget} onClose={() => !status.isPending && setStatusTarget(null)} maxWidth="xs" fullWidth><DialogTitle>{statusTarget?.isActive ? 'Deactivate package?' : 'Activate package?'}</DialogTitle><DialogContent><Typography>{statusTarget?.isActive && (statusTarget.pricingUsageCount ?? 0) > 0 ? `This package is used by ${statusTarget.pricingUsageCount} pricing record(s). Existing prices remain unchanged, but it will not be available for new pricing.` : statusTarget?.isActive ? 'This package will no longer be available for new pricing.' : 'This package will be available for pricing.'}</Typography></DialogContent><DialogActions><Button onClick={() => setStatusTarget(null)}>Cancel</Button><Button variant="contained" color={statusTarget?.isActive ? 'warning' : 'primary'} disabled={!statusTarget || status.isPending} onClick={() => statusTarget && status.mutate(statusTarget)}>{statusTarget?.isActive ? 'Deactivate' : 'Activate'}</Button></DialogActions></Dialog>
    <Snackbar open={!!notice} autoHideDuration={4000} message={notice} onClose={() => setNotice('')} />
  </Stack>;
}

function PackageDialog({ item, allPackages, pending, onClose, onSave }: { item?: PackageOption; allPackages: PackageOption[]; pending: boolean; onClose: () => void; onSave: (values: FormValues) => void }) {
  const [values, setValues] = useState<FormValues>(item ? { name: item.name, mealCount: item.mealCount, snackCount: item.snackCount, displayOrder: item.displayOrder, isActive: item.isActive } : emptyValues());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = 'Package name is required.';
    if (allPackages.some((candidate) => candidate.id !== item?.id && candidate.name.trim().toLowerCase() === values.name.trim().toLowerCase())) next.name = 'A package with this name already exists.';
    if (!Number.isInteger(values.mealCount) || values.mealCount <= 0) next.mealCount = 'Meal count must be greater than zero.';
    if (!Number.isInteger(values.snackCount) || values.snackCount < 0) next.snackCount = 'Snack count cannot be negative.';
    if (allPackages.some((candidate) => candidate.id !== item?.id && candidate.mealCount === values.mealCount && candidate.snackCount === values.snackCount)) next.mealCount = 'A package with this meal and snack combination already exists.';
    if (!Number.isInteger(values.displayOrder) || values.displayOrder < 0) next.displayOrder = 'Display order must be zero or greater.';
    setErrors(next); if (!Object.keys(next).length) onSave(values);
  };
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !pending && onClose()}><DialogTitle>{item ? 'Edit Package' : 'Add Package'}</DialogTitle><DialogContent><Stack spacing={2.5} mt={1}>
    <Grid container spacing={2}><Grid size={{ xs: 12, sm: 6 }}><TextField required fullWidth label="Name" value={values.name} error={!!errors.name} helperText={errors.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /></Grid><Grid size={{ xs: 6, sm: 2 }}><TextField required fullWidth type="number" label="Meal Count" value={values.mealCount} error={!!errors.mealCount} helperText={errors.mealCount} onChange={(e) => setValues({ ...values, mealCount: Number(e.target.value) })} /></Grid><Grid size={{ xs: 6, sm: 2 }}><TextField required fullWidth type="number" label="Snack Count" value={values.snackCount} error={!!errors.snackCount} helperText={errors.snackCount} onChange={(e) => setValues({ ...values, snackCount: Number(e.target.value) })} /></Grid><Grid size={{ xs: 12, sm: 2 }}><TextField required fullWidth type="number" label="Order" value={values.displayOrder} error={!!errors.displayOrder} helperText={errors.displayOrder} onChange={(e) => setValues({ ...values, displayOrder: Number(e.target.value) })} /></Grid></Grid>
    <FormControlLabel control={<Switch checked={values.isActive} onChange={(_, checked) => setValues({ ...values, isActive: checked })} />} label="Active" />
  </Stack></DialogContent><DialogActions><Button disabled={pending} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={pending} onClick={submit}>{pending ? 'Saving…' : 'Save Package'}</Button></DialogActions></Dialog>;
}
