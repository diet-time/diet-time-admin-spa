import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { staffOrdersApi,type StaffOrder } from '@/api/staffOrdersApi';
import { OrdersPage } from './OrdersPage';
vi.mock('@/api/staffOrdersApi',async(importOriginal)=>{const actual=await importOriginal<typeof import('@/api/staffOrdersApi')>();return {...actual,staffOrdersApi:{list:vi.fn(),get:vi.fn(),action:vi.fn()}};});
vi.mock('@/auth/screenPermissionCache',()=>({canWriteFromPath:()=>true}));
const row:StaffOrder={order:{id:'order-1',orderNumber:'ORD-1',status:'PENDING_APPROVAL',paymentStatus:'PENDING',placedAt:'2026-10-30T12:00:00Z',plan:{name:'Complete Balance',durationName:'6 Days'},mealCount:2,snackCount:1,fulfillmentMethod:'TAKEAWAY',takeawayBranch:{name:'Diet Time – Azizia Branch'},delivery:{startDate:'2026-11-01',endDate:'2026-11-07',days:[1,2,3,4,6,7],serviceDates:['2026-11-01','2026-11-02']},pricing:{currencyCode:'QAR',totalAmount:699},review:{rowVersion:5,requiresPrepayment:false,awaitingPayment:false,canFulfill:false}},customerName:'Customer',customerPhone:'+97455555555',history:[]};
const renderPage=()=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><OrdersPage/></QueryClientProvider>);
beforeEach(()=>{vi.clearAllMocks();vi.mocked(staffOrdersApi.list).mockResolvedValue({items:[row],totalCount:1});vi.mocked(staffOrdersApi.get).mockResolvedValue(row);vi.mocked(staffOrdersApi.action).mockResolvedValue({...row,order:{...row.order,status:'CONFIRMED',review:{...row.order.review,rowVersion:6,canFulfill:true}}});});
describe('Staff order review',()=>{
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
