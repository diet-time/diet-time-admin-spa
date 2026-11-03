import { DownloadOutlined } from '@mui/icons-material';
import { Alert, Button, Snackbar } from '@mui/material';
import { useRef, useState } from 'react';
import { apiClient } from '@/api/apiClient';

export function MasterDataExportButton() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const download = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setFailed(false);
    try {
      const response = await apiClient.get<Blob>('/admin/master-data/export', { responseType: 'blob', skipGlobalLoading: true });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'diet-time-master-data-translations.csv';
      document.body.appendChild(link);
      link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setFailed(true); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <Button variant="outlined" startIcon={<DownloadOutlined />} disabled={busy} onClick={() => void download()} title="Export all catalogue and master records, including inactive records, with English and Arabic text side by side">
      {busy ? 'Exporting master data...' : 'Export all master data'}
    </Button>
    <Snackbar open={failed} autoHideDuration={6000} onClose={() => setFailed(false)}><Alert severity="error" onClose={() => setFailed(false)}>Unable to export master data. Please try again.</Alert></Snackbar>
  </>;
}
