import { apiClient, adminApiUrl } from './apiClient';
export interface PackageRequest {
 orderId: string; orderNumber: string; planName: string; customerName: string;
 request: { id: string; type: 'PAUSE' | 'RESUME'; status: string; pauseStartDate?: string;
 resumeDate?: string; projectedEndDate?: string; reason?: string; createdAt: string; reviewReason?: string };
}
export const packageRequestsApi = {
 list: async (page: number) => (await apiClient.get<{items: PackageRequest[];totalCount:number}>(adminApiUrl('orders/package-requests'),
  {skipGlobalLoading:true,params:{pageNumber:page,pageSize:20}})).data,
 review: async (id: string, approve: boolean, reason: string) => (await apiClient.post(adminApiUrl('orders/package-requests/'+id+'/review'),
  {approve,reason:reason.trim()||null},{skipGlobalLoading:true})).data,
};
