import { DownloadOutlined } from '@mui/icons-material';
import { Alert, Button, Snackbar } from '@mui/material';
import { useRef, useState } from 'react';
import { apiClient } from '@/api/apiClient';

export type TranslationExportResource = 'meal-categories' | 'ingredients' | 'allergens' | 'meal-types' | 'meals' | 'meal-plans';

export function MasterDataExportButton({ resource, planId }: { resource: TranslationExportResource; planId?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const download = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setFailed(false);
    try {
      const response = await apiClient.get<Blob>('/admin/master-data/export', { params: { resource, ...(planId ? { planId } : {}) }, responseType: 'blob', skipGlobalLoading: true });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diet-time-${resource}-translations.csv`;
      document.body.appendChild(link);
      link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setFailed(true); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <Button variant="outlined" startIcon={<DownloadOutlined />} disabled={busy} onClick={() => void download()} title="Export English and Arabic text for this screen only">
      {busy ? 'Exporting...' : 'Export English / Arabic'}
    </Button>
    <Snackbar open={failed} autoHideDuration={6000} onClose={() => setFailed(false)}><Alert severity="error" onClose={() => setFailed(false)}>Unable to export master data. Please try again.</Alert></Snackbar>
  </>;
}
