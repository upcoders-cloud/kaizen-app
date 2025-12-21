import {create} from 'zustand';
import authService from 'server/services/authService';
import {LOGIN_FAILED, REFRESH_FAILED} from "constants/constans";
import {getItem, removeItem, setItem} from "store/storage";

const MMKV_AUTH_KEY = 'AUTH_DATA';

export const useAuthStore = create((set, get) => ({
	isAuthenticated: false,
	accessToken: null,
	refreshToken: null,
	user: null,
	accessTokenExpiration: null,
	error: null,

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
				accessTokenExpiration: Date.now() + (60 * 60 * 1000), // 1 hour
			};

			// save in MMKV
			setItem(MMKV_AUTH_KEY, authData);

			// save in Zustand
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
		removeItem(MMKV_AUTH_KEY);
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

	refreshAccessToken: async () => {
		try {
			const { refreshToken } = get();
			const response = await authService.refresh(
				{ refreshToken },
				{ withCredentials: true }
			);

			const updatedAuthData = {
				...get(),
				accessToken: response?.accessToken,
				refreshToken: response?.refreshToken,
				accessTokenExpiration: Date.now() + (60 * 60 * 1000), // 1 hour
			}

			set(updatedAuthData);
			setItem(MMKV_AUTH_KEY, updatedAuthData);

			return true;
		}
		catch (error) {
			const message = error?.message || REFRESH_FAILED;
			console.error(message);
			get().logout();
			return false;
		}
	},

	checkAuth: async () => {
		const authData = getItem(MMKV_AUTH_KEY);
		if (!authData) return false;

		const { accessToken, accessTokenExpiration, refreshToken } = authData;

		if (accessToken && accessTokenExpiration && accessTokenExpiration > Date.now()) {
			set(authData);
			return true;
		}

		if (refreshToken) {
			set(authData);
			return await get().refreshAccessToken();
		}

		return false;
	}
}))
