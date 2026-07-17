import { Add, EventBusyOutlined } from '@mui/icons-material';
import { Box, Button, Card, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { deliveryCalendarApi } from '@/api/deliveryCalendarApi';
import { queryClient } from '@/app/queryClient';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';
import { ClosureDialog } from './components/ClosureDialog';

export function HolidaysClosuresPage() {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['operational-closures'], queryFn: deliveryCalendarApi.closures });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['operational-closures'] }); await queryClient.invalidateQueries({ queryKey: ['delivery-calendar'] }); };
  return <Stack spacing={3}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="h1">Holidays / Closures</Typography><Typography color="text.secondary">Review operational closures and their subscription impact policies.</Typography></Box><Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Add closure</Button></Stack><Card>{query.isLoading ? <Box p={2}><LoadingState /></Box> : query.isError ? <Box p={2}><ErrorState message="Unable to load closures." onRetry={() => void query.refetch()} /></Box> : !query.data?.length ? <EmptyState title="No closures scheduled" /> : <Table><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Date range</TableCell><TableCell>Reason</TableCell><TableCell>Impact policy</TableCell><TableCell>Status</TableCell></TableRow></TableHead><TableBody>{query.data.map((closure) => <TableRow key={closure.id}><TableCell><Stack direction="row" alignItems="center" gap={1}><EventBusyOutlined color="error" />{closure.name}</Stack></TableCell><TableCell>{closure.startDate} – {closure.endDate}</TableCell><TableCell>{closure.reason}</TableCell><TableCell>{closure.impactPolicy.replaceAll('_', ' ')}</TableCell><TableCell><Chip size="small" color="error" label={closure.status} /></TableCell></TableRow>)}</TableBody></Table>}</Card><ClosureDialog open={open} onClose={() => setOpen(false)} onApplied={() => void refresh()} /></Stack>;
}
