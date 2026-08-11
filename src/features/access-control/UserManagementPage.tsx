import {
  AccountTreeOutlined, Add, DeleteOutline, EditOutlined, KeyboardArrowDown,
  KeyboardArrowRight, PersonOutline,
} from '@mui/icons-material';
import {
  Alert, Autocomplete, Box, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Fragment, useMemo, useState } from 'react';
import { accessControlApi, type UserInput } from '@/api/accessControlApi';
import type { AccessRole, AccessUser } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { useCurrentScreenPermission } from '@/auth/useScreenPermission';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

export function UserManagementPage() {
  const [editing, setEditing] = useState<AccessUser | 'new' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { permission } = useCurrentScreenPermission();
  const canWrite = permission?.canWrite === true;
  const users = useQuery({ queryKey: ['access-control', 'users'], queryFn: accessControlApi.users });
  const roles = useQuery({ queryKey: ['access-control', 'roles'], queryFn: accessControlApi.roles });
  const selectedUser = users.data?.find(user => user.profileId === selectedId);
  const deactivateUser = useMutation({
    mutationFn: (user: AccessUser) => accessControlApi.updateUser(user.profileId, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      mobile: user.mobile,
      password: '',
      isActive: false,
      roleIds: user.roleIds,
    }),
    onSuccess: async () => {
      setConfirmDelete(false);
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ['access-control', 'users'] });
    },
  });
  const toggleExpanded = (profileId: string) => setExpandedIds(current => {
    const next = new Set(current);
    if (next.has(profileId)) next.delete(profileId); else next.add(profileId);
    return next;
  });

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h1">Users</Typography><Typography color="text.secondary">Select a user to edit or delete. Expand a row to view assigned roles.</Typography></Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" startIcon={<Add />} disabled={!canWrite} onClick={() => setEditing('new')}>Create</Button>
          <Button variant="outlined" startIcon={<EditOutlined />} disabled={!canWrite || !selectedUser} onClick={() => selectedUser && setEditing(selectedUser)}>Edit</Button>
          <Button color="error" variant="outlined" startIcon={<DeleteOutline />} disabled={!canWrite || !selectedUser?.isActive} onClick={() => setConfirmDelete(true)}>Delete</Button>
        </Stack>
      </Stack>
      <Card>
        {selectedUser && <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>Selected: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong></Typography>}
        {deactivateUser.isError && <Alert severity="error" sx={{ m: 2 }}>The user could not be deactivated. You cannot deactivate your own account.</Alert>}
        {users.isLoading || roles.isLoading ? <Box p={3}><LoadingState /></Box> : users.isError || roles.isError ? <Box p={3}><ErrorState message="Unable to load users." /></Box> : !users.data?.length ? <EmptyState /> : (
          <TableContainer>
            <Table sx={{ minWidth: 760 }} aria-label="Users and assigned roles">
              <TableHead><TableRow><TableCell padding="checkbox" /><TableCell padding="checkbox" /><TableCell>User</TableCell><TableCell>Email</TableCell><TableCell>Mobile</TableCell><TableCell>Roles</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>{users.data.map(user => {
                const expanded = expandedIds.has(user.profileId);
                const selected = selectedId === user.profileId;
                return <Fragment key={user.profileId}>
                  <TableRow hover selected={selected} onClick={() => setSelectedId(user.profileId)} sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 0 : undefined } }}>
                    <TableCell padding="checkbox"><Checkbox checked={selected} onClick={event => event.stopPropagation()} onChange={() => setSelectedId(selected ? null : user.profileId)} inputProps={{ 'aria-label': `Select ${user.firstName} ${user.lastName}` }} /></TableCell>
                    <TableCell padding="checkbox"><Tooltip title={expanded ? 'Hide roles' : 'Show roles'}><IconButton size="small" onClick={event => { event.stopPropagation(); toggleExpanded(user.profileId); }}>{expanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}</IconButton></Tooltip></TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1.25}><Box sx={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.50', color: 'primary.main' }}><PersonOutline fontSize="small" /></Box><Box><Typography fontWeight={650}>{user.firstName} {user.lastName}</Typography><Typography variant="caption" color="text.secondary">{user.status}</Typography></Box></Stack></TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mobile || '—'}</TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={`${user.roleNames.length} assigned`} /></TableCell>
                    <TableCell><Chip size="small" color={user.isActive ? 'success' : 'default'} label={user.isActive ? 'Active' : 'Inactive'} /></TableCell>
                  </TableRow>
                  {expanded && <RoleChildRows user={user} roles={roles.data ?? []} />}
                </Fragment>;
              })}</TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      {editing && <UserDialog user={editing === 'new' ? undefined : editing} roles={roles.data ?? []} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={confirmDelete}
        title="Deactivate user?"
        impact={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} will be marked inactive and will no longer be able to sign in. The user record will be retained.` : ''}
        confirmLabel={deactivateUser.isPending ? 'Deactivating…' : 'Deactivate user'}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => selectedUser && deactivateUser.mutate(selectedUser)}
      />
    </Stack>
  );
}

function RoleChildRows({ user, roles }: { user: AccessUser; roles: AccessRole[] }) {
  if (!user.roleNames.length) return <TableRow sx={{ bgcolor: 'action.hover' }}><TableCell colSpan={7} sx={{ pl: 11, color: 'text.secondary' }}>No roles assigned.</TableCell></TableRow>;
  return <>{user.roleNames.map((roleName, index) => {
    const role = roles.find(item => item.roleName.toLowerCase() === roleName.toLowerCase());
    return <TableRow key={roleName} sx={{ bgcolor: 'action.hover' }}>
      <TableCell /><TableCell />
      <TableCell sx={{ pl: 5, borderBottom: index === user.roleNames.length - 1 ? undefined : 'none' }}><Stack direction="row" alignItems="center" spacing={1}><AccountTreeOutlined fontSize="small" color="action" /><Box><Typography variant="body2" fontWeight={600}>{roleName}</Typography><Typography variant="caption" color="text.secondary">Assigned role</Typography></Box></Stack></TableCell>
      <TableCell colSpan={2}>{role?.description || '—'}</TableCell>
      <TableCell><Chip size="small" label={`${role?.screens.filter(screen => screen.canRead).length ?? 0} screens`} /></TableCell>
      <TableCell><Chip size="small" color={role?.isActive ? 'success' : 'default'} variant="outlined" label={role?.isActive ? 'Active role' : 'Inactive role'} /></TableCell>
    </TableRow>;
  })}</>;
}

function UserDialog({ user, roles, onClose }: { user?: AccessUser; roles: AccessRole[]; onClose: () => void }) {
  const [values, setValues] = useState<UserInput>({ email: user?.email ?? '', firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', mobile: user?.mobile ?? '', password: '', isActive: user?.isActive ?? true, roleIds: user?.roleIds ?? [] });
  const selectedRoles = useMemo(() => roles.filter(role => values.roleIds.includes(role.id)), [roles, values.roleIds]);
  const mutation = useMutation({
    mutationFn: () => user ? accessControlApi.updateUser(user.profileId, values) : accessControlApi.createUser({ ...values, password: values.password ?? '' }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['access-control', 'users'] }); onClose(); },
  });
  const valid = values.email.trim() && values.firstName.trim() && values.lastName.trim() && (user || (values.password?.length ?? 0) >= 10);
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>{user ? 'Edit user' : 'Create user'}</DialogTitle><DialogContent><Stack spacing={2} mt={1}>
    {mutation.isError && <Alert severity="error">The user could not be saved. Verify the email, password policy, and selected roles.</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required fullWidth label="First name" value={values.firstName} onChange={event => setValues({ ...values, firstName: event.target.value })} /><TextField required fullWidth label="Last name" value={values.lastName} onChange={event => setValues({ ...values, lastName: event.target.value })} /></Stack>
    <TextField required type="email" label="Email" value={values.email} onChange={event => setValues({ ...values, email: event.target.value })} />
    <TextField label="Mobile" value={values.mobile} onChange={event => setValues({ ...values, mobile: event.target.value })} />
    <TextField required={!user} type="password" label={user ? 'New password (leave blank to keep current)' : 'Password'} value={values.password} helperText="At least 10 characters with uppercase and a number." onChange={event => setValues({ ...values, password: event.target.value })} />
    <Autocomplete multiple options={roles.filter(role => role.isActive)} value={selectedRoles} getOptionLabel={role => role.roleName} isOptionEqualToValue={(a, b) => a.id === b.id} onChange={(_, selected) => setValues({ ...values, roleIds: selected.map(role => role.id) })} renderInput={params => <TextField {...params} label="Roles" placeholder="Select one or more roles" />} />
    <FormControlLabel control={<Checkbox checked={values.isActive} onChange={(_, active) => setValues({ ...values, isActive: active })} />} label="Active user" />
  </Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>Save user</Button></DialogActions></Dialog>;
}
