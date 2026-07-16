import {
  ArrowForward,
  ImageNotSupportedOutlined,
  LanguageOutlined,
  LocalDiningOutlined,
  ScheduleOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi } from '@/api/dashboardApi';
import { queryKeys } from '@/api/queryKeys';
import { ErrorState, LoadingState } from '@/components/feedback/PageState';
import { colors } from '@/theme/theme';

const metrics = [
  { key: 'activeMeals', label: 'Active meals', tone: colors.emerald },
  { key: 'draftMeals', label: 'Draft meals', tone: colors.mocca },
  { key: 'unavailableMeals', label: 'Unavailable meals', tone: colors.jasper },
  { key: 'publishedPlans', label: 'Published plans', tone: colors.emerald },
  { key: 'draftPlans', label: 'Draft plans', tone: colors.orange },
  { key: 'expiringMeals', label: 'Availability expiring', tone: colors.jasper },
  { key: 'scheduledPriceChanges', label: 'Price changes scheduled', tone: colors.mocca },
] as const;

export function DashboardPage() {
  const query = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => dashboardApi.get(signal),
  });

  if (query.isLoading) return <LoadingState rows={8} />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message="Unable to load the dashboard. Try again."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const d = query.data;
  const categoryData = [...d.mealsByCategory].sort((a, b) => b.value - a.value);
  const categorizedMeals = categoryData.reduce((total, category) => total + category.value, 0);
  const categoryChartHeight = Math.max(300, categoryData.length * 44);
  const attention = [
    { label: 'Meals missing images', count: d.missingImages, icon: <ImageNotSupportedOutlined /> },
    { label: 'Missing Arabic translations', count: d.missingArabic, icon: <LanguageOutlined /> },
    { label: 'Missing nutrition details', count: d.missingNutrition, icon: <LocalDiningOutlined /> },
    { label: 'Expiring availability', count: d.expiringMeals, icon: <ScheduleOutlined /> },
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Good day</Typography>
        <Typography color="text.secondary">Here is what needs your team’s attention today.</Typography>
      </Box>

      <Grid container spacing={2}>
        {metrics.map(({ key, label, tone }) => (
          <Grid key={key} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">{label}</Typography>
                    <Typography variant="h1" mt={1}>{d[key]}</Typography>
                  </Box>
                  <Box sx={{ width: 10, height: 42, bgcolor: tone, borderRadius: 2 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={1}
                mb={2.5}
              >
                <Box>
                  <Typography variant="h3">Meals by category</Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Categories are ranked from largest to smallest for easier comparison.
                  </Typography>
                </Box>
                {categoryData.length > 0 && (
                  <Stack direction="row" gap={1}>
                    <Chip label={`${categorizedMeals} meals`} color="primary" />
                    <Chip label={`${categoryData.length} categories`} variant="outlined" />
                  </Stack>
                )}
              </Stack>

              {categoryData.length ? (
                <Box
                  role="img"
                  aria-label="Horizontal chart showing meal counts by category"
                  sx={{ maxHeight: 520, overflowY: 'auto', overflowX: 'auto', pr: 1 }}
                >
                  <Box sx={{ minWidth: 520, height: categoryChartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryData}
                        layout="vertical"
                        margin={{ top: 4, right: 48, bottom: 8, left: 8 }}
                        barCategoryGap="24%"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E3E8E5" />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#5E6E69', fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={132}
                          interval={0}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: colors.dark, fontSize: 13, fontWeight: 600 }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,103,78,.05)' }}
                          contentStyle={{ borderRadius: 12, border: '1px solid #E3E8E5' }}
                          formatter={(value) => [`${String(value)} meals`, 'Catalogue']}
                        />
                        <Bar
                          dataKey="value"
                          name="Meals"
                          fill={colors.emerald}
                          radius={[0, 8, 8, 0]}
                          maxBarSize={24}
                        >
                          <LabelList
                            dataKey="value"
                            position="right"
                            fill={colors.dark}
                            fontSize={13}
                            fontWeight={800}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              ) : (
                <Alert severity="info">Category analytics will appear when data is available.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1}>
                <WarningAmberOutlined color="warning" />
                <Typography variant="h3">Needs attention</Typography>
              </Stack>
              <List>
                {attention.map((item) => (
                  <ListItem key={item.label} divider disableGutters>
                    <ListItemIcon sx={{ minWidth: 42 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                    <Chip label={item.count} color={item.count ? 'warning' : 'success'} />
                    <ArrowForward fontSize="small" sx={{ ml: 1 }} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Stack>
  );
}
