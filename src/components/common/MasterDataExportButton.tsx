import { DownloadOutlined } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useRef, useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { toast } from '@/app/store/toastStore';

export type TranslationExportResource = 'meal-categories' | 'ingredients' | 'allergens' | 'meal-types' | 'meals' | 'meal-plans';

export function MasterDataExportButton({ resource, planId }: { resource: TranslationExportResource; planId?: string }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const download = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      const response = await apiClient.get<Blob>('/admin/master-data/export', { params: { resource, ...(planId ? { planId } : {}) }, responseType: 'blob', skipGlobalLoading: true });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diet-time-${resource}-translations.csv`;
      document.body.appendChild(link);
      link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Master data exported.');
    } catch { toast.error('Unable to export master data. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <Button variant="outlined" startIcon={<DownloadOutlined />} disabled={busy} onClick={() => void download()} title="Export English and Arabic text for this screen only">
      {busy ? 'Exporting...' : 'Export English / Arabic'}
    </Button>
  </>;
}
