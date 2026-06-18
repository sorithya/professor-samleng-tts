'use client';

import { create } from 'zustand';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isReady: boolean;
}

export interface PlayerActions {
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsReady: (isReady: boolean) => void;
  reset: () => void;
}

const DEFAULT_STATE: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isReady: false,
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  ...DEFAULT_STATE,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setIsReady: (isReady) => set({ isReady }),
  reset: () => set(DEFAULT_STATE),
}));
