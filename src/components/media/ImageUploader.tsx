import { CloudUploadOutlined } from '@mui/icons-material';
import { Alert, Box, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadMealImage, type MealMediaType } from '@/api/mediaApi';

interface ImageUploaderProps {
  mealId?: string;
  originalPreviewUrl?: string;
  thumbnailPreviewUrl?: string;
  onComplete?: () => void;
}

interface ImageUploadFieldProps {
  mealId?: string;
  mediaType: MealMediaType;
  title: string;
  description: string;
  recommendedSize: string;
  initialPreviewUrl?: string;
  onComplete?: () => void;
}

const acceptedImages = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const filePreview = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

function ImageUploadField({ mealId, mediaType, title, description, recommendedSize, initialPreviewUrl, onComplete }: ImageUploadFieldProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl ?? '');
  const maxSize = Number(import.meta.env.VITE_UPLOAD_MAX_MB ?? 8) * 1024 * 1024;

  useEffect(() => setPreviewUrl(initialPreviewUrl ?? ''), [initialPreviewUrl]);

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
      setPreviewUrl(await filePreview(file));
      const media = await uploadMealImage(mealId, file, mediaType, setProgress);
      const uploadedUrl = mediaType === 'THUMBNAIL' ? media.thumbnailUrl : media.publicUrl;
      if (uploadedUrl) setPreviewUrl(uploadedUrl);
      setProgress(100);
      onComplete?.();
    } catch {
      setError(`The ${title.toLowerCase()} could not be uploaded. Try again.`);
      setPreviewUrl(initialPreviewUrl ?? '');
      setProgress(null);
    }
  }, [initialPreviewUrl, mealId, mediaType, onComplete, title]);

  const dropzone = useDropzone({
    onDrop,
    disabled: !mealId,
    accept: acceptedImages,
    maxSize,
    maxFiles: 1,
    onDropRejected: () => setError(`Choose a JPEG, PNG, or WebP image smaller than ${Math.round(maxSize / 1024 / 1024)} MB.`),
  });

  return <Stack spacing={1.5}>
    <Box>
      <Typography variant="h3">{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
    </Box>
    {error && <Alert severity="error">{error}</Alert>}
    {previewUrl && <Box
      component="img"
      src={previewUrl}
      alt={`${title} preview`}
      sx={{ width: '100%', height: mediaType === 'THUMBNAIL' ? 220 : 300, objectFit: 'contain', borderRadius: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider' }}
    />}
    <Paper {...dropzone.getRootProps()} variant="outlined" sx={{ p: 3, minHeight: 170, display: 'grid', placeItems: 'center', textAlign: 'center', borderStyle: 'dashed', cursor: mealId ? 'pointer' : 'not-allowed', opacity: mealId ? 1 : 0.65, bgcolor: dropzone.isDragActive ? 'rgba(0,103,78,.06)' : 'transparent' }}>
      <Stack alignItems="center">
        <input {...dropzone.getInputProps()} aria-label={`Upload ${title.toLowerCase()}`} />
        <CloudUploadOutlined color="primary" sx={{ fontSize: 42 }} />
        <Typography fontWeight={700}>Drop image here, or browse</Typography>
        <Typography variant="body2" color="text.secondary">JPEG, PNG or WebP · recommended {recommendedSize}</Typography>
      </Stack>
    </Paper>
    {progress !== null && <Box aria-live="polite"><LinearProgress variant="determinate" value={progress} /><Typography variant="caption">Upload {progress}% complete</Typography></Box>}
  </Stack>;
}

export function ImageUploader({ mealId, originalPreviewUrl, thumbnailPreviewUrl, onComplete }: ImageUploaderProps) {
  return <Stack spacing={2.5}>
    {!mealId && <Alert severity="info">Save the meal before uploading images.</Alert>}
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <ImageUploadField mealId={mealId} mediaType="IMAGE" title="Original image" description="Full-size image used on the meal details page." recommendedSize="1600 × 1200" initialPreviewUrl={originalPreviewUrl} onComplete={onComplete} />
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <ImageUploadField mealId={mealId} mediaType="THUMBNAIL" title="Thumbnail" description="Compact image used in meal lists and cards." recommendedSize="600 × 450" initialPreviewUrl={thumbnailPreviewUrl} onComplete={onComplete} />
      </Grid>
    </Grid>
  </Stack>;
}
