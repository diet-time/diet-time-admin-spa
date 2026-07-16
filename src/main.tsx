import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/i18n';
import App from '@/app/App';
import { AppProviders } from '@/app/providers';
import { restoreSession } from '@/auth/session';
void restoreSession();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppProviders><App/></AppProviders></React.StrictMode>);
