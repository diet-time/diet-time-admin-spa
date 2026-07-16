import { CloudUploadOutlined } from '@mui/icons-material';
import { Alert, Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadMealImage } from '@/api/mediaApi';

export function ImageUploader({ mealId, onComplete }: { mealId?: string; onComplete?: () => void }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const maxSize = Number(import.meta.env.VITE_UPLOAD_MAX_MB ?? 8) * 1024 * 1024;
  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    if (!mealId) {
      setError('Save the meal before uploading an image.');
      return;
    }

    setError('');
    setProgress(0);
    try {
      await uploadMealImage(mealId, file, setProgress);
      setProgress(100);
      onComplete?.();
    } catch {
      setError('The image could not be uploaded. Try again.');
      setProgress(null);
    }
  }, [mealId, onComplete]);

  const dropzone = useDropzone({
    onDrop,
    disabled: !mealId,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxSize,
    maxFiles: 1,
    onDropRejected: () => setError(`Choose a JPEG, PNG, or WebP image smaller than ${Math.round(maxSize / 1024 / 1024)} MB.`),
  });

  return <Stack spacing={2}>
    {!mealId && <Alert severity="info">Save the meal before uploading an image.</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    <Paper {...dropzone.getRootProps()} variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed', cursor: mealId ? 'pointer' : 'not-allowed', opacity: mealId ? 1 : 0.65, bgcolor: dropzone.isDragActive ? 'rgba(0,103,78,.06)' : 'transparent' }}>
      <input {...dropzone.getInputProps()} aria-label="Upload meal image" />
      <CloudUploadOutlined color="primary" sx={{ fontSize: 46 }} />
      <Typography fontWeight={700}>Drop a meal image here, or browse</Typography>
      <Typography variant="body2" color="text.secondary">JPEG, PNG or WebP · recommended 1600 × 1200</Typography>
    </Paper>
    {progress !== null && <Box aria-live="polite"><LinearProgress variant="determinate" value={progress} /><Typography variant="caption">Upload {progress}% complete</Typography></Box>}
  </Stack>;
}
