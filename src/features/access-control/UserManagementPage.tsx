import { Add, EditOutlined } from '@mui/icons-material';
import {
  Alert, Autocomplete, Box, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { accessControlApi, type UserInput } from '@/api/accessControlApi';
import type { AccessRole, AccessUser } from '@/api/apiTypes';
import { queryClient } from '@/app/queryClient';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/PageState';

export function UserManagementPage() {
  const [editing, setEditing] = useState<AccessUser | 'new' | null>(null);
  const users = useQuery({ queryKey: ['access-control', 'users'], queryFn: accessControlApi.users });
  const roles = useQuery({ queryKey: ['access-control', 'roles'], queryFn: accessControlApi.roles });
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box><Typography variant="h1">Users</Typography><Typography color="text.secondary">Create staff accounts and assign one or more roles.</Typography></Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setEditing('new')}>Create user</Button>
      </Stack>
      <Card>
        {users.isLoading || roles.isLoading ? <Box p={3}><LoadingState /></Box> : users.isError || roles.isError ? <Box p={3}><ErrorState message="Unable to load users." /></Box> : !users.data?.length ? <EmptyState /> : (
          <TableContainer><Table><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Roles</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{users.data.map(user => <TableRow key={user.profileId} hover><TableCell>{user.firstName} {user.lastName}</TableCell><TableCell>{user.email}</TableCell><TableCell><Stack direction="row" gap={0.5} flexWrap="wrap">{user.roleNames.map(name => <Chip size="small" key={name} label={name} />)}</Stack></TableCell><TableCell><Chip size="small" color={user.isActive ? 'success' : 'default'} label={user.isActive ? 'Active' : 'Inactive'} /></TableCell><TableCell align="right"><Button startIcon={<EditOutlined />} onClick={() => setEditing(user)}>Edit</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer>
        )}
      </Card>
      {editing && <UserDialog user={editing === 'new' ? undefined : editing} roles={roles.data ?? []} onClose={() => setEditing(null)} />}
    </Stack>
  );
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
