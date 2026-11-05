import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Pagination, Stack, TextField, Typography } from '@mui/material';
import { packageRequestsApi, type PackageRequest } from '@/api/packageRequestsApi';
import { canWriteFromPath } from '@/auth/screenPermissionCache';
import { formatOrderDate } from './orderPresentation';

const errorText=(e:unknown)=>{const v=e as {response?:{data?:{detail?:string}};message?:string};return v.response?.data?.detail??v.message??'Unable to review the request.';};
export function PackageChangeRequests() {
 const [page,setPage]=useState(1),[selected,setSelected]=useState<PackageRequest|null>(null),[approve,setApprove]=useState(true),[reason,setReason]=useState('');
 const cache=useQueryClient();
 const query=useQuery({queryKey:['packageRequests',page],queryFn:()=>packageRequestsApi.list(page),refetchInterval:30000});
 const mutation=useMutation({mutationFn:()=>packageRequestsApi.review(selected!.request.id,approve,reason),onSuccess:async()=>{
  setSelected(null);await Promise.all([cache.invalidateQueries({queryKey:['packageRequests']}),cache.invalidateQueries({queryKey:['staffOrders']}),cache.invalidateQueries({queryKey:['dashboard','operations']})]);
 }});
 if(query.isError)return <Alert severity="error">Package requests could not be loaded. <Button onClick={()=>query.refetch()}>Retry package requests</Button></Alert>;
 if(!query.data?.totalCount)return null;
 const choose=(value:PackageRequest,accept:boolean)=>{setSelected(value);setApprove(accept);setReason('');mutation.reset();};
 return <Card component="section" aria-label="Pending package requests" variant="outlined"><CardContent>
  <Stack spacing={2}><Stack direction="row" gap={1} alignItems="center"><Typography variant="h3">Pending package requests</Typography><Chip color="warning" size="small" label={query.data.totalCount}/></Stack>
   <Typography variant="body2" color="text.secondary">All pause and resume requests awaiting confirmation. Existing package status and deliveries remain in effect until accepted.</Typography>
   {query.data.items.map(value=><Stack key={value.request.id} spacing={1} sx={{borderTop:'1px solid',borderColor:'divider',pt:1.5}}>
    <Typography fontWeight={700}>{value.request.type==='PAUSE'?'Pause request':'Resume request'} · {value.orderNumber} · {value.customerName}</Typography>
    <Typography variant="body2">{value.planName}</Typography>
    <Typography variant="body2">{value.request.pauseStartDate && <>Requested pause: {formatOrderDate(value.request.pauseStartDate)} · </>}Requested restart: {formatOrderDate(value.request.resumeDate)}</Typography>
    <Typography variant="body2">Proposed end date (on acceptance): {formatOrderDate(value.request.projectedEndDate)}</Typography>
    {value.request.reason&&<Typography variant="body2">Customer reason: {value.request.reason}</Typography>}
    <Typography variant="caption" color="text.secondary">Submitted: {formatOrderDate(value.request.createdAt,true)}</Typography>
    {canWriteFromPath('/orders')?<Stack direction="row" gap={1}><Button variant="contained" onClick={()=>choose(value,true)}>Accept request</Button><Button color="error" onClick={()=>choose(value,false)}>Decline request</Button></Stack>
      :<Typography variant="caption">Orders write permission is required to review this request.</Typography>}
   </Stack>)}
   {query.data.totalCount>20&&<Pagination count={Math.ceil(query.data.totalCount/20)} page={page} onChange={(_,value)=>setPage(value)}/>}
  </Stack>
  <Dialog open={selected!==null} onClose={()=>{if(!mutation.isPending)setSelected(null);}} maxWidth="sm" fullWidth>
   <DialogTitle>{approve?'Accept':'Decline'} {selected?.request.type==='PAUSE'?'pause':'resume'} request</DialogTitle>
   <DialogContent><Stack spacing={2} mt={1}>
    <Alert severity="info">{approve?'Acceptance rechecks the delivery cutoff and committed deliveries before changing the schedule. Stale requests cannot be applied.':'Declining leaves the existing package schedule unchanged.'}</Alert>
    <TextField label={approve?'Review notes (optional)':'Reason (required)'} value={reason} onChange={e=>setReason(e.target.value)} multiline minRows={2} slotProps={{htmlInput:{maxLength:500}}}/>
    {mutation.isError&&<Alert severity="error">{errorText(mutation.error)} If dates are no longer eligible, decline this request and ask the customer to submit current dates.</Alert>}
   </Stack></DialogContent>
   <DialogActions><Button disabled={mutation.isPending} onClick={()=>setSelected(null)}>Back</Button><Button variant="contained" disabled={mutation.isPending||(!approve&&!reason.trim())} onClick={()=>mutation.mutate()}>{mutation.isPending?'Saving…':approve?'Accept request':'Decline request'}</Button></DialogActions>
  </Dialog>
 </CardContent></Card>;
}
