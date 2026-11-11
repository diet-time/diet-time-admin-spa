import { packageRequestsApi, type PackageRequest } from '@/api/packageRequestsApi';
import { renderWithToasts as render } from '@/test/renderWithToasts';
import '@/i18n';
vi.mock('@/api/packageRequestsApi', () => ({ packageRequestsApi: { list: vi.fn().mockResolvedValue({items:[],totalCount:0}), review: vi.fn() } }));
import { MemoryRouter } from 'react-router-dom';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { fireEvent,screen,waitFor,within } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { staffOrdersApi,type StaffOrder } from '@/api/staffOrdersApi';
import { OrdersPage } from './OrdersPage';
vi.mock('@/api/staffOrdersApi',async(importOriginal)=>{const actual=await importOriginal<typeof import('@/api/staffOrdersApi')>();return {...actual,staffOrdersApi:{list:vi.fn(),get:vi.fn(),action:vi.fn()}};});
vi.mock('@/auth/screenPermissionCache',()=>({canWriteFromPath:vi.fn(()=>true)}));
const row:StaffOrder={order:{id:'order-1',orderNumber:'ORD-1',status:'PENDING_APPROVAL',paymentStatus:'PENDING',placedAt:'2026-10-30T12:00:00Z',plan:{name:'Complete Balance',durationName:'6 Days'},mealCount:2,snackCount:1,fulfillmentMethod:'TAKEAWAY',takeawayBranch:{name:'Diet Time – Azizia Branch'},delivery:{startDate:'2026-11-01',endDate:'2026-11-07',days:[1,2,3,4,6,7],serviceDates:['2026-11-01','2026-11-02']},pricing:{currencyCode:'QAR',totalAmount:699},review:{rowVersion:5,requiresPrepayment:false,awaitingPayment:false,canFulfill:false}},customerName:'Customer',customerPhone:'+97455555555',history:[]};
const renderPage=(initialEntry='/orders',daily=false)=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter initialEntries={[initialEntry]}><OrdersPage daily={daily}/></MemoryRouter></QueryClientProvider>);
beforeEach(()=>{vi.clearAllMocks();vi.mocked(packageRequestsApi.list).mockResolvedValue({items:[],totalCount:0});vi.mocked(canWriteFromPath).mockReturnValue(true);vi.mocked(staffOrdersApi.list).mockResolvedValue({items:[row],totalCount:1});vi.mocked(staffOrdersApi.get).mockResolvedValue(row);vi.mocked(staffOrdersApi.action).mockResolvedValue({...row,order:{...row.order,status:'CONFIRMED',review:{...row.order.review,rowVersion:6,canFulfill:true}}});});
afterEach(()=>vi.useRealTimers());
describe('Daily orders by meal service date',()=>{
 it('limits the approval dropdown to approval states',async()=>{
  renderPage('/orders/daily',true);
  fireEvent.mouseDown(screen.getByRole('combobox',{name:'Approval status'}));
  expect(screen.getAllByRole('option').map(option=>option.textContent)).toEqual(['Pending Confirmation','Confirmed','On Hold','Rejected','Cancelled','All approval statuses']);
  expect(screen.queryByRole('option',{name:'Active'})).not.toBeInTheDocument();
  expect(screen.queryByRole('option',{name:'Completed'})).not.toBeInTheDocument();
  expect(screen.queryByRole('option',{name:'Delivered'})).not.toBeInTheDocument();
 });
 it.each([['PENDING','PENDING_APPROVAL','Pending Confirmation'],['ACTIVE','CONFIRMED','Confirmed'],['COMPLETED','CONFIRMED','Confirmed']])('maps a legacy %s filter into its approval group',async(legacy,status,label)=>{
  renderPage(`/orders/daily?serviceDate=2026-11-01&status=${legacy}`,true);
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith(status,1,'2026-11-01'));
  expect(screen.getByRole('combobox',{name:'Approval status'})).toHaveTextContent(label);
 });
 it('includes all statuses for the selected service day and allows explicit approval',async()=>{
  renderPage('/orders/daily?serviceDate=2026-11-01',true);
  expect(await screen.findByRole('button',{name:'Review / Approve'})).toBeInTheDocument();
  expect(staffOrdersApi.list).toHaveBeenCalledWith('',1,'2026-11-01');
  expect(screen.getByLabelText('Meal service date')).toHaveValue('2026-11-01');
  fireEvent.click(screen.getByRole('button',{name:'Review / Approve'}));
  fireEvent.click(await screen.findByRole('button',{name:'Approve'}));
  expect(staffOrdersApi.action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','approve',{expectedRowVersion:5,reason:''}));
 });
 it('changes the server-side service date and can show pending orders across all days',async()=>{
  renderPage('/orders/daily?serviceDate=2026-11-01',true);
  await screen.findByRole('button',{name:'Review / Approve'});
  fireEvent.change(screen.getByLabelText('Meal service date'),{target:{value:'2026-11-02'}});
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith('',1,'2026-11-02'));
  fireEvent.click(screen.getByRole('button',{name:'All dates'}));
  fireEvent.mouseDown(screen.getByRole('combobox',{name:'Approval status'}));
  fireEvent.click(screen.getByRole('option',{name:'Pending Confirmation'}));
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith('PENDING_APPROVAL',1,undefined));
  expect(screen.getByLabelText('Meal service date')).toHaveValue('');
  expect(screen.getByRole('heading',{name:'All service dates'})).toBeInTheDocument();
 });
 it('keeps the selected date and approval scope visible in the shared workspace',async()=>{
  renderPage('/orders/daily?serviceDate=2026-11-01&status=CONFIRMED',true);
  expect(await screen.findByRole('heading',{name:'1 Nov 2026'})).toBeInTheDocument();
  expect(screen.getByText('Confirmed · Qatar time')).toBeInTheDocument();
  expect(screen.getByRole('tab',{name:'All orders'})).toBeInTheDocument();expect(screen.queryByRole('link',{name:'Order Approvals'})).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation',{name:'pagination navigation'})).not.toBeInTheDocument();
  expect(await screen.findByText('Pending payment')).toBeInTheDocument();
 });
 it('resets the daily filters to today and all approval statuses',async()=>{
  renderPage('/orders/daily?serviceDate=2026-11-01&status=CONFIRMED',true);
  await screen.findByText('Pending payment');
  fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenLastCalledWith('',1,expect.any(String)));
  expect(screen.getByRole('button',{name:'Today in Qatar'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('combobox',{name:'Approval status'})).toHaveTextContent('All approval statuses');
 });
 it('defaults to today in Qatar rather than the browser time zone',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-30T22:00:00Z'));
  renderPage('/orders/daily',true);
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith('',1,'2026-10-31'));
 });
});

