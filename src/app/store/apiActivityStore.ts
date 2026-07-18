import { create } from 'zustand';

interface ApiActivityState {
  activeRequests: number;
  requestStarted: () => void;
  requestFinished: () => void;
}

export const useApiActivityStore = create<ApiActivityState>((set) => ({
  activeRequests: 0,
  requestStarted: () => set((state) => ({ activeRequests: state.activeRequests + 1 })),
  requestFinished: () => set((state) => ({ activeRequests: Math.max(0, state.activeRequests - 1) })),
}));
