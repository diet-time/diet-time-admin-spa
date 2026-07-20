import { Add, EditOutlined, Search } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { masterDataApi, type MasterInput, type MasterResource } from '@/api/masterDataApi';
import type { MasterRecord } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { RoleGuard } from '@/auth/RoleGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

const labels: Record<MasterResource, string> = {
  'meal-categories': 'Meal categories',
  ingredients: 'Ingredients',
  allergens: 'Allergens',
  'meal-types': 'Meal types',
};

const singularLabels: Record<MasterResource, string> = {
  'meal-categories': 'meal category',
  ingredients: 'ingredient',
  allergens: 'allergen',
  'meal-types': 'meal type',
};

type SortField = 'code' | 'nameEn' | 'nameAr' | 'displayOrder' | 'isActive' | 'usageCount' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';
type DialogState = { id?: string; values: MasterInput };

const baseColumns: Array<{ field: SortField; label: string }> = [
  { field: 'nameEn', label: 'English' },
  { field: 'nameAr', label: 'Arabic' },
];
const trailingColumns: Array<{ field: SortField; label: string }> = [
  { field: 'isActive', label: 'Status' },
  { field: 'usageCount', label: 'Usage' },
  { field: 'updatedAt', label: 'Last modified' },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-QA', { timeZone: 'Asia/Qatar' });
};

const emptyValues = (resource: MasterResource): MasterInput => ({
  code: '',
  nameEn: '',
  nameAr: '',
  isActive: true,
  ...(resource === 'meal-categories' ? { descriptionEn: '', descriptionAr: '', displayOrder: 0 } : {}),
});

export function MasterDataPage({ resource }: { resource: MasterResource }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(resource === 'meal-types');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const supportsAdminList = true;
  const isCategory = resource === 'meal-categories';
  const filters = {
    page: page + 1,
    pageSize,
    search: search || undefined,
    sort: supportsAdminList ? `${sortField}_${sortDirection}` : undefined,
    isActive: resource === 'meal-types' && activeOnly ? true : undefined,
  };

  const changeSort = (field: SortField) => {
    setPage(0);
    if (sortField === field) setSortDirection((value) => value === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const query = useQuery({
    queryKey: ['master', resource, filters],
    queryFn: ({ signal }) => masterDataApi.list(resource, filters, signal),
  });
  const mutation = useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: MasterInput }) => id
      ? masterDataApi.update(resource, id, body)
      : masterDataApi.create(resource, body),
    onSuccess: async () => {
      setDialog(null);
      await queryClient.invalidateQueries({ queryKey: ['master', resource] });
    },
  });

  const sortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableCell key={field} sortDirection={sortField === field ? sortDirection : false}>
      {supportsAdminList ? (
        <TableSortLabel
          active={sortField === field}
          direction={sortField === field ? sortDirection : 'asc'}
          onClick={() => changeSort(field)}
        >
          {label}
        </TableSortLabel>
      ) : label}
    </TableCell>
  );

  const editRecord = (record: MasterRecord) => setDialog({
    id: record.id,
    values: {
      code: record.code,
      nameEn: record.nameEn,
      nameAr: record.nameAr,
      descriptionEn: record.descriptionEn,
      descriptionAr: record.descriptionAr,
      displayOrder: record.displayOrder,
      isActive: record.isActive,
    },
  });

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography variant="h1">{labels[resource]}</Typography>
          <Typography color="text.secondary">Localized reference data used across catalogue and plans.</Typography>
        </Box>
        <RoleGuard allowedRoles={['Dietitian', 'ContentManager']}>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ values: emptyValues(resource) })}>
            Add {singularLabels[resource]}
          </Button>
        </RoleGuard>
      </Stack>

      <Card>
        <Stack p={2} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <TextField
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder={`Search ${labels[resource].toLowerCase()}`}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
          />
          {resource === 'meal-types' && (
            <FormControlLabel
              control={(
                <Checkbox
                  checked={activeOnly}
                  onChange={(_, checked) => { setActiveOnly(checked); setPage(0); }}
                />
              )}
              label="Show active only"
            />
          )}
        </Stack>
        {query.isLoading ? (
          <Box p={2}><LoadingState /></Box>
        ) : query.isError ? (
          <Box p={2}><ErrorState message={`Unable to load ${labels[resource].toLowerCase()}.`} onRetry={() => void query.refetch()} /></Box>
        ) : !query.data?.items.length ? (
          <EmptyState />
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: isCategory ? 1100 : 820 }}>
              <TableHead>
                <TableRow>
                  {baseColumns.map(sortHeader)}
                  {isCategory && <TableCell sx={{ minWidth: 260 }}>Descriptions</TableCell>}
                  {isCategory && sortHeader({ field: 'displayOrder', label: 'Order' })}
                  {trailingColumns.map(sortHeader)}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.items.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>{record.nameEn}</TableCell>
                    <TableCell dir="rtl">{record.nameAr || '—'}</TableCell>
                    {isCategory && (
                      <TableCell>
                        <Typography variant="body2">{record.descriptionEn || '—'}</Typography>
                        {record.descriptionAr && <Typography variant="caption" color="text.secondary" dir="rtl">{record.descriptionAr}</Typography>}
                      </TableCell>
                    )}
                    {isCategory && <TableCell>{record.displayOrder ?? 0}</TableCell>}
                    <TableCell>
                      <Button
                        component="span"
                        size="small"
                        variant={record.isActive ? 'contained' : 'outlined'}
                        color={record.isActive ? 'success' : 'error'}
                        disableRipple
                        aria-label={`Status: ${record.isActive ? 'Active' : 'Inactive'}`}
                        sx={{ minWidth: 82, minHeight: 30, px: 1.5, borderRadius: 999, cursor: 'default', pointerEvents: 'none', boxShadow: 'none' }}
                      >
                        {record.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell>{record.usageCount}</TableCell>
                    <TableCell>{formatDate(record.updatedAt || record.createdAt)}</TableCell>
                    <TableCell>
                      <RoleGuard allowedRoles={['Dietitian', 'ContentManager']}>
                        <IconButton aria-label={`Edit ${record.nameEn}`} onClick={() => editRecord(record)}><EditOutlined /></IconButton>
                      </RoleGuard>
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
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}
        />
      </Card>

      {dialog && (
        <RecordDialog
          resource={resource}
          state={dialog}
          pending={mutation.isPending}
          error={mutation.isError}
          onClose={() => setDialog(null)}
          onSave={(body) => mutation.mutate({ id: dialog.id, body })}
        />
      )}
    </Stack>
  );
}

