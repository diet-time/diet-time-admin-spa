import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { masterDataApi } from '@/api/masterDataApi';
import { queryClient } from '@/app/queryClient';
import { MasterDataPage } from './MasterDataPage';

vi.mock('@/api/masterDataApi', () => ({masterDataApi:{list:vi.fn(),create:vi.fn(),update:vi.fn()}}));
vi.mock('@/auth/ScreenAccess', () => ({WriteGuard:({children}:PropsWithChildren)=>children}));
beforeEach(()=>{
  vi.clearAllMocks(); queryClient.clear();
  queryClient.setDefaultOptions({queries:{retry:false},mutations:{retry:false}});
  vi.mocked(masterDataApi.list).mockResolvedValue({items:[],page:1,pageSize:25,totalCount:0,totalPages:0});
});
afterEach(()=>{cleanup();queryClient.clear();});
async function openAndFill() {
  render(<QueryClientProvider client={queryClient}><MasterDataPage resource="meal-types"/></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button',{name:'Add meal type'}));
  fireEvent.change(screen.getByLabelText(/^Code/),{target:{value:'MEAL5'}});
  fireEvent.change(screen.getByLabelText(/^English name/),{target:{value:'PM Meal'}});
  fireEvent.change(screen.getByLabelText(/^Arabic name/),{target:{value:'وجبة مسائية'}});
}
it('creates a meal type with both translations through the existing API adapter',async()=>{
  vi.mocked(masterDataApi.create).mockResolvedValue({data:{id:'new-type'}});
  await openAndFill();
  expect(screen.getByLabelText(/^English name/)).toHaveAttribute('maxlength','100');
  fireEvent.click(screen.getByRole('button',{name:'Save'}));
  await waitFor(()=>expect(masterDataApi.create).toHaveBeenCalledWith('meal-types',expect.objectContaining({code:'MEAL5',nameEn:'PM Meal',nameAr:'وجبة مسائية',isActive:true})));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
it('shows the actual duplicate-code response and retains entered names',async()=>{
  vi.mocked(masterDataApi.create).mockRejectedValue({isAxiosError:true,response:{status:409,data:{errors:[{code:'duplicate_code',message:'A meal type with this code already exists.',field:'code'}]}}});
  await openAndFill();fireEvent.click(screen.getByRole('button',{name:'Save'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('A meal type with this code already exists.');
  expect(screen.getByLabelText(/^English name/)).toHaveValue('PM Meal');
});
it('shows validation errors without guessing a duplicate',async()=>{
  vi.mocked(masterDataApi.create).mockRejectedValue({isAxiosError:true,response:{status:400,data:{errors:{NameEn:['English name must be at most 100 characters.']}}}});
  await openAndFill();fireEvent.click(screen.getByRole('button',{name:'Save'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('English name must be at most 100 characters.');
});
it('does not describe an unsupported endpoint or server failure as a duplicate code',async()=>{
  vi.mocked(masterDataApi.create).mockRejectedValue({isAxiosError:true,response:{status:405,data:{}}});
  await openAndFill();fireEvent.click(screen.getByRole('button',{name:'Save'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('The record could not be saved. Please try again.');
  expect(screen.getByRole('alert')).not.toHaveTextContent(/duplicate/i);
});
