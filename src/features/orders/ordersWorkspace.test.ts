import { beforeEach, describe, expect, it, vi } from 'vitest';
import { staffOrdersApi, type StaffOrder } from '@/api/staffOrdersApi';
import { packageRequestsApi, type PackageRequest } from '@/api/packageRequestsApi';
import { listPendingRequests, listWorkspaceOrders } from './ordersWorkspace';
vi.mock('@/api/staffOrdersApi',()=>({staffOrdersApi:{list:vi.fn()}}));
vi.mock('@/api/packageRequestsApi',()=>({packageRequestsApi:{list:vi.fn()}}));
const orders=Array.from({length:45},(_,index)=>({order:{id:String(index)}} as StaffOrder));
beforeEach(()=>{
 vi.clearAllMocks();
 vi.mocked(staffOrdersApi.list).mockImplementation(async(_status,page)=>({items:orders.slice((page-1)*20,page*20),totalCount:orders.length}));
});
describe('Shared attention pagination',()=>{
 it.each([0,1,19,20,21,45])('does not skip or duplicate bookings with %s leading requests',async(requestCount)=>{
  const result:StaffOrder[]=[];
  for(let page=1;page<=Math.ceil((requestCount+orders.length)/20);page++){
   const value=await listWorkspaceOrders('PENDING_APPROVAL',page,requestCount);
   expect(value.totalCount).toBe(45);
   expect(value.items.length+Math.min(20,Math.max(0,requestCount-(page-1)*20))).toBeLessThanOrEqual(20);
   result.push(...value.items);
  }
  expect(result.map(value=>value.order.id)).toEqual(orders.map(value=>value.order.id));
 });
 it('keeps ordinary order pagination and service-date filtering on the server',async()=>{
  const result=await listWorkspaceOrders('CONFIRMED',2,0,'2026-11-11');
  expect(staffOrdersApi.list).toHaveBeenCalledExactlyOnceWith('CONFIRMED',2,'2026-11-11');
  expect(result.items).toEqual(orders.slice(20,40));
 });
 it('loads request pages beyond the first twenty for badges and counts',async()=>{
  const requests=Array.from({length:41},(_,index)=>({request:{id:String(index)}} as PackageRequest));
  vi.mocked(packageRequestsApi.list).mockImplementation(async(page)=>({items:requests.slice((page-1)*20,page*20),totalCount:41}));
  expect(await listPendingRequests()).toEqual(requests);
  expect(packageRequestsApi.list).toHaveBeenCalledTimes(3);
 });
});
