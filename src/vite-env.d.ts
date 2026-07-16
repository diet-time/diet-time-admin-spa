/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_DEFAULT_LANGUAGE?: 'en' | 'ar';
  readonly VITE_ENABLE_ARABIC?: string;
  readonly VITE_IDLE_TIMEOUT_MINUTES?: string;
  readonly VITE_UPLOAD_MAX_MB?: string;
}
