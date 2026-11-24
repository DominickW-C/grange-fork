import { create } from "zustand";

interface GreenhouseStoreState {
	greenhouseOpen: boolean;
	setGreenhouseOpen: (open: boolean) => void;
}

export const useGreenhouseStore = create<GreenhouseStoreState>((set) => ({
	greenhouseOpen: false,
	setGreenhouseOpen: (open) => set({ greenhouseOpen: open }),
}));
