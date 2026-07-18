/* eslint-disable react-refresh/only-export-components */
import { CalendarMonthOutlined, CheckCircleOutline, VisibilityOffOutlined } from '@mui/icons-material';
import { Alert, Box, Chip, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useController, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import type { MealFormValues } from '../schemas/mealSchema';

export const toUtcIso = (localDateTime: string) =>
  localDateTime ? new Date(localDateTime).toISOString() : undefined;

export const deriveAvailabilityMode = (
  isAvailable: boolean,
  availableFrom?: string,
  availableUntil?: string,
): MealFormValues['availability']['mode'] => {
  if (!isAvailable) return 'indefinite';
  if (availableFrom && availableUntil) return 'range';
  if (availableFrom) return 'from';
  if (availableUntil) return 'until';
  return 'always';
};

export function AvailabilityEditor({
  control,
  register,
  errors,
}: {
  control: Control<MealFormValues>;
  register: UseFormRegister<MealFormValues>;
  errors: FieldErrors<MealFormValues>;
  from?: string;
  until?: string;
}) {
  const isAvailable = useWatch({ control, name: 'availability.isAvailable' });
  const availableFrom = useWatch({ control, name: 'availability.availableFrom' });
  const availableUntil = useWatch({ control, name: 'availability.availableUntil' });
  const { field: modeField } = useController({ control, name: 'availability.mode' });

  useEffect(() => {
    const nextMode = deriveAvailabilityMode(isAvailable, availableFrom, availableUntil);
    if (modeField.value !== nextMode) modeField.onChange(nextMode);
  }, [availableFrom, availableUntil, isAvailable, modeField]);

  return <Stack spacing={3}>
    <Box>
      <Typography variant="h2">Customer availability</Typography>
      <Typography color="text.secondary" mt={0.5}>
        Control whether customers can select this meal. Optional dates use Qatar time (UTC+3).
      </Typography>
    </Box>

    <Controller
      control={control}
      name="availability.isAvailable"
      render={({ field }) => <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5, border: '1px solid', borderColor: field.value ? 'rgba(0,103,78,.28)' : 'rgba(194,91,22,.3)', bgcolor: field.value ? 'rgba(0,103,78,.055)' : '#FFF7ED' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
          <FormControlLabel
            sx={{ m: 0 }}
            control={<Switch checked={field.value} onChange={(_, value) => field.onChange(value)} />}
            label={<Box ml={0.75}>
              <Typography fontWeight={700}>Available for customers</Typography>
              <Typography variant="body2" color="text.secondary">
                {field.value ? 'Customers can add this meal to eligible orders.' : 'This meal is hidden from customer selection.'}
              </Typography>
            </Box>}
          />
          <Chip
            icon={field.value ? <CheckCircleOutline /> : <VisibilityOffOutlined />}
            label={field.value ? 'Selectable' : 'Unavailable'}
            color={field.value ? 'success' : 'warning'}
            variant="outlined"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }}
          />
        </Stack>
      </Box>}
    />

    {isAvailable ? <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
        <CalendarMonthOutlined color="primary" />
        <Typography variant="h3">Optional availability window</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2.5}>
        Leave both fields empty to keep the meal available without a time limit.
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            type="datetime-local"
            label="Available from"
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('availability.availableFrom')}
            helperText="Optional start date and time"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            type="datetime-local"
            label="Available until"
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('availability.availableUntil')}
            error={!!errors.availability?.availableUntil}
            helperText={errors.availability?.availableUntil?.message ?? 'Optional end date and time'}
          />
        </Grid>
      </Grid>
    </Box> : <Alert severity="info" icon={<VisibilityOffOutlined />}>
      The meal will be unavailable immediately. Any saved availability dates are ignored while this setting is off.
    </Alert>}

    {isAvailable && (availableFrom || availableUntil) && <Alert severity="warning">
      Changing an active availability window may affect published meal plans and active subscriptions.
    </Alert>}
  </Stack>;
}
