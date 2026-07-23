import { Add, ArchiveOutlined, CalendarMonthOutlined, CancelOutlined, CheckCircleOutline, Close, EditNoteOutlined, InfoOutlined, MoreHoriz, PauseCircleOutline, PaymentsOutlined, PlayCircleOutline, PublicOutlined, Search } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Popover,
  Select,
  Stack,
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
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mealsApi } from '@/api/mealsApi';
import { masterDataApi } from '@/api/masterDataApi';
import { queryKeys } from '@/api/queryKeys';
import { RoleGuard } from '@/auth/RoleGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

const pageSizes = [10, 25, 50];
const statuses = ['Draft', 'Active', 'Inactive', 'Archived'];

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-QA', { timeZone: 'Asia/Qatar', dateStyle: 'medium', timeStyle: 'short' });
};

const dateTimeParts = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString('en-QA', { timeZone: 'Asia/Qatar', day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-QA', { timeZone: 'Asia/Qatar', hour: 'numeric', minute: '2-digit' }),
  };
};

export function MealsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Math.max(0, Number(params.get('page') ?? 1) - 1);
  const pageSize = Number(params.get('pageSize') ?? 25);
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const [selected, setSelected] = useState<string[]>([]);
  const filters = useMemo(
    () => ({
      page: page + 1,
      pageSize,
      search: search || undefined,
      status: status || undefined,
      sort: params.get('sort') ?? undefined,
    }),
    [page, pageSize, search, status, params],
  );
  const query = useQuery({
    queryKey: queryKeys.meals(filters),
    queryFn: ({ signal }) => mealsApi.list(filters, signal),
    placeholderData: keepPreviousData,
  });
  const items = query.data?.items ?? [];
  const allVisibleSelected = items.length > 0 && items.every((meal) => selected.includes(meal.id));
  const someVisibleSelected = items.some((meal) => selected.includes(meal.id)) && !allVisibleSelected;

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('search');
    next.delete('status');
    next.set('page', '1');
    setParams(next);
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h1">Meal catalogue</Typography>
          <Typography color="text.secondary" mt={0.5}>
            Find meals quickly and review their catalogue readiness at a glance.
          </Typography>
        </Box>
        <RoleGuard allowedRoles={['Dietitian', 'ContentManager']}>
          <Button component={Link} to="/meals/new" variant="contained" startIcon={<Add />}>
            Create meal
          </Button>
        </RoleGuard>
      </Stack>

      <Card sx={{ overflow: 'hidden' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'center' }}
          gap={1.5}
          p={2}
          bgcolor="background.default"
          borderBottom={1}
          borderColor="divider"
        >
          <TextField
            value={search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Search by meal name or SKU"
            aria-label="Search meals"
            sx={{ width: { xs: '100%', md: 380 }, bgcolor: 'background.paper' }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
          />
          <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'background.paper' }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(event) => update('status', event.target.value)}>
              <MenuItem value="">All statuses</MenuItem>
              {statuses.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </Select>
          </FormControl>
          {(search || status) && (
            <Button color="inherit" startIcon={<Close />} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <Box flex={1} />
          {query.data && (
            <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
              {query.data.totalCount.toLocaleString()} {query.data.totalCount === 1 ? 'meal' : 'meals'}
            </Typography>
          )}
          {selected.length > 0 && <Button variant="outlined">Export selected ({selected.length})</Button>}
        </Stack>

        {query.isLoading ? (
          <Box p={3}><LoadingState /></Box>
        ) : query.isError ? (
          <Box p={3}><ErrorState message="Unable to load meals. Try again." onRetry={() => void query.refetch()} /></Box>
        ) : !items.length ? (
          <EmptyState title="No meals found" description="Adjust the filters or create the first meal." />
        ) : (
          <TableContainer>
            <Table
              aria-label="Meals"
              size="small"
              sx={{
                width: '100%',
                minWidth: 920,
                tableLayout: 'fixed',
                '& .MuiTableCell-head': { py: 1.5, color: 'text.secondary', fontWeight: 750, bgcolor: '#FBFCFB' },
                '& .MuiTableCell-root': { px: 1 },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: '4%' }}>
                    <Checkbox
                      aria-label="Select all visible meals"
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onChange={(event) => setSelected(event.target.checked ? items.map((meal) => meal.id) : [])}
                    />
                  </TableCell>
                  <TableCell sx={{ width: '32%' }}>Meal</TableCell>
                  <TableCell sx={{ width: '11%' }}>Details</TableCell>
                  <TableCell sx={{ width: '8%' }}>Price</TableCell>
                  <TableCell sx={{ width: '8%' }}>Status</TableCell>
                  <TableCell sx={{ width: '5%' }}>Revision</TableCell>
                  <TableCell sx={{ width: '12%' }}>Availability</TableCell>
                  <TableCell sx={{ width: '15%' }}>Updated</TableCell>
                  <TableCell align="center" sx={{ width: '5%' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((meal) => (
                  <TableRow
                    key={meal.id}
                    hover
                    selected={selected.includes(meal.id)}
                    sx={{ '& > td': { py: 1.35, verticalAlign: 'middle' }, '&:last-child > td': { borderBottom: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(meal.id)}
                        onChange={() => setSelected((current) => current.includes(meal.id) ? current.filter((id) => id !== meal.id) : [...current, meal.id])}
                        inputProps={{ 'aria-label': `Select ${meal.nameEn}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.5}>
                        <Box
                          component="img"
                          src={meal.thumbnailUrl || '/meal-placeholder.svg'}
                          alt=""
                          sx={{ width: 44, height: 44, flexShrink: 0, objectFit: 'cover', borderRadius: 2, bgcolor: 'background.default' }}
                        />
                        <Box minWidth={0}>
                          <Typography
                            component={Link}
                            to={`/meals/${meal.id}`}
                            fontWeight={750}
                            fontSize="0.9rem"
                            noWrap
                            color="text.primary"
                            sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                          >
                            {meal.nameEn}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {meal.sku} · {meal.nameAr || 'Arabic translation missing'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <MealInfoPopover mealId={meal.id} category={meal.categoryName} calories={meal.calories} protein={meal.protein} />
                    </TableCell>
                    <TableCell>
                      <PricePopover mealId={meal.id} price={meal.currentPrice} currency={meal.currency} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.6} alignItems="center">
                        <LifecycleStatusIcon status={meal.status} />
                        <AvailabilityIcon available={meal.isAvailable} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>R{meal.revisionNumber}</Typography>
                    </TableCell>
                    <TableCell>
                      <AvailabilityPopover from={meal.availableFrom} until={meal.availableUntil} />
                    </TableCell>
                    <TableCell>
                      <DateTimeDisplay value={meal.updatedAt} />
                    </TableCell>
                    <TableCell align="center">
                      <RowMenu onView={() => navigate(`/meals/${meal.id}`)} onEdit={() => navigate(`/meals/${meal.id}/edit`)} />
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
          onPageChange={(_, nextPage) => update('page', String(nextPage + 1))}
          rowsPerPage={pageSize}
          rowsPerPageOptions={pageSizes}
          onRowsPerPageChange={(event) => update('pageSize', event.target.value)}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Card>
    </Stack>
  );
}

function LifecycleStatusIcon({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let icon: ReactNode = <PlayCircleOutline sx={{ fontSize: 17, color: 'success.main' }} />;
  if (normalized.includes('draft')) icon = <EditNoteOutlined sx={{ fontSize: 18, color: 'warning.main' }} />;
  else if (normalized.includes('inactive')) icon = <PauseCircleOutline sx={{ fontSize: 17, color: 'error.main' }} />;
  else if (normalized.includes('archive')) icon = <ArchiveOutlined sx={{ fontSize: 17, color: 'text.disabled' }} />;
  else if (normalized.includes('published')) icon = <PublicOutlined sx={{ fontSize: 17, color: 'success.main' }} />;
  return (
    <Tooltip title={`Status: ${status}`} arrow>
      <Box component="span" display="inline-flex" aria-label={`Status: ${status}`}>{icon}</Box>
    </Tooltip>
  );
}

function AvailabilityIcon({ available }: { available: boolean }) {
  const label = available ? 'Available' : 'Unavailable';
  return (
    <Tooltip title={label} arrow>
      <Box component="span" display="inline-flex" aria-label={label}>
        {available
          ? <CheckCircleOutline sx={{ fontSize: 16, color: 'success.main' }} />
          : <CancelOutlined sx={{ fontSize: 16, color: 'error.main' }} />}
      </Box>
    </Tooltip>
  );
}

function DateTimeDisplay({ value }: { value?: string }) {
  const parts = dateTimeParts(value);
  if (!parts) return <Typography color="text.secondary">—</Typography>;
  return (
    <Stack spacing={0.1}>
      <Typography variant="body2" fontWeight={650} noWrap>{parts.date}</Typography>
      <Typography variant="caption" color="text.secondary" noWrap>{parts.time}</Typography>
    </Stack>
  );
}

function MealInfoPopover({ mealId, category, calories, protein }: { mealId: string; category: string; calories?: number; protein?: number }) {
  const [opened, setOpened] = useState(false);
  const needsDetail = category === 'Not assigned' || (calories === undefined && protein === undefined);
  const detailQuery = useQuery({
    queryKey: ['meal-popover-detail', mealId],
    queryFn: ({ signal }) => mealsApi.get(mealId, signal),
    enabled: opened && needsDetail,
    staleTime: 5 * 60 * 1000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['meal-categories', 'dropdown'],
    queryFn: ({ signal }) => masterDataApi.list('meal-categories', { page: 1, pageSize: 100, sort: 'displayOrder_asc' }, signal),
    enabled: opened && category === 'Not assigned' && Boolean(detailQuery.data?.categoryId),
    staleTime: 5 * 60 * 1000,
  });
  const detailCategory = categoriesQuery.data?.items.find((item) => item.id === detailQuery.data?.categoryId)?.nameEn;
  if (category === 'Not assigned' && detailCategory) category = detailCategory;
  calories ??= detailQuery.data?.nutrition.calories;
  protein ??= detailQuery.data?.nutrition.protein;
  const hasNutrition = calories !== undefined || protein !== undefined || detailQuery.data?.hasNutrition === true;

  return (
    <DetailsPopover label="Details" ariaLabel="View category and nutrition" icon={<InfoOutlined />} onOpenChange={setOpened}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="caption" color="text.secondary">Category</Typography>
          <Typography fontWeight={700}>{category}</Typography>
        </Box>
        <Divider />
        <Box>
          <Typography variant="caption" color="text.secondary">Nutrition</Typography>
          {hasNutrition ? (
            <Stack direction="row" spacing={3} mt={0.5}>
              <Box>
                <Typography fontWeight={700}>{calories ?? '—'}</Typography>
                <Typography variant="caption" color="text.secondary">Calories (kcal)</Typography>
              </Box>
              <Box>
                <Typography fontWeight={700}>{protein ?? '—'} g</Typography>
                <Typography variant="caption" color="text.secondary">Protein</Typography>
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" mt={0.5}>Nutrition not provided</Typography>
          )}
        </Box>
      </Stack>
    </DetailsPopover>
  );
}

function PricePopover({ mealId, price, currency }: { mealId: string; price?: number; currency?: string }) {
  const [opened, setOpened] = useState(false);
  const query = useQuery({
    queryKey: ['meal-popover-detail', mealId],
    queryFn: ({ signal }) => mealsApi.get(mealId, signal),
    enabled: opened && price === undefined,
    staleTime: 5 * 60 * 1000,
  });
  const now = Date.now();
  const detailPrice = query.data?.prices
    .filter((candidate) => {
      if (!candidate.isActive) return false;
      const startsAt = new Date(candidate.effectiveFrom).getTime();
      const endsAt = candidate.effectiveUntil ? new Date(candidate.effectiveUntil).getTime() : undefined;
      return (Number.isNaN(startsAt) || startsAt <= now)
        && (endsAt === undefined || Number.isNaN(endsAt) || endsAt >= now);
    })
    .sort((left, right) => new Date(right.effectiveFrom).getTime() - new Date(left.effectiveFrom).getTime())[0];
  const displayedPrice = price ?? detailPrice?.amount;
  const displayedCurrency = currency ?? detailPrice?.currencyCode;

  return (
    <DetailsPopover label="Price" ariaLabel="View meal price" icon={<PaymentsOutlined />} width={220} onOpenChange={setOpened}>
      <Typography variant="caption" color="text.secondary">Current price</Typography>
      {query.isLoading ? (
        <Typography color="text.secondary" mt={0.5}>Loading priceâ€¦</Typography>
      ) : query.isError ? (
        <Stack alignItems="flex-start" spacing={0.75} mt={0.5}>
          <Typography color="error.main">Unable to load price</Typography>
          <Button size="small" onClick={() => void query.refetch()}>Try again</Button>
        </Stack>
      ) : displayedPrice === undefined ? (
        <Typography color="text.secondary" mt={0.5}>No price configured</Typography>
      ) : (
        <Typography variant="h3" mt={0.5}>{displayedCurrency ?? 'QAR'} {displayedPrice.toFixed(2)}</Typography>
      )}
    </DetailsPopover>
  );
}

function AvailabilityPopover({ from, until }: { from?: string; until?: string }) {
  return (
    <DetailsPopover label="Dates" ariaLabel="View availability window" icon={<CalendarMonthOutlined />} width={300}>
      <Typography variant="caption" color="text.secondary">Availability window</Typography>
      <Stack spacing={1.25} mt={1}>
        <Box>
          <Typography variant="caption" color="text.secondary">Available from</Typography>
          <Typography fontWeight={700}>{from ? formatDateTime(from) : 'Always available'}</Typography>
        </Box>
        <Divider />
        <Box>
          <Typography variant="caption" color="text.secondary">Available until</Typography>
          <Typography fontWeight={700}>{until ? formatDateTime(until) : 'No end date'}</Typography>
        </Box>
      </Stack>
    </DetailsPopover>
  );
}

function DetailsPopover({ label, ariaLabel, icon, width = 280, children, onOpenChange }: { label: string; ariaLabel: string; icon: ReactNode; width?: number; children: ReactNode; onOpenChange?: (open: boolean) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = (element: HTMLElement) => {
    setAnchor(element);
    onOpenChange?.(true);
  };
  const close = () => {
    setAnchor(null);
    onOpenChange?.(false);
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={icon}
        onClick={(event) => open(event.currentTarget)}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        sx={{ minWidth: 0, minHeight: 28, px: 1.15, py: 0.2, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary', borderColor: '#DDE6E1', bgcolor: '#F8FAF9', boxShadow: '0 1px 2px rgba(23,53,45,.04)', '& .MuiButton-startIcon': { mr: 0.55, color: 'primary.main' }, '& .MuiSvgIcon-root': { fontSize: 15 }, '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'rgba(0, 111, 82, 0.05)', boxShadow: '0 2px 6px rgba(23,53,45,.08)' } }}
      >
        {label}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width, p: 2, mt: 0.75, border: 1, borderColor: 'divider', boxShadow: '0 12px 32px rgba(23,53,45,.14)' } } }}
      >
        {children}
      </Popover>
    </>
  );
}

function RowMenu({ onView, onEdit }: { onView: () => void; onEdit: () => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  const runAndClose = (action: () => void) => { close(); action(); };

  return (
    <>
      <Tooltip title="Meal actions">
        <IconButton aria-label="Meal actions" onClick={(event) => setAnchor(event.currentTarget)}><MoreHoriz /></IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => runAndClose(onView)}>View details</MenuItem>
        <RoleGuard allowedRoles={['Dietitian', 'ContentManager']}>
          <MenuItem onClick={() => runAndClose(onEdit)}>Edit meal</MenuItem>
        </RoleGuard>
        <MenuItem onClick={close}>View audit history</MenuItem>
      </Menu>
    </>
  );
}
