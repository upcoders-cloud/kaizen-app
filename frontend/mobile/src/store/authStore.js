import {create} from 'zustand';
import authService from 'server/services/authService';
import {LOGIN_FAILED} from "constants/constans";


export const useAuthStore = create((set) => ({
	isAuthenticated: false,
	accessToken: null,
	refreshToken: null,
	user: null,
	accessTokenExpiration: null,
	error: null,
	// setIsAuthenticated: () => set((isAuthenticated) => ({ isAuthenticated })),

	// login: () => set(() => ({ isAuthenticated: true })),
	// logout: () => set(() => ({ isAuthenticated: false })),

	login: async (username, password) => {
		try {
			const response = await authService.login(
				{username, password, expiresInMins: 30},
				{withCredentials: true}
			);

			const authData = {
				isAuthenticated: true,
				accessToken: response?.accessToken || response?.token || null,
				refreshToken: response?.refreshToken || null,
				user: response || null,
				error: null,
			};
			set(authData);

			return {success: true, data: response};
		} catch (error) {
			const message = error?.message || LOGIN_FAILED;
			set(() => ({
				isAuthenticated: false,
				accessToken: null,
				refreshToken: null,
				user: null,
				error: message,
			}));
			return {success: false, error: message};
		}
	},

	logout: () => {
		set(() => ({
			isAuthenticated: false,
			accessToken: null,
			refreshToken: null,
			user: null,
			accessTokenExpiration: null,
			error: null,
		}));
		return {success: true};
	},
}))
