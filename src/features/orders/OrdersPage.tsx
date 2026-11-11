import { toast } from '@/app/store/toastStore';
import { OrderWhatsAppHistory } from './OrderWhatsAppHistory';
import { PackageRequestReview } from './PackageChangeRequests';
import type { PackageRequest } from '@/api/packageRequestsApi';
import { listPendingRequests, listWorkspaceOrders } from './ordersWorkspace';
import CloseRounded from '@mui/icons-material/CloseRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { OrdersTable } from './OrdersTable';
import { IconButton, Tabs, Tab, Chip, Drawer } from '@mui/material';
import { OrderReviewDetails } from './OrderReviewDetails';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Alert,Box,Button,Dialog,DialogTitle,DialogContent,DialogActions,Stack,TextField,MenuItem,Typography } from '@mui/material';
import { staffOrdersApi,orderStatusLabel,approvalStatuses,approvalFilterStatus,type StaffOrder } from '@/api/staffOrdersApi';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { formatOrderDate } from './orderPresentation';
import { useTranslation } from 'react-i18next';
const statuses=approvalStatuses;
const errorText=(e:unknown)=>{const value=e as {response?:{data?:{detail?:string}};message?:string};return value.response?.data?.detail??value.message??'Unable to update the order.';};
const qatarToday=()=>{
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
};
export function OrdersPage({daily=false}:{daily?:boolean}){
 const { t } = useTranslation();
 const [searchParams,setSearchParams]=useSearchParams();const reviewOrderId=searchParams.get('orderId');
 const cache=useQueryClient();
 const view = searchParams.get('view') ?? (daily ? 'today' : searchParams.has('status') ? 'all' : 'attention');
 const attention = view === 'attention';
 const status = view === 'paused' ? 'PAUSED' : attention ? 'PENDING_APPROVAL' : approvalFilterStatus(searchParams.get('status') ?? '');
 const serviceDate = attention || view === 'paused' ? '' : (searchParams.get('serviceDate') ?? (view === 'today' ? qatarToday() : ''));
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<StaffOrder|null>(null);
 const [request,setRequest]=useState<PackageRequest|null>(null);
 const [action,setAction]=useState('');const[reason,setReason]=useState('');const[payment,setPayment]=useState('PAID');
 const requestType = attention ? searchParams.get('requestType') ?? '' : '';
 const updateFilters = (values: Record<string, string>) => {
  setPage(1);
  setSearchParams(previous => { const next = new URLSearchParams(previous); Object.entries(values).forEach(([key,value]) => { if(value) next.set(key,value); else next.delete(key); }); return next; });
 };
 const requests = useQuery({queryKey:['packageRequests','workspace'],queryFn:listPendingRequests,refetchInterval:30000});
 const pending = useQuery({queryKey:['staffOrders','PENDING_APPROVAL',1],queryFn:()=>staffOrdersApi.list('PENDING_APPROVAL',1),refetchInterval:30000});
 const pendingRequests = requests.data ?? [];
 const filteredRequests = pendingRequests.filter(value => !requestType || value.request.type === requestType);
 const requestCount = attention && requestType !== 'BOOKING' ? filteredRequests.length : 0;
 const onlyRequests = attention && ['PAUSE','RESUME'].includes(requestType);
 const query=useQuery({
  queryKey:['staffOrders','workspace',status,page,serviceDate,requestCount,onlyRequests],
  queryFn:()=>onlyRequests ? Promise.resolve({items:[],totalCount:0}) : listWorkspaceOrders(status,page,requestCount,serviceDate||undefined),
  enabled:!attention || !requests.isPending,refetchInterval:30000,
 });
 const total = (query.data?.totalCount ?? 0) + requestCount;
 const pageRequests = attention && requestType !== 'BOOKING' ? filteredRequests.slice((page-1)*20,page*20) : [];
 const maxPage = Math.max(1,Math.ceil(total/20));
 useEffect(()=>{if(!query.isPending && page>maxPage)setPage(maxPage);},[maxPage,page,query.isPending]);
 const refresh = () => { void query.refetch(); void requests.refetch(); void pending.refetch(); };
 const mutation=useMutation({mutationFn:()=>staffOrdersApi.action(selected!.order.id,action,{expectedRowVersion:selected!.order.review.rowVersion,reason,...(action==='payment'?{paymentStatus:payment}:{})}),onSuccess:async(result)=>{setSelected(result);setAction('');toast.success('Order updated.');await Promise.all([cache.invalidateQueries({queryKey:['staffOrders']}),cache.invalidateQueries({queryKey:['orderWhatsApp',selected?.order.id]}),cache.invalidateQueries({queryKey:['dashboard','operations']})]);},onError:async(error)=>{toast.error(errorText(error));await cache.invalidateQueries({queryKey:['staffOrders']});}});
 useEffect(()=>{
  if(!reviewOrderId)return;
  let current=true;setSelected(null);setAction('');
  staffOrdersApi.get(reviewOrderId).then(result=>{if(current)setSelected(result);}).catch(error=>{if(current)toast.error(errorText(error));});
  return()=>{current=false;};
 },[reviewOrderId]);
 const closeReview=()=>{setSelected(null);setSearchParams(previous=>{const next=new URLSearchParams(previous);next.delete('orderId');return next;},{replace:true});};
 const choose=(name:string)=>{if(name==='payment'&&selected?.order.status==='CANCELLED'||name==='cancel'&&selected?.order.status!=='CONFIRMED')return;mutation.reset();setAction(name);setReason('');};
 const needsReason=['reject','payment'].includes(action);
 const open=async(row:StaffOrder)=>{setSelected(row);try{setSelected(await staffOrdersApi.get(row.order.id));}catch(e){toast.error(errorText(e));}};
 const filters = <Stack direction={{xs:'column',sm:'row'}} useFlexGap flexWrap="wrap" alignItems={{sm:'center'}} gap={1.5}>
  {attention ? <TextField size="small" select label="Request type" value={requestType} slotProps={{select:{displayEmpty:true},inputLabel:{shrink:true}}}
    onChange={event=>updateFilters({requestType:event.target.value})} sx={{width:{xs:'100%',sm:220}}}>
    <MenuItem value="">All requests</MenuItem><MenuItem value="BOOKING">New bookings</MenuItem><MenuItem value="PAUSE">Pause requests</MenuItem><MenuItem value="RESUME">Resume requests</MenuItem>
  </TextField> : view !== 'paused' && <>
   <TextField size="small" type="date" label="Meal service date" value={serviceDate} onChange={event=>updateFilters({serviceDate:event.target.value})} slotProps={{inputLabel:{shrink:true}}} sx={{width:{xs:'100%',sm:180}}}/>
   <Button size="small" aria-label="Today in Qatar" aria-pressed={serviceDate===qatarToday()} onClick={()=>updateFilters({serviceDate:qatarToday()})}>Today</Button>
   <Button size="small" aria-pressed={!serviceDate} onClick={()=>updateFilters({view:'all',serviceDate:''})}>All dates</Button>
   <TextField size="small" select slotProps={{select:{displayEmpty:true},inputLabel:{shrink:true}}} label="Approval status" value={status} onChange={event=>updateFilters({status:event.target.value})} sx={{width:{xs:'100%',sm:210}}}>{statuses.map(value=><MenuItem key={value} value={value}>{value?orderStatusLabel(value):'All approval statuses'}</MenuItem>)}</TextField>
  </>}
  {(status && !attention && view !== 'paused' || requestType || serviceDate && serviceDate!==qatarToday())&&<Button size="small" onClick={()=>updateFilters({status:'',requestType:'',serviceDate:view==='today'?qatarToday():''})}>Reset filters</Button>}
  {attention && <Typography variant="caption" color="text.secondary">All service dates · Schedule changes take effect after approval</Typography>}
 </Stack>;
 return <Stack spacing={2.5}>
 <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{sm:'center'}} gap={1.5}>
  <Box><Typography component="h1" variant="h2" fontWeight={800}>{t('orders')}</Typography><Typography variant="body2" color="text.secondary" mt={0.5}>Manage bookings, pause requests, and daily service in one workspace.</Typography></Box>
  <Button startIcon={<RefreshRounded/>} disabled={query.isFetching||requests.isFetching||pending.isFetching} onClick={refresh} size="small" sx={{alignSelf:{xs:'flex-start',sm:'center'}}}>Refresh</Button>
 </Stack>
 <Tabs value={['attention','all','today','paused'].includes(view)?view:'all'} onChange={(_,value:string)=>updateFilters({view:value,status:'',serviceDate:'',requestType:''})} aria-label="Order views" variant="scrollable" scrollButtons="auto" sx={{borderBottom:1,borderColor:'divider'}}>
  <Tab value="attention" label={<Stack direction="row" gap={1} alignItems="center">Needs attention{pending.isSuccess&&requests.isSuccess&&<Chip size="small" color="warning" label={pending.data.totalCount+pendingRequests.length}/>}</Stack>}/>
  <Tab value="all" label="All orders"/><Tab value="today" label="Serving today"/><Tab value="paused" label="Paused"/>
 </Tabs>
 {query.isError&&<Alert severity="error">{errorText(query.error)} <Button onClick={()=>void query.refetch()}>Retry orders</Button></Alert>}
 {requests.isError&&<Alert severity="error">Pause and resume requests could not be loaded. <Button onClick={()=>void requests.refetch()}>Retry requests</Button></Alert>}
 {pending.isError&&<Alert severity="warning">The attention count is unavailable. <Button onClick={()=>void pending.refetch()}>Retry count</Button></Alert>}
 <OrdersTable rows={query.data?.items ?? []} requestRows={pageRequests} pendingRequests={pendingRequests} onRequestReview={setRequest}
  total={total} loading={query.isPending||(attention&&requests.isPending)} daily={view==='today'} onReview={row=>void open(row)}
  filters={filters} heading={attention?'Requests awaiting review':view==='paused'?'Paused packages':serviceDate?formatOrderDate(serviceDate):'All service dates'}
  subtitle={attention?'New bookings and package changes · Qatar time':`${status?orderStatusLabel(status):'All approval statuses'} · Qatar time`}
  page={page} onPageChange={setPage} attention={attention}/>
 {request&&<PackageRequestReview key={request.request.id} value={request} onClose={()=>setRequest(null)}/>}
 <Drawer anchor="right" open={!!selected&&!action} onClose={closeReview} slotProps={{paper:{role:"dialog","aria-modal":true,"aria-labelledby":"order-review-title",sx:{width:{xs:"100%",md:760},maxWidth:"100%",overflow:"hidden"}}}}>
  <DialogTitle id="order-review-title" sx={{px:{xs:2,sm:3},py:2}}>
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
      <Stack><Typography component="span" variant="h6" fontWeight={750}>Order details</Typography><Typography component="span" variant="caption" color="text.secondary" sx={{overflowWrap:'anywhere'}}>{selected?.order.orderNumber}</Typography></Stack>
      <IconButton aria-label="Close order details" size="small" onClick={closeReview}><CloseRounded fontSize="small"/></IconButton>
    </Stack>
  </DialogTitle>
  <DialogContent dividers sx={{p:{xs:2,sm:3},bgcolor:'#fafbf8'}}>{selected&&<Stack spacing={2}>
    <OrderReviewDetails key={selected.order.id} value={selected}/>
    <OrderWhatsAppHistory key={`whatsapp-${selected.order.id}`} orderId={selected.order.id}/>
    {!canWriteFromPath('/orders')&&<Alert severity="info">You have read-only access to Orders. An administrator with Orders write permission must approve or reject this order.</Alert>}
  </Stack>}</DialogContent>
  <DialogActions sx={{px:{xs:2,sm:3},py:2,gap:1,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
    {selected&&canWriteFromPath('/orders')&&['PENDING_APPROVAL','PENDING'].includes(selected.order.status)&&<Stack direction="row" gap={1}><Button variant="contained" onClick={()=>choose('approve')}>Approve</Button><Button color="error" variant="outlined" onClick={()=>choose('reject')}>Reject</Button></Stack>}
    {selected&&selected.order.status!=='CANCELLED'&&canWriteFromPath('/orders')&&<Button variant="outlined" onClick={()=>choose('payment')}>Record Payment Status</Button>}
    {selected?.order.status==='CONFIRMED'&&canWriteFromPath('/orders')&&<Button color="error" variant="outlined" onClick={()=>choose('cancel')}>Cancel Order</Button>}
    <Button onClick={closeReview} sx={{ml:'auto'}}>Close</Button>
  </DialogActions>
 </Drawer>
 <Dialog open={!!action} onClose={()=>!mutation.isPending&&setAction('')} maxWidth="sm" fullWidth><DialogTitle>Confirm {action.replaceAll('-',' ')}</DialogTitle><DialogContent><Stack spacing={2} mt={1}>{action==='approve'&&<Alert severity="info">Confirming this order authorizes it under the applicable payment policy. It does not mark the order as paid.</Alert>}{action==='cancel'&&<Alert severity="warning">Cancel this confirmed order? Paid orders will be marked as awaiting refund; this action does not refund funds. Deliveries already in preparation cannot be cancelled.</Alert>}{action==='payment'&&<><Alert severity="info">Record a verified manual payment or refund status. This action does not collect or refund funds.</Alert><TextField select label="Payment status" value={payment} onChange={e=>setPayment(e.target.value)}>{['UNPAID','PENDING','PAID','FAILED','REFUND_PENDING','REFUNDED'].map(p=><MenuItem key={p} value={p}>{p.replaceAll('_',' ')}</MenuItem>)}</TextField></>}<TextField label={needsReason?'Reason / payment reference (required)':'Notes (optional)'} multiline minRows={2} value={reason} onChange={e=>setReason(e.target.value)} slotProps={{htmlInput:{maxLength:500}}}/>{mutation.isError&&<Button onClick={async()=>{if(selected){setSelected(await staffOrdersApi.get(selected.order.id));setAction('');}}}>Refresh order</Button>}</Stack></DialogContent><DialogActions><Button disabled={mutation.isPending} onClick={()=>setAction('')}>Back</Button><Button variant="contained" disabled={mutation.isPending||(needsReason&&!reason.trim())} onClick={()=>mutation.mutate()}>{mutation.isPending?'Saving…':'Confirm'}</Button></DialogActions></Dialog>
 </Stack>;
}
