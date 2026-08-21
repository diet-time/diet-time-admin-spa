import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

const titleCase = (value: string) => value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const isRecordId = (value: string) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);

const breadcrumbsForPath = (pathname: string): Crumb[] => {
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return [];

  if (parts[0] === 'admin') {
    const labels: Record<string, string> = {
      'package-options': 'Package Options',
      durations: 'Durations',
      'plan-pricing': 'Plan Pricing',
    };
    const label = labels[parts[1] ?? ''];
    return label ? [{ label: 'Meal Plans', to: '/meal-plans' }, { label }] : [{ label: 'Administration' }];
  }

  if (parts[0] === 'meal-plans') {
    const crumbs: Crumb[] = [{ label: 'Meal Plans', to: parts.length > 1 ? '/meal-plans' : undefined }];
    if (parts[1] === 'new') crumbs.push({ label: 'New Plan' });
    else if (parts[2] === 'edit') crumbs.push({ label: 'Edit Plan' });
    else if (parts[1] === 'pricing') crumbs.push({ label: 'Plan Pricing' });
    else if (parts[1]) crumbs.push({ label: 'Plan Details' });
    return crumbs;
  }

  if (parts[0] === 'meals') {
    const crumbs: Crumb[] = [{ label: 'Meals', to: parts.length > 1 ? '/meals' : undefined }];
    if (parts[1] === 'new') crumbs.push({ label: 'New Meal' });
    else if (parts[2] === 'edit') crumbs.push({ label: 'Edit Meal' });
    else if (parts[1]) crumbs.push({ label: 'Meal Details' });
    return crumbs;
  }

  return parts.map((part, index) => ({
    label: isRecordId(part) ? 'Details' : titleCase(part),
    to: index < parts.length - 1 ? `/${parts.slice(0, index + 1).join('/')}` : undefined,
  }));
};

export function Breadcrumbs() {
  const crumbs = breadcrumbsForPath(useLocation().pathname);
  return (
    <MuiBreadcrumbs
      aria-label="Breadcrumb"
      separator="›"
      maxItems={4}
      sx={{
        minWidth: 0,
        whiteSpace: 'nowrap',
        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
        '& .MuiBreadcrumbs-li': { minWidth: 0 },
        '& .MuiBreadcrumbs-separator': { mx: 0.75, color: 'text.disabled' },
        '& a, & p': { fontSize: '0.78rem', lineHeight: 1.35, whiteSpace: 'nowrap' },
      }}
    >
      <Link component={RouterLink} to="/" underline="hover" color="text.secondary">Home</Link>
      {crumbs.map((crumb, index) => crumb.to && index < crumbs.length - 1 ? (
        <Link key={`${crumb.to}-${crumb.label}`} component={RouterLink} to={crumb.to} underline="hover" color="text.secondary">{crumb.label}</Link>
      ) : (
        <Typography key={`${crumb.label}-${index}`} color="text.primary" noWrap>{crumb.label}</Typography>
      ))}
    </MuiBreadcrumbs>
  );
}
