import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { packageRequestsApi, type PackageRequest } from '@/api/packageRequestsApi';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { PackageChangeRequests } from './PackageChangeRequests';
vi.mock('@/api/packageRequestsApi',()=>({packageRequestsApi:{list:vi.fn(),review:vi.fn()}}));
vi.mock('@/auth/screenPermissionCache',()=>({canWriteFromPath:vi.fn()}));
const row:PackageRequest={orderId:'order',orderNumber:'ORD-100',planName:'Balance',customerName:'Customer',request:{id:'request',type:'PAUSE',status:'PENDING_APPROVAL',pauseStartDate:'2026-11-04',resumeDate:'2026-12-01',projectedEndDate:'2026-12-10',reason:'Travel',createdAt:'2026-11-03T10:00:00Z'}};
let cache:QueryClient;
function mount(){cache=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});return render(<QueryClientProvider client={cache}><PackageChangeRequests/></QueryClientProvider>);}
beforeEach(()=>{vi.mocked(canWriteFromPath).mockReturnValue(true);vi.mocked(packageRequestsApi.list).mockResolvedValue({items:[row],totalCount:1});vi.mocked(packageRequestsApi.review).mockResolvedValue({status:'APPROVED'});});
afterEach(()=>{cache?.clear();vi.clearAllMocks();});
describe('Package request review',()=>{
 for(const type of ['PAUSE','RESUME'] as const)it('requires explicit staff acceptance for '+type,async()=>{
  vi.mocked(packageRequestsApi.list).mockResolvedValue({items:[{...row,request:{...row.request,type}}],totalCount:1});mount();
  fireEvent.click(await screen.findByRole('button',{name:'Accept request'}));
  expect(packageRequestsApi.review).not.toHaveBeenCalled();
  const dialog=within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Review notes (optional)'),{target:{value:'Checked schedule'}});
  fireEvent.click(dialog.getByRole('button',{name:'Accept request'}));
  await waitFor(()=>expect(packageRequestsApi.review).toHaveBeenCalledWith('request',true,'Checked schedule'));
 });
 it('requires a reason to decline without submitting acceptance',async()=>{
  mount();fireEvent.click(await screen.findByRole('button',{name:'Decline request'}));const dialog=within(screen.getByRole('dialog'));
  expect(dialog.getByRole('button',{name:'Decline request'})).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Reason (required)'),{target:{value:'Choose later dates'}});
  fireEvent.click(dialog.getByRole('button',{name:'Decline request'}));
  await waitFor(()=>expect(packageRequestsApi.review).toHaveBeenCalledWith('request',false,'Choose later dates'));
 });
 it('keeps a failed acceptance visible and reports stale schedule errors',async()=>{
  vi.mocked(packageRequestsApi.review).mockRejectedValue({response:{data:{detail:'Delivery preparation changed'}}});mount();
  fireEvent.click(await screen.findByRole('button',{name:'Accept request'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Accept request'}));
  expect(await screen.findByText(/Delivery preparation changed/)).toBeInTheDocument();expect(screen.getByRole('dialog')).toBeInTheDocument();
 });
 it('preserves read-only Orders access',async()=>{
  vi.mocked(canWriteFromPath).mockReturnValue(false);mount();
  expect(await screen.findByText(/Orders write permission is required/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Accept request'})).not.toBeInTheDocument();expect(packageRequestsApi.review).not.toHaveBeenCalled();
 });
});
