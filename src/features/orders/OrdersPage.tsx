import { PackageChangeRequests } from './PackageChangeRequests';
import CloseRounded from '@mui/icons-material/CloseRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { OrdersTable } from './OrdersTable';
import { IconButton } from '@mui/material';
import { OrderReviewDetails } from './OrderReviewDetails';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Alert,Button,Card,CardContent,Dialog,DialogTitle,DialogContent,DialogActions,Stack,TextField,MenuItem,Typography,Pagination } from '@mui/material';
import { staffOrdersApi,orderStatusLabel,approvalStatuses,approvalFilterStatus,type StaffOrder } from '@/api/staffOrdersApi';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
const statuses=approvalStatuses;
const errorText=(e:unknown)=>{const value=e as {response?:{data?:{detail?:string}};message?:string};return value.response?.data?.detail??value.message??'Unable to update the order.';};
const qatarToday=()=>{
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
};
export function OrdersPage({daily=false}:{daily?:boolean}){
 const [searchParams,setSearchParams]=useSearchParams();const reviewOrderId=searchParams.get('orderId');
 const cache=useQueryClient();const[status,setStatus]=useState(()=>approvalFilterStatus(searchParams.get('status')??(daily?'':'PENDING_APPROVAL')));const[serviceDate,setServiceDate]=useState(()=>daily?(searchParams.get('serviceDate')??qatarToday()):'');const[page,setPage]=useState(1);const[selected,setSelected]=useState<StaffOrder|null>(null);const[action,setAction]=useState('');const[reason,setReason]=useState('');const[payment,setPayment]=useState('PAID');const[notice,setNotice]=useState('');
 const query=useQuery({queryKey:daily?['staffOrders',status,page,serviceDate]:['staffOrders',status,page],queryFn:()=>daily?staffOrdersApi.list(status,page,serviceDate||undefined):staffOrdersApi.list(status,page),refetchInterval:30000});
 const mutation=useMutation({mutationFn:()=>staffOrdersApi.action(selected!.order.id,action,{expectedRowVersion:selected!.order.review.rowVersion,reason,...(action==='payment'?{paymentStatus:payment}:{})}),onSuccess:async(result)=>{setSelected(result);setAction('');setNotice('Order updated.');await Promise.all([cache.invalidateQueries({queryKey:['staffOrders']}),cache.invalidateQueries({queryKey:['dashboard','operations']})]);},onError:async()=>{await cache.invalidateQueries({queryKey:['staffOrders']});}});
 useEffect(()=>{
  if(!reviewOrderId)return;
  let current=true;setNotice('');setSelected(null);setAction('');
  staffOrdersApi.get(reviewOrderId).then(result=>{if(current)setSelected(result);}).catch(error=>{if(current)setNotice(errorText(error));});
  return()=>{current=false;};
 },[reviewOrderId]);
 const closeReview=()=>{setSelected(null);setSearchParams(previous=>{const next=new URLSearchParams(previous);next.delete('orderId');return next;},{replace:true});};
 const choose=(name:string)=>{if(name==='payment'&&selected?.order.status==='CANCELLED'||name==='cancel'&&selected?.order.status!=='CONFIRMED')return;mutation.reset();setAction(name);setReason('');};
 const needsReason=['reject','payment','cancel'].includes(action);
 const open=async(row:StaffOrder)=>{setSelected(row);setNotice('');try{setSelected(await staffOrdersApi.get(row.order.id));}catch(e){setNotice(errorText(e));}};
 return <Stack spacing={2}><Typography variant="h2">{daily?'Daily Orders':'Orders'}</Typography><Typography color="text.secondary">{daily?'Orders for the selected meal service date, including pending approval. Payment status is recorded separately.':'Review customer submissions before confirming fulfillment. Payment status is recorded separately.'}</Typography>{notice&&<Alert severity="info">{notice}</Alert>}
 <PackageChangeRequests/>
 <Card sx={{borderRadius:'12px',boxShadow:'none'}}><CardContent sx={{p:'20px !important'}}><Stack direction={{xs:'column',sm:'row'}} useFlexGap flexWrap="wrap" alignItems={{sm:'center'}} gap={1.5}>
 {daily&&<><TextField type="date" label="Meal service date" value={serviceDate} onChange={e=>{setServiceDate(e.target.value);setPage(1);}} slotProps={{inputLabel:{shrink:true}}}/><Button onClick={()=>{setServiceDate(qatarToday());setPage(1);}}>Today in Qatar</Button><Button onClick={()=>{setServiceDate('');setPage(1);}}>All dates</Button><Button variant="outlined" onClick={()=>{setServiceDate('');setStatus('PENDING_APPROVAL');setPage(1);}}>All pending approvals</Button></>}
 <TextField select label="Approval status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} sx={{minWidth:220}}>{statuses.map(s=><MenuItem key={s} value={s}>{s?orderStatusLabel(s):'All approval statuses'}</MenuItem>)}</TextField><Button startIcon={<RefreshRounded/>} disabled={query.isFetching} onClick={()=>query.refetch()} sx={{ml:{sm:'auto'}}}>Refresh</Button></Stack></CardContent></Card>
 {query.isError&&<Alert severity="error">{errorText(query.error)}</Alert>}{query.isLoading&&<Typography>Loading orders…</Typography>}
 {daily&&<Alert severity="info">{serviceDate?`Meal service date: ${serviceDate}. Pending orders are listed before service days are activated.`:'Showing orders across all meal service dates.'}</Alert>}
 <OrdersTable rows={query.data?.items ?? []} total={query.data?.totalCount ?? 0} loading={query.isPending} daily={daily} onReview={row=>void open(row)}/>
 <Pagination count={Math.max(1,Math.ceil((query.data?.totalCount??0)/20))} page={page} onChange={(_,v)=>setPage(v)}/>
 <Dialog open={!!selected&&!action} onClose={closeReview} maxWidth="md" fullWidth scroll="paper" aria-labelledby="order-review-title" slotProps={{paper:{sx:{borderRadius:3,m:{xs:1,sm:3},width:{xs:'calc(100% - 16px)',sm:'100%'},maxHeight:'calc(100% - 32px)'}}}}>
  <DialogTitle id="order-review-title" sx={{px:{xs:2,sm:3},py:2}}>
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
      <Stack><Typography component="span" variant="h6" fontWeight={750}>Order details</Typography><Typography component="span" variant="caption" color="text.secondary" sx={{overflowWrap:'anywhere'}}>{selected?.order.orderNumber}</Typography></Stack>
      <IconButton aria-label="Close order details" size="small" onClick={closeReview}><CloseRounded fontSize="small"/></IconButton>
    </Stack>
  </DialogTitle>
  <DialogContent dividers sx={{p:{xs:2,sm:3},bgcolor:'#fafbf8'}}>{selected&&<Stack spacing={2}>
    <OrderReviewDetails key={selected.order.id} value={selected}/>
    {!canWriteFromPath('/orders')&&<Alert severity="info">You have read-only access to Orders. An administrator with Orders write permission must approve or reject this order.</Alert>}
  </Stack>}</DialogContent>
  <DialogActions sx={{px:{xs:2,sm:3},py:2,gap:1,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
    {selected&&canWriteFromPath('/orders')&&['PENDING_APPROVAL','PENDING'].includes(selected.order.status)&&<Stack direction="row" gap={1}><Button variant="contained" onClick={()=>choose('approve')}>Approve</Button><Button color="error" variant="outlined" onClick={()=>choose('reject')}>Reject</Button></Stack>}
    {selected&&selected.order.status!=='CANCELLED'&&canWriteFromPath('/orders')&&<Button variant="outlined" onClick={()=>choose('payment')}>Record Payment Status</Button>}
    {selected?.order.status==='CONFIRMED'&&canWriteFromPath('/orders')&&<Button color="error" variant="outlined" onClick={()=>choose('cancel')}>Cancel Order</Button>}
    <Button onClick={closeReview} sx={{ml:'auto'}}>Close</Button>
  </DialogActions>
 </Dialog>
 <Dialog open={!!action} onClose={()=>!mutation.isPending&&setAction('')} maxWidth="sm" fullWidth><DialogTitle>Confirm {action.replaceAll('-',' ')}</DialogTitle><DialogContent><Stack spacing={2} mt={1}>{action==='approve'&&<Alert severity="info">Confirming this order authorizes it under the applicable payment policy. It does not mark the order as paid.</Alert>}{action==='cancel'&&<Alert severity="warning">Cancel this confirmed order? Paid orders will be marked as awaiting refund; this action does not refund funds. Deliveries already in preparation cannot be cancelled.</Alert>}{action==='payment'&&<><Alert severity="info">Record a verified manual payment or refund status. This action does not collect or refund funds.</Alert><TextField select label="Payment status" value={payment} onChange={e=>setPayment(e.target.value)}>{['UNPAID','PENDING','PAID','FAILED','REFUND_PENDING','REFUNDED'].map(p=><MenuItem key={p} value={p}>{p.replaceAll('_',' ')}</MenuItem>)}</TextField></>}<TextField label={needsReason?'Reason / payment reference (required)':'Notes (optional)'} multiline minRows={2} value={reason} onChange={e=>setReason(e.target.value)} slotProps={{htmlInput:{maxLength:500}}}/>{mutation.isError&&<Alert severity="error">{errorText(mutation.error)}<Button onClick={async()=>{if(selected){setSelected(await staffOrdersApi.get(selected.order.id));setAction('');}}}>Refresh order</Button></Alert>}</Stack></DialogContent><DialogActions><Button disabled={mutation.isPending} onClick={()=>setAction('')}>Back</Button><Button variant="contained" disabled={mutation.isPending||(needsReason&&!reason.trim())} onClick={()=>mutation.mutate()}>{mutation.isPending?'Saving…':'Confirm'}</Button></DialogActions></Dialog>
 </Stack>;
}