describe('Staff order review',()=>{
 it('uses one Orders workspace with an attention queue',async()=>{
  renderPage('/orders');
  expect(screen.queryByRole('link',{name:'Back to Orders'})).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Orders'})).toBeInTheDocument();
  expect(screen.getByRole('tab',{name:/Needs attention/})).toHaveAttribute('aria-selected','true');
 });
 it.each(['PENDING_APPROVAL','PENDING','CONFIRMED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','REJECTED'])('offers only pending approval decisions for %s',async(status)=>{
  const value={...row,order:{...row.order,status}};
  vi.mocked(staffOrdersApi.list).mockResolvedValue({items:[value],totalCount:1});
  vi.mocked(staffOrdersApi.get).mockResolvedValue(value);
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));
  const dialog=await screen.findByRole('dialog',{name:/Order details/});
  const pending=['PENDING_APPROVAL','PENDING'].includes(status);
  expect(within(dialog).queryByRole('button',{name:'Approve'})!==null).toBe(pending);
  expect(within(dialog).queryByRole('button',{name:'Reject'})!==null).toBe(pending);
  expect(within(dialog).queryByRole('button',{name:'Record Payment Status'})!==null).toBe(status!=='CANCELLED');
  for(const name of ['Mark Completed','Activate','Mark as Active','Put On Hold','Resume Review','Revise Dates'])expect(within(dialog).queryByRole('button',{name})).not.toBeInTheDocument();
  expect(within(dialog).queryByRole('button',{name:'Cancel Order'})!==null).toBe(status==='CONFIRMED');
  expect(staffOrdersApi.action).not.toHaveBeenCalled();
 });
 it('accepts an optional reason and requires explicit confirmation to cancel a confirmed order',async()=>{
  const confirmed={...row,order:{...row.order,status:'CONFIRMED',paymentStatus:'PAID'}};
  vi.mocked(staffOrdersApi.list).mockResolvedValue({items:[confirmed],totalCount:1});
  vi.mocked(staffOrdersApi.get).mockResolvedValue(confirmed);
  vi.mocked(staffOrdersApi.action).mockResolvedValue({...confirmed,order:{...confirmed.order,status:'CANCELLED',paymentStatus:'REFUND_PENDING'}});
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));
  fireEvent.click(await screen.findByRole('button',{name:'Cancel Order'}));
  expect(staffOrdersApi.action).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Confirm'})).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Notes (optional)'),{target:{value:'Customer requested cancellation'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','cancel',{expectedRowVersion:5,reason:'Customer requested cancellation'}));
  expect(await screen.findByText('Order updated.')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Cancel Order'})).not.toBeInTheDocument();
 });
 it('hides confirmed cancellation for read-only staff',async()=>{
  vi.mocked(canWriteFromPath).mockReturnValue(false);
  const confirmed={...row,order:{...row.order,status:'CONFIRMED'}};
  vi.mocked(staffOrdersApi.list).mockResolvedValue({items:[confirmed],totalCount:1});
  vi.mocked(staffOrdersApi.get).mockResolvedValue(confirmed);
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));
  await screen.findByRole('dialog',{name:/Order details/});
  expect(screen.queryByRole('button',{name:'Cancel Order'})).not.toBeInTheDocument();
 });
 it('records received payment with a receipt reference without approving a pending order',async()=>{
  vi.mocked(staffOrdersApi.action).mockResolvedValue({...row,order:{...row.order,paymentStatus:'PAID',review:{...row.order.review,rowVersion:6}}});
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));
  fireEvent.click(await screen.findByRole('button',{name:'Record Payment Status'}));
  expect(screen.getByRole('button',{name:'Confirm'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason / payment reference (required)'),{target:{value:'Cash receipt 123'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','payment',{expectedRowVersion:5,reason:'Cash receipt 123',paymentStatus:'PAID'}));
  expect(await screen.findByText('Payment: Paid')).toBeInTheDocument();expect(within(await screen.findByRole('dialog',{name:/Order details/})).getByText('Pending Confirmation')).toBeInTheDocument();
  expect(staffOrdersApi.action).toHaveBeenCalledTimes(1);
 });

 it('opens the selected dashboard order directly without approving it',async()=>{
  renderPage('/orders?orderId=order-1');
  expect(await screen.findByRole('button',{name:'Approve'})).toBeInTheDocument();
  expect(staffOrdersApi.get).toHaveBeenCalledWith('order-1');
  expect(staffOrdersApi.action).not.toHaveBeenCalled();
 });
 it('shows an error when a directly linked order cannot be loaded',async()=>{
  vi.mocked(staffOrdersApi.get).mockRejectedValue(new Error('Order could not be loaded'));
  renderPage('/orders?orderId=missing');
  expect(await screen.findByText('Order could not be loaded')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Approve'})).not.toBeInTheDocument();
 });

 it('explains why a read-only account cannot confirm orders',async()=>{
  vi.mocked(canWriteFromPath).mockReturnValue(false);renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));
  expect(await screen.findByText(/You have read-only access to Orders/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Approve'})).not.toBeInTheDocument();
  expect(staffOrdersApi.action).not.toHaveBeenCalled();
 });

 it('requires an explicit approval confirmation and sends the current version',async()=>{
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));fireEvent.click(await screen.findByRole('button',{name:'Approve'}));expect(staffOrdersApi.action).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','approve',{expectedRowVersion:5,reason:''}));expect(await screen.findByText('Order updated.')).toBeInTheDocument();expect(screen.getByText('Payment: Pending')).toBeInTheDocument();expect(screen.getByText('Confirmed',{selector:'.MuiChip-label'})).toBeInTheDocument();
 });
 it('requires a rejection reason and shows selected branch details',async()=>{
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));expect(await screen.findByText('Diet Time – Azizia Branch',{selector:'p'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Reject'}));expect(screen.getByRole('button',{name:'Confirm'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Reason / payment reference (required)'),{target:{value:'Cannot supply the requested package'}});fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','reject',{expectedRowVersion:5,reason:'Cannot supply the requested package'}));
 });
 it('shows a concurrency error without repeating the decision',async()=>{
  vi.mocked(staffOrdersApi.action).mockRejectedValue({response:{data:{detail:'This order changed. Refresh before another action.'}}});renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));fireEvent.click(await screen.findByRole('button',{name:'Approve'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));expect(await screen.findByText('This order changed. Refresh before another action.')).toBeInTheDocument();expect(staffOrdersApi.action).toHaveBeenCalledTimes(1);
 });
});

