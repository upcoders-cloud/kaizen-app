import { create } from 'zustand'

export const useAuthStore = create((set) => ({
	isAuthenticated: false,
	setIsAuthenticated: () => set((isAuthenticated) => ({ isAuthenticated })),

	login: () => set(() => ({ isAuthenticated: true })),
	logout: () => set(() => ({ isAuthenticated: false })),
}))