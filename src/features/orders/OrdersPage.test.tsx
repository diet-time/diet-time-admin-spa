import { MemoryRouter } from 'react-router-dom';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { staffOrdersApi,type StaffOrder } from '@/api/staffOrdersApi';
import { OrdersPage } from './OrdersPage';
vi.mock('@/api/staffOrdersApi',async(importOriginal)=>{const actual=await importOriginal<typeof import('@/api/staffOrdersApi')>();return {...actual,staffOrdersApi:{list:vi.fn(),get:vi.fn(),action:vi.fn()}};});
vi.mock('@/auth/screenPermissionCache',()=>({canWriteFromPath:vi.fn(()=>true)}));
const row:StaffOrder={order:{id:'order-1',orderNumber:'ORD-1',status:'PENDING_APPROVAL',paymentStatus:'PENDING',placedAt:'2026-10-30T12:00:00Z',plan:{name:'Complete Balance',durationName:'6 Days'},mealCount:2,snackCount:1,fulfillmentMethod:'TAKEAWAY',takeawayBranch:{name:'Diet Time – Azizia Branch'},delivery:{startDate:'2026-11-01',endDate:'2026-11-07',days:[1,2,3,4,6,7],serviceDates:['2026-11-01','2026-11-02']},pricing:{currencyCode:'QAR',totalAmount:699},review:{rowVersion:5,requiresPrepayment:false,awaitingPayment:false,canFulfill:false}},customerName:'Customer',customerPhone:'+97455555555',history:[]};
const renderPage=(initialEntry='/orders',daily=false)=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter initialEntries={[initialEntry]}><OrdersPage daily={daily}/></MemoryRouter></QueryClientProvider>);
beforeEach(()=>{vi.clearAllMocks();vi.mocked(canWriteFromPath).mockReturnValue(true);vi.mocked(staffOrdersApi.list).mockResolvedValue({items:[row],totalCount:1});vi.mocked(staffOrdersApi.get).mockResolvedValue(row);vi.mocked(staffOrdersApi.action).mockResolvedValue({...row,order:{...row.order,status:'CONFIRMED',review:{...row.order.review,rowVersion:6,canFulfill:true}}});});
afterEach(()=>vi.useRealTimers());
describe('Daily orders by meal service date',()=>{
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
  fireEvent.click(screen.getByRole('button',{name:'All pending approvals'}));
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith('PENDING_APPROVAL',1,undefined));
  expect(screen.getByLabelText('Meal service date')).toHaveValue('');
  expect(screen.getByText('Showing orders across all meal service dates.')).toBeInTheDocument();
 });
 it('defaults to today in Qatar rather than the browser time zone',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-30T22:00:00Z'));
  renderPage('/orders/daily',true);
  await waitFor(()=>expect(staffOrdersApi.list).toHaveBeenCalledWith('',1,'2026-10-31'));
 });
});

describe('Staff order review',()=>{
 it('records received payment with a receipt reference without approving a pending order',async()=>{
  vi.mocked(staffOrdersApi.action).mockResolvedValue({...row,order:{...row.order,paymentStatus:'PAID',review:{...row.order.review,rowVersion:6}}});
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));
  fireEvent.click(await screen.findByRole('button',{name:'Record Payment Status'}));
  expect(screen.getByRole('button',{name:'Confirm'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason / payment reference (required)'),{target:{value:'Cash receipt 123'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm'}));
  await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','payment',{expectedRowVersion:5,reason:'Cash receipt 123',paymentStatus:'PAID'}));
  expect(await screen.findByText('Pending Approval · Payment: PAID')).toBeInTheDocument();
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
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));fireEvent.click(await screen.findByRole('button',{name:'Approve'}));expect(staffOrdersApi.action).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','approve',{expectedRowVersion:5,reason:''}));expect(await screen.findByText('Order updated.')).toBeInTheDocument();expect(screen.getByText('Confirmed · Payment: PENDING')).toBeInTheDocument();
 });
 it('requires a rejection reason and shows selected branch details',async()=>{
  renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));expect(await screen.findByText('Takeaway · Diet Time – Azizia Branch',{selector:'p'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Reject'}));expect(screen.getByRole('button',{name:'Confirm'})).toBeDisabled();fireEvent.change(screen.getByLabelText('Reason / payment reference (required)'),{target:{value:'Cannot supply the requested package'}});fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(staffOrdersApi.action).toHaveBeenCalledWith('order-1','reject',{expectedRowVersion:5,reason:'Cannot supply the requested package'}));
 });
 it('shows a concurrency error without repeating the decision',async()=>{
  vi.mocked(staffOrdersApi.action).mockRejectedValue({response:{data:{detail:'This order changed. Refresh before another action.'}}});renderPage();fireEvent.click(await screen.findByRole('button',{name:'Review'}));fireEvent.click(await screen.findByRole('button',{name:'Approve'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));expect(await screen.findByText('This order changed. Refresh before another action.')).toBeInTheDocument();expect(staffOrdersApi.action).toHaveBeenCalledTimes(1);
 });
});
