import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { packageRequestsApi, type PackageRequest } from '@/api/packageRequestsApi';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { PackageRequestReview } from './PackageChangeRequests';
vi.mock('@/api/packageRequestsApi',()=>({packageRequestsApi:{review:vi.fn()}}));
vi.mock('@/auth/screenPermissionCache',()=>({canWriteFromPath:vi.fn()}));
const row:PackageRequest={orderId:'order',orderNumber:'ORD-100',planName:'Balance',customerName:'Customer',request:{id:'request',type:'PAUSE',status:'PENDING_APPROVAL',pauseStartDate:'2026-11-04',resumeDate:'2026-12-01',projectedEndDate:'2026-12-10',reason:'Travel',createdAt:'2026-11-03T10:00:00Z'}};
let cache:QueryClient;
const onClose=vi.fn();
function mount(value=row){cache=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});return render(<QueryClientProvider client={cache}><PackageRequestReview value={value} onClose={onClose}/></QueryClientProvider>);}
beforeEach(()=>{vi.mocked(canWriteFromPath).mockReturnValue(true);vi.mocked(packageRequestsApi.review).mockResolvedValue({status:'APPROVED'});});
afterEach(()=>{cache?.clear();vi.clearAllMocks();});
describe('Package request drawer',()=>{
 for(const type of ['PAUSE','RESUME'] as const)it('requires explicit staff confirmation for '+type,async()=>{
  mount({...row,request:{...row.request,type}});
  expect(screen.getByText('Travel')).toBeInTheDocument();
  expect(screen.getByText('Proposed package end: 10 Dec 2026')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:type==='PAUSE'?'Approve pause':'Approve resume'}));
  expect(packageRequestsApi.review).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Review notes (optional)'),{target:{value:'Checked schedule'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));
  await waitFor(()=>expect(packageRequestsApi.review).toHaveBeenCalledWith('request',true,'Checked schedule'));
  await waitFor(()=>expect(onClose).toHaveBeenCalled());
 });
 it('requires a reason to reject without submitting acceptance',async()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'Reject'}));
  expect(screen.getByRole('button',{name:'Confirm rejection'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason (required)'),{target:{value:'Choose later dates'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm rejection'}));
  await waitFor(()=>expect(packageRequestsApi.review).toHaveBeenCalledWith('request',false,'Choose later dates'));
 });
 it('keeps a failed approval visible and reports stale schedule errors',async()=>{
  vi.mocked(packageRequestsApi.review).mockRejectedValue({response:{data:{detail:'Delivery preparation changed'}}});mount();
  fireEvent.click(screen.getByRole('button',{name:'Approve pause'}));fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));
  expect(await screen.findByText(/Delivery preparation changed/)).toBeInTheDocument();expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
 });
 it('preserves read-only Orders access',async()=>{
  vi.mocked(canWriteFromPath).mockReturnValue(false);mount();
  expect(screen.getByText(/Orders write permission is required/)).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).queryByRole('button',{name:'Approve pause'})).not.toBeInTheDocument();expect(packageRequestsApi.review).not.toHaveBeenCalled();
 });
 it('refreshes orders, pending requests, and dashboard counts after a decision',async()=>{
  mount();const invalidate=vi.spyOn(cache,'invalidateQueries');
  fireEvent.click(screen.getByRole('button',{name:'Approve pause'}));fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));
  await waitFor(()=>expect(invalidate).toHaveBeenCalledWith({queryKey:['packageRequests']}));
  expect(invalidate).toHaveBeenCalledWith({queryKey:['staffOrders']});expect(invalidate).toHaveBeenCalledWith({queryKey:['dashboard','operations']});
 });
});
