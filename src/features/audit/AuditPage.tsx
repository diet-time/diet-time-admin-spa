import { Box, Button, Card, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { auditApi } from '@/api/auditApi';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

export function AuditPage() {
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [user, setUser] = useState('');
  const [source, setSource] = useState('');
  const [outcome, setOutcome] = useState('');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const draft = { page: page + 1, pageSize: 25, entityType: entity || undefined, action: action || undefined,
    user: user || undefined, source: source || undefined, outcome: outcome || undefined,
    from: from || undefined, until: until || undefined };
  const [applied, setApplied] = useState(draft);
  const filters = { ...applied, page: page + 1 };
  const query = useQuery({ queryKey: ['audit', filters], queryFn: ({ signal }) => auditApi.list(filters, signal) });
  const change = (set: (value: string) => void, value: string) => { set(value); };
  return <Stack spacing={3}>
    <Box><Typography variant="h1">Audit history</Typography><Typography color="text.secondary">API actions by user and date. Times and date filters use Qatar local time.</Typography></Box>
    <Card>
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={2} p={2}>
        <TextField label="Area / entity" value={entity} onChange={e => change(setEntity, e.target.value)} />
        <TextField label="Action" value={action} onChange={e => change(setAction, e.target.value)} />
        <TextField label="User name or ID" value={user} onChange={e => change(setUser, e.target.value)} />
        <TextField select label="Application" value={source} onChange={e => change(setSource, e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">All applications</MenuItem><MenuItem value="FLUTTER">Flutter</MenuItem><MenuItem value="REACT_ADMIN">React Admin</MenuItem><MenuItem value="API">Other API clients</MenuItem>
        </TextField>
        <TextField select label="Result" value={outcome} onChange={e => change(setOutcome, e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">All results</MenuItem>{['SUCCEEDED', 'REJECTED', 'FAILED'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <TextField type="date" label="From" value={from} onChange={e => change(setFrom, e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="Until" value={until} onChange={e => change(setUntil, e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button variant="contained" onClick={() => { setPage(0); setApplied(draft); }}>Apply filters</Button>
        <Button onClick={() => void query.refetch()}>Refresh audit history</Button>
      </Stack>
      {query.isLoading ? <Box p={2}><LoadingState /></Box> : query.isError ? <Box p={2}><ErrorState message="Unable to load audit history. Check the selected filters and retry." onRetry={() => void query.refetch()} /></Box>
        : !query.data?.items.length ? <EmptyState title="No audit records found" /> : <TableContainer><Table size="small" aria-label="API audit history">
          <TableHead><TableRow>{['Date and time (Qatar)', 'User', 'Application', 'Area', 'Action', 'Result', 'Affected records', 'Request reference'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>{query.data.items.map(entry => <TableRow key={entry.id}>
            <TableCell>{new Date(entry.changedAt).toLocaleString('en-QA', { timeZone: 'Asia/Qatar' })}</TableCell>
            <TableCell>{entry.changedBy}<Typography variant="caption" display="block">{entry.userId}</Typography></TableCell>
            <TableCell>{entry.source === 'REACT_ADMIN' ? 'React Admin' : entry.source === 'FLUTTER' ? 'Flutter' : 'API'}</TableCell>
            <TableCell>{entry.entityType}</TableCell><TableCell>{entry.action}<Typography variant="caption" display="block">{entry.httpMethod} {entry.endpoint}</Typography></TableCell>
            <TableCell><Chip size="small" label={`${entry.outcome ?? 'Recorded'}${entry.statusCode ? ` · ${entry.statusCode}` : ''}`} color={entry.outcome === 'SUCCEEDED' ? 'success' : entry.outcome === 'FAILED' ? 'error' : 'default'} /></TableCell>
            <TableCell sx={{ maxWidth: 250, overflowWrap: 'anywhere' }}>{entry.targets?.map(target => <Typography key={`${target.type}-${target.id}`} variant="caption" display="block">{target.type}: {target.id}</Typography>) ?? entry.entityId}</TableCell>
            <TableCell sx={{ maxWidth: 200, overflowWrap: 'anywhere' }}>{entry.correlationId}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer>}
      <TablePagination component="div" count={query.data?.totalCount ?? 0} page={page} onPageChange={(_, value) => setPage(value)} rowsPerPage={25} rowsPerPageOptions={[25]} />
    </Card>
  </Stack>;
}