const pauseRequest:PackageRequest={orderId:'order-1',orderNumber:'ORD-1',planName:'Complete Balance',customerName:'Customer',request:{id:'pause-1',type:'PAUSE',status:'PENDING_APPROVAL',pauseStartDate:'2026-12-01',resumeDate:'2026-12-05',projectedEndDate:'2026-12-20',reason:'Travel',createdAt:'2026-11-10T10:00:00Z'}};
describe('Unified order requests',()=>{
 it('shows pause requests and bookings in the same grid across all service dates',async()=>{
  vi.mocked(packageRequestsApi.list).mockResolvedValue({items:[pauseRequest],totalCount:1});renderPage('/orders?serviceDate=2026-11-01');
  const grid=screen.getByRole('region',{name:'Filtered customer orders'});
  expect(await within(grid).findByRole('button',{name:'Review pause'})).toBeInTheDocument();
  expect(within(grid).getByRole('button',{name:'Review'})).toBeInTheDocument();
  expect(screen.getByRole('tab',{name:'Needs attention 2'})).toHaveAttribute('aria-selected','true');
  expect(screen.queryByLabelText('Meal service date')).not.toBeInTheDocument();
  expect(staffOrdersApi.list).toHaveBeenCalledWith('PENDING_APPROVAL',1,undefined);
  fireEvent.click(screen.getByRole('button',{name:'Review pause'}));
  expect(screen.getByRole('dialog',{name:'Review pause request'})).toBeInTheDocument();
  expect(screen.getByText('Travel')).toBeInTheDocument();expect(packageRequestsApi.review).not.toHaveBeenCalled();
 });
 it('filters the same grid to pause requests without showing booking rows',async()=>{
  vi.mocked(packageRequestsApi.list).mockResolvedValue({items:[pauseRequest],totalCount:1});renderPage();
  await screen.findByRole('button',{name:'Review pause'});
  fireEvent.mouseDown(screen.getByRole('combobox',{name:'Request type'}));fireEvent.click(screen.getByRole('option',{name:'Pause requests'}));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Review'})).not.toBeInTheDocument());
  expect(await screen.findByRole('button',{name:'Review pause'})).toBeInTheDocument();
 });
 it('opens the pending pause from its order badge while retaining filters',async()=>{
  vi.mocked(packageRequestsApi.list).mockResolvedValue({items:[pauseRequest],totalCount:1});renderPage('/orders?view=all&status=CONFIRMED&serviceDate=2026-11-01');
  fireEvent.click(await screen.findByRole('button',{name:'Pause requested'}));
  fireEvent.click(screen.getByRole('button',{name:'Close request details'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Meal service date')).toHaveValue('2026-11-01');
  expect(screen.getByRole('combobox',{name:'Approval status'})).toHaveTextContent('Confirmed');
 });
 it('loads paused packages using their lifecycle status',async()=>{
  renderPage();fireEvent.click(screen.getByRole('tab',{name:'Paused'}));
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith('PAUSED',1,undefined));
  expect(screen.getByRole('heading',{name:'Paused packages'})).toBeInTheDocument();
 });
 it('shows a request API error without hiding available bookings',async()=>{
  vi.mocked(packageRequestsApi.list).mockRejectedValue(new Error('Unavailable'));renderPage();
  expect(await screen.findByText(/Pause and resume requests could not be loaded/)).toBeInTheDocument();
  expect(await screen.findByRole('button',{name:'Review'})).toBeInTheDocument();
  expect(screen.queryByRole('tab',{name:'Needs attention 1'})).not.toBeInTheDocument();
 });
});
