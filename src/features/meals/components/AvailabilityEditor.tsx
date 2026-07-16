/* eslint-disable react-refresh/only-export-components */
import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { format } from 'date-fns';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import type { MealFormValues } from '../schemas/mealSchema';

const options = [
  { value: 'always', label: 'Always available' },
  { value: 'from', label: 'Available from a future date' },
  { value: 'until', label: 'Available until a date' },
  { value: 'range', label: 'Available only within a date range' },
  { value: 'temporary', label: 'Temporarily unavailable' },
  { value: 'indefinite', label: 'Indefinitely unavailable' },
] as const;

export const toUtcIso = (localDateTime: string) =>
  localDateTime ? new Date(localDateTime).toISOString() : undefined;

export function AvailabilityEditor({
  control,
  register,
  errors,
  from,
  until,
}: {
  control: Control<MealFormValues>;
  register: UseFormRegister<MealFormValues>;
  errors: FieldErrors<MealFormValues>;
  from?: string;
  until?: string;
}) {
  return (
    <Stack spacing={3}>
      {/* Header Section */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          Availability Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure when this meal is available to customers. Times are in Qatar timezone
          (UTC+3).
        </Typography>
      </Box>

      <Divider />

      {/* Selectability Toggle */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.default',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Controller
          control={control}
          name="availability.isAvailable"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, value) => field.onChange(value)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Meal is selectable
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {field.value
                      ? 'Customers can select this meal'
                      : 'Customers cannot select this meal'}
                  </Typography>
                </Box>
              }
            />
          )}
        />
      </Box>

      {/* Availability Schedule */}
      <FormControl fullWidth>
        <InputLabel id="availability-mode" sx={{ fontSize: '0.95rem' }}>
          Availability Schedule
        </InputLabel>
        <Controller
          control={control}
          name="availability.mode"
          render={({ field }) => (
            <Select
              {...field}
              labelId="availability-mode"
              label="Availability Schedule"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            >
              {options.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          )}
        />
      </FormControl>

      {/* Date/Time Inputs */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          type="datetime-local"
          label="Available from"
          InputLabelProps={{ shrink: true }}
          {...register('availability.availableFrom')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
            },
          }}
        />
        <TextField
          fullWidth
          type="datetime-local"
          label="Available until"
          InputLabelProps={{ shrink: true }}
          {...register('availability.availableUntil')}
          error={!!errors.availability?.availableUntil}
          helperText={errors.availability?.availableUntil?.message}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
            },
          }}
        />
      </Stack>

      {/* Timeline Visualization */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'background.default',
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, mb: 2, textTransform: 'uppercase' }}
          color="text.secondary"
        >
          Availability Timeline
        </Typography>

        <Box
          display="grid"
          gridTemplateColumns="repeat(3, 1fr)"
          gap={2}
          sx={{
            '& > *': {
              transition: 'all 0.2s ease-in-out',
            },
          }}
        >
          {/* Past */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              opacity: 0.6,
              bgcolor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 1,
              '&:hover': {
                borderColor: 'action.disabled',
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                textTransform: 'uppercase',
                mb: 0.8,
                letterSpacing: 0.5,
                color: 'text.secondary',
              }}
            >
              Past
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                fontSize: '0.95rem',
              }}
            >
              {from ? format(new Date(from), 'dd MMM yyyy') : 'No start'}
            </Typography>
          </Paper>

          {/* Current */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              borderColor: 'primary.main',
              bgcolor: 'rgba(0, 103, 78, 0.08)',
              borderRadius: 1,
              borderWidth: 2,
              boxShadow: 'inset 0 0 0 1px rgba(0, 103, 78, 0.2)',
              '&:hover': {
                borderColor: 'primary.dark',
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                textTransform: 'uppercase',
                mb: 0.8,
                letterSpacing: 0.5,
                color: 'primary.main',
              }}
            >
              Current
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                fontSize: '0.95rem',
              }}
            >
              Qatar · UTC+3
            </Typography>
          </Paper>

          {/* Future */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              opacity: 0.6,
              bgcolor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 1,
              '&:hover': {
                borderColor: 'action.disabled',
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                textTransform: 'uppercase',
                mb: 0.8,
                letterSpacing: 0.5,
                color: 'text.secondary',
              }}
            >
              Future
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                fontSize: '0.95rem',
              }}
            >
              {until ? format(new Date(until), 'dd MMM yyyy') : 'No end'}
            </Typography>
          </Paper>
        </Box>

        {/* Warning message */}
        <Typography
          variant="caption"
          color="warning.main"
          sx={{
            display: 'block',
            mt: 2,
            p: 1,
            bgcolor: 'rgba(255, 152, 0, 0.05)',
            borderRadius: 0.5,
            fontStyle: 'italic',
          }}
        >
          ⚠️ Shortening an active period can affect published plan slots and active
          subscriptions, and must be confirmed before saving.
        </Typography>
      </Box>
    </Stack>
  );
}
