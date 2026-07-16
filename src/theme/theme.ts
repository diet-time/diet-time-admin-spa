import { createTheme, type Direction } from '@mui/material/styles';

export const colors = { emerald: '#00674E', lime: '#CEF17B', marshmallow: '#EEECE0', teaGreen: '#B1D8B9', mocca: '#A87A58', orange: '#FE5A35', jasper: '#E5304B', dark: '#17352D' } as const;

export const createDietTimeTheme = (direction: Direction) => createTheme({
  direction,
  palette: { mode: 'light', primary: { main: colors.emerald, contrastText: '#fff' }, secondary: { main: colors.lime, contrastText: colors.dark }, error: { main: colors.jasper }, warning: { main: colors.orange }, background: { default: '#F7F6F1', paper: '#fff' }, text: { primary: colors.dark, secondary: '#5E6E69' }, divider: '#E3E8E5' },
  typography: { fontFamily: direction === 'rtl' ? 'Almarai, Manrope, sans-serif' : 'Manrope, sans-serif', h1: { fontSize: '2rem', fontWeight: 750 }, h2: { fontSize: '1.5rem', fontWeight: 750 }, h3: { fontSize: '1.15rem', fontWeight: 700 }, button: { textTransform: 'none', fontWeight: 700 } },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { minWidth: 320 }, '*:focus-visible': { outline: `3px solid ${colors.lime}`, outlineOffset: 2 }, '@media (prefers-reduced-motion: reduce)': { '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' } } } },
    MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 10 } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #E3E8E5', boxShadow: '0 6px 24px rgba(23,53,45,.06)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
});
