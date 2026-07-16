import { BlockOutlined, ErrorOutline, SearchOffOutlined } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { Link, useRouteError } from 'react-router-dom';
function Page({code,title,description,icon}:{code:string;title:string;description:string;icon:React.ReactNode}){return <Box minHeight="60vh" display="grid" sx={{placeItems:'center',textAlign:'center'}}><Box>{icon}<Typography color="primary" fontWeight={800}>{code}</Typography><Typography variant="h1">{title}</Typography><Typography color="text.secondary" mt={1} mb={3}>{description}</Typography><Button component={Link} to="/" variant="contained">Back to dashboard</Button></Box></Box>}
export function NotFoundPage(){return <Page code="404" title="Page not found" description="The page may have moved or you may not have access." icon={<SearchOffOutlined sx={{fontSize:58}}/>}/>}
export function ForbiddenPage(){return <Page code="403" title="Access denied" description="Your role does not permit this action. Contact an administrator if this seems wrong." icon={<BlockOutlined sx={{fontSize:58}}/>}/>}
export function AppErrorPage(){const error=useRouteError();console.error(error);return <Page code="ERROR" title="Something went wrong" description="The application could not complete this request. Try again from the dashboard." icon={<ErrorOutline sx={{fontSize:58}}/>}/>}
