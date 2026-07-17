import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';

export function MenuOverrideDialog({ open, date, onClose, onSaved }: { open: boolean; date?: string; onClose: () => void; onSaved: (date: string) => void }) {
  const [values, setValues] = useState({ deliveryDate: date ?? format(new Date(), 'yyyy-MM-dd'), mealType: 'Lunch', originalMeal: '', replacementMeal: '', reason: '' });
  useEffect(() => { if (open) setValues((current) => ({ ...current, deliveryDate: date ?? format(new Date(), 'yyyy-MM-dd') })); }, [date, open]);
  const mutation = useMutation({ mutationFn: () => deliveryCalendarApi.createOverride(values), onSuccess: (result) => { onSaved(result.deliveryDate); onClose(); } });
  const invalid = !values.deliveryDate || !values.originalMeal.trim() || !values.replacementMeal.trim() || !values.reason.trim();
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Add Menu Override</DialogTitle><DialogContent><Stack spacing={2} mt={1}><TextField type="date" label="Calendar date" value={values.deliveryDate} onChange={(event) => setValues({ ...values, deliveryDate: event.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: format(new Date(), 'yyyy-MM-dd') } }} /><TextField select label="Meal slot" value={values.mealType} onChange={(event) => setValues({ ...values, mealType: event.target.value })}>{['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField><TextField label="Original meal" value={values.originalMeal} onChange={(event) => setValues({ ...values, originalMeal: event.target.value })} /><TextField label="Replacement meal" helperText="The replacement may be any active meal, even if it is not in the original template." value={values.replacementMeal} onChange={(event) => setValues({ ...values, replacementMeal: event.target.value })} /><TextField multiline minRows={3} label="Reason" value={values.reason} onChange={(event) => setValues({ ...values, reason: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={invalid || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Add override'}</Button></DialogActions></Dialog>;
}
