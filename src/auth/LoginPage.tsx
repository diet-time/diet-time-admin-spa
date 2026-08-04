import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login } from './session';
import { colors } from '@/theme/theme';

const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter the password') });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
    } catch {
      setError('The email or password is incorrect, or the server is unavailable.');
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
        <TextField label="Email" type="email" autoComplete="username" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
        <TextField label="Password" type="password" autoComplete="current-password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </Stack>
    </CardContent></Card>
  </Box>;
}
