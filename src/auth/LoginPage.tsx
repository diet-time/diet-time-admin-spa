import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginWithLocalCredentials } from './session';
import { colors } from '@/theme/theme';

const schema = z.object({ username: z.string().min(1, 'Enter the username'), password: z.string().min(1, 'Enter the password') });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } });
  const submit = handleSubmit((values) => {
    setError('');
    if (!loginWithLocalCredentials(values.username, values.password)) {
      setError('Use admin as both the username and password.');
      return;
    }
    const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
    navigate(destination, { replace: true });
  });

  return <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center', p: 2, background: `radial-gradient(circle at 15% 10%, ${colors.teaGreen} 0, transparent 30%), ${colors.marshmallow}` }}>
    <Card sx={{ width: '100%', maxWidth: 440 }}><CardContent sx={{ p: { xs: 3, sm: 5 } }}>
      <Stack component="form" onSubmit={submit} spacing={3}>
        <Box><Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, mb: 2 }}>DT</Box><Typography variant="h1">Welcome back</Typography><Typography color="text.secondary">Sign in to Diet Time Admin</Typography></Box>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Username" autoComplete="username" {...register('username')} error={!!errors.username} helperText={errors.username?.message} />
        <TextField label="Password" type="password" autoComplete="current-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
        <Button type="submit" variant="contained" size="large">Sign in</Button>
        <Typography variant="caption" color="text.secondary">Local access: admin / admin</Typography>
      </Stack>
    </CardContent></Card>
  </Box>;
}
