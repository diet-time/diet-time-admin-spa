import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import { queryClient } from './queryClient';
import { ApiActivityLoader } from '@/components/feedback/ApiActivityLoader';
import { createDietTimeTheme } from '@/theme/theme';
export function AppProviders({children}:PropsWithChildren){const {i18n}=useTranslation();const rtl=i18n.language==='ar';const theme=useMemo(()=>createDietTimeTheme(rtl?'rtl':'ltr'),[rtl]);const cache=useMemo(()=>createCache({key:rtl?'mui-rtl':'mui',stylisPlugins:rtl?[prefixer,rtlPlugin]:[prefixer]}),[rtl]);document.documentElement.lang=rtl?'ar':'en';document.documentElement.dir=rtl?'rtl':'ltr';return <CacheProvider value={cache}><ThemeProvider theme={theme}><CssBaseline/><ApiActivityLoader/><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></ThemeProvider></CacheProvider>}