function RecordDialog({ resource, state, pending, error, onClose, onSave }: {
  resource: MasterResource;
  state: DialogState;
  pending: boolean;
  error: boolean;
  onClose: () => void;
  onSave: (values: MasterInput) => void;
}) {
  const [values, setValues] = useState(state.values);
  const isCategory = resource === 'meal-categories';
  const requiresArabic = resource === 'meal-categories' || resource === 'ingredients' || resource === 'allergens';
  const invalid = !values.code.trim()
    || !values.nameEn.trim()
    || (requiresArabic && !values.nameAr?.trim())
    || (isCategory && (values.displayOrder === undefined || values.displayOrder < 0));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth={isCategory ? 'md' : 'sm'}>
      <DialogTitle>{state.id ? 'Edit' : 'Add'} {singularLabels[resource]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">The record could not be saved. Check for a duplicate code and review the fields.</Alert>}
          <TextField
            required
            label="Code"
            value={values.code}
            slotProps={{ htmlInput: { maxLength: 50 } }}
            onChange={(event) => setValues({ ...values, code: event.target.value })}
            helperText={isCategory ? 'Letters, numbers, hyphens, and underscores. The API stores this in uppercase.' : undefined}
          />
          <Stack direction={{ xs: 'column', md: isCategory ? 'row' : 'column' }} spacing={2}>
            <TextField
              required
              fullWidth
              label="English name"
              value={values.nameEn}
              slotProps={{ htmlInput: { maxLength: isCategory ? 100 : 160 } }}
              onChange={(event) => setValues({ ...values, nameEn: event.target.value })}
            />
            <TextField
              required={requiresArabic}
              fullWidth
              label="Arabic name"
              dir="rtl"
              value={values.nameAr ?? ''}
              slotProps={{ htmlInput: { maxLength: isCategory ? 100 : 160 } }}
              onChange={(event) => setValues({ ...values, nameAr: event.target.value })}
            />
          </Stack>
          {isCategory && (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="English description"
                  value={values.descriptionEn ?? ''}
                  onChange={(event) => setValues({ ...values, descriptionEn: event.target.value })}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Arabic description"
                  dir="rtl"
                  value={values.descriptionAr ?? ''}
                  onChange={(event) => setValues({ ...values, descriptionAr: event.target.value })}
                />
              </Stack>
              <TextField
                type="number"
                label="Display order"
                value={values.displayOrder ?? 0}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                onChange={(event) => setValues({ ...values, displayOrder: Number(event.target.value) })}
                sx={{ width: 180 }}
              />
            </>
          )}
          <FormControlLabel
            control={<Checkbox checked={values.isActive} onChange={(_, checked) => setValues({ ...values, isActive: checked })} />}
            label="Active"
          />
          {state.id && <Alert severity="info">Referenced records cannot be deleted. Deactivate this record to preserve historical data.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={pending || invalid} onClick={() => onSave(values)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
