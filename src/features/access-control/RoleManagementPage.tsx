import { Add, DeleteOutline, EditOutlined, SecurityOutlined } from '@mui/icons-material';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, Checkbox, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { accessControlApi, type RoleInput } from '@/api/accessControlApi';
import type { AccessRole, ScreenPermission } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { useCurrentScreenPermission } from '@/auth/useScreenPermission';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

const groupScreens = (screens: ScreenPermission[]) => Object.entries(screens.reduce<Record<string, ScreenPermission[]>>((groups, screen) => {
  (groups[screen.groupName] ??= []).push(screen);
  return groups;
}, {}));

export function RoleManagementPage() {
  const [editing, setEditing] = useState<AccessRole | 'new' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { permission } = useCurrentScreenPermission();
  const canWrite = permission?.canWrite === true;
  const screens = useQuery({ queryKey: ['access-control', 'screens'], queryFn: accessControlApi.screens });
  const roles = useQuery({ queryKey: ['access-control', 'roles'], queryFn: accessControlApi.roles });
  const selectedRole = roles.data?.find(role => role.id === selectedId);
  const deactivateRole = useMutation({
    mutationFn: (role: AccessRole) => accessControlApi.updateRole(role.id, {
      roleName: role.roleName,
      description: role.description,
      isActive: false,
      screens: role.screens.map(screen => ({ screenId: screen.screenId, canRead: screen.canRead, canWrite: screen.canWrite })),
    }),
    onSuccess: async () => {
      setConfirmDelete(false);
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['access-control'] });
    },
  });

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h1">Roles</Typography>
          <Typography color="text.secondary">Manage roles and their hierarchical screen permissions.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" startIcon={<Add />} disabled={!canWrite} onClick={() => setEditing('new')}>Create</Button>
          <Button variant="outlined" startIcon={<EditOutlined />} disabled={!canWrite || !selectedRole} onClick={() => selectedRole && setEditing(selectedRole)}>Edit</Button>
          <Button color="error" variant="outlined" startIcon={<DeleteOutline />} disabled={!canWrite || !selectedRole?.isActive || selectedRole?.roleName.toLowerCase() === 'admin'} onClick={() => setConfirmDelete(true)}>Delete</Button>
        </Stack>
      </Stack>

      {roles.isLoading || screens.isLoading ? <LoadingState /> : roles.isError || screens.isError ? (
        <ErrorState message="Unable to load roles and screen permissions." />
      ) : !roles.data?.length ? <Card><EmptyState /></Card> : (
        <Stack spacing={1.5}>
          {roles.data.map(role => <RoleAccordion key={role.id} role={role} selected={role.id === selectedId} onSelect={() => setSelectedId(role.id === selectedId ? null : role.id)} />)}
        </Stack>
      )}

      {editing && (
        <RoleDialog
          role={editing === 'new' ? undefined : editing}
          screens={screens.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      {deactivateRole.isError && <Alert severity="error">The role could not be deactivated. The Admin role cannot be deactivated.</Alert>}
      <ConfirmDialog
        open={confirmDelete}
        title="Deactivate role?"
        impact={selectedRole ? `${selectedRole.roleName} will be marked inactive. Its screen mappings will be retained.` : ''}
        confirmLabel={deactivateRole.isPending ? 'Deactivating…' : 'Deactivate role'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => selectedRole && deactivateRole.mutate(selectedRole)}
      />
    </Stack>
  );
}

function RoleAccordion({ role, selected, onSelect }: { role: AccessRole; selected: boolean; onSelect: () => void }) {
  const assigned = role.screens.filter(screen => screen.canRead || screen.canWrite);
  const groups = useMemo(() => groupScreens(assigned), [assigned]);
  return (
    <Accordion disableGutters sx={{ border: 1, borderColor: selected ? 'primary.main' : 'divider', borderRadius: '12px !important', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" width="100%" pr={2} gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Checkbox checked={selected} onClick={event => event.stopPropagation()} onChange={onSelect} inputProps={{ 'aria-label': `Select ${role.roleName}` }} />
            <SecurityOutlined color="primary" />
            <Box><Typography fontWeight={750}>{role.roleName}</Typography><Typography variant="body2" color="text.secondary">{role.description || 'No description'}</Typography></Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip size="small" color={role.isActive ? 'success' : 'default'} label={role.isActive ? 'Active' : 'Inactive'} />
            <Chip size="small" variant="outlined" label={`${assigned.length} screens`} />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {!groups.length ? <Alert severity="info">No screens are assigned to this role.</Alert> : groups.map(([groupName, groupScreens]) => (
            <Box key={groupName} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Typography fontWeight={700} sx={{ px: 2, py: 1.25, bgcolor: 'action.hover' }}>{groupName}</Typography>
              <Divider />
              <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Screen</TableCell><TableCell align="center">Read</TableCell><TableCell align="center">Write</TableCell></TableRow></TableHead><TableBody>
                {(groupScreens ?? []).map(screen => <TableRow key={screen.screenId}><TableCell><Typography fontWeight={600}>{screen.screenName}</Typography></TableCell><TableCell align="center"><PermissionChip allowed={screen.canRead} /></TableCell><TableCell align="center"><PermissionChip allowed={screen.canWrite} /></TableCell></TableRow>)}
              </TableBody></Table></TableContainer>
            </Box>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function PermissionChip({ allowed }: { allowed: boolean }) {
  return <Chip size="small" color={allowed ? 'success' : 'default'} variant={allowed ? 'filled' : 'outlined'} label={allowed ? 'Allowed' : 'Not allowed'} />;
}

function RoleDialog({ role, screens, onClose }: { role?: AccessRole; screens: ScreenPermission[]; onClose: () => void }) {
  const [name, setName] = useState(role?.roleName ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [active, setActive] = useState(role?.isActive ?? true);
  const [permissions, setPermissions] = useState<Record<string, { canRead: boolean; canWrite: boolean }>>(() => Object.fromEntries(screens.map(screen => {
    const current = role?.screens.find(item => item.screenId === screen.screenId);
    return [screen.screenId, { canRead: current?.canRead ?? false, canWrite: current?.canWrite ?? false }];
  })));
  const groups = useMemo(() => groupScreens(screens), [screens]);
  const mutation = useMutation({
    mutationFn: (body: RoleInput) => role ? accessControlApi.updateRole(role.id, body) : accessControlApi.createRole(body),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['access-control'] }); onClose(); },
  });
  const setPermission = (id: string, field: 'canRead' | 'canWrite', checked: boolean) => setPermissions(value => {
    const current = value[id] ?? { canRead: false, canWrite: false };
    return { ...value, [id]: field === 'canWrite'
      ? { canRead: checked || current.canRead, canWrite: checked }
      : { canRead: checked, canWrite: checked ? current.canWrite : false } };
  });
  const save = () => mutation.mutate({
    roleName: name.trim(), description: description.trim() || undefined, isActive: active,
    screens: screens.map(screen => ({ screenId: screen.screenId, ...(permissions[screen.screenId] ?? { canRead: false, canWrite: false }) })),
  });
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{role ? 'Edit role' : 'Create role'}</DialogTitle>
      <DialogContent><Stack spacing={2} mt={1}>
        {mutation.isError && <Alert severity="error">The role could not be saved. Check that the name is unique.</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required fullWidth label="Role name" value={name} onChange={event => setName(event.target.value)} /><TextField fullWidth label="Description" value={description} onChange={event => setDescription(event.target.value)} /></Stack>
        <FormControlLabel control={<Checkbox checked={active} onChange={(_, value) => setActive(value)} />} label="Active role" />
        <Typography variant="h6">Screen permissions</Typography>
        <Stack spacing={1.5}>{groups.map(([groupName, groupScreens]) => (
          <Box key={groupName} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Typography fontWeight={700} sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>{groupName}</Typography>
            <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Screen</TableCell><TableCell align="center">Read</TableCell><TableCell align="center">Write</TableCell></TableRow></TableHead><TableBody>{(groupScreens ?? []).map(screen => <TableRow key={screen.screenId}><TableCell>{screen.screenName}</TableCell><TableCell align="center"><Checkbox checked={permissions[screen.screenId]?.canRead ?? false} onChange={(_, value) => setPermission(screen.screenId, 'canRead', value)} /></TableCell><TableCell align="center"><Checkbox checked={permissions[screen.screenId]?.canWrite ?? false} onChange={(_, value) => setPermission(screen.screenId, 'canWrite', value)} /></TableCell></TableRow>)}</TableBody></Table></TableContainer>
          </Box>
        ))}</Stack>
      </Stack></DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!name.trim() || mutation.isPending} onClick={save}>Save role</Button></DialogActions>
    </Dialog>
  );
}
