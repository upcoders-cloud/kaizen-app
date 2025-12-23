import {create} from 'zustand';
import authService from 'server/services/authService';
import {LOGIN_FAILED, REFRESH_FAILED} from "constants/constans";
import {getItem, removeItem, setItem} from "store/storage";
import {getAccessTokenExpiration} from "utils/jwt";

const MMKV_AUTH_KEY = 'AUTH_DATA';

export const useAuthStore = create((set, get) => ({
	isAuthenticated: false,
	accessToken: null,
	accessTokenExpiration: null,
	error: null,

	login: async (username, password) => {
		try {
			const response = await authService.login(
				{username, password},
				{withCredentials: true}
			);

			const accessToken = response?.access || null;
			if (!accessToken) {
				const message = LOGIN_FAILED;
				set(() => ({
					isAuthenticated: false,
					accessToken: null,
					accessTokenExpiration: null,
					error: message,
				}));
				return {success: false, error: message};
			}
			const authData = {
				isAuthenticated: true,
				accessToken,
				error: null,
				accessTokenExpiration: getAccessTokenExpiration(accessToken, {skewMs: 60 * 1000}),
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
				accessTokenExpiration: null,
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
			accessTokenExpiration: null,
			error: null,
		}));
		return {success: true};
	},

	refreshAccessToken: async () => {
		try {
			console.log('[auth] Refreshing access token...');
			const response = await authService.refresh(undefined, {withCredentials: true});
			const accessToken = response?.access || null;
			if (!accessToken) {
				console.error('[auth] Refresh failed: empty access token.');
				get().logout();
				return false;
			}

			const updatedAuthData = {
				isAuthenticated: true,
				accessToken,
				accessTokenExpiration: getAccessTokenExpiration(accessToken, {skewMs: 60 * 1000}),
				error: null,
			};

			set(updatedAuthData);
			setItem(MMKV_AUTH_KEY, updatedAuthData);

			console.log('[auth] Access token refreshed.');
			return true;
		} catch (error) {
			const message = error?.message || REFRESH_FAILED;
			const status = error?.status;
			if (error?.isNetworkError) {
				console.error('[auth] Refresh failed (network):', message);
				set((state) => ({...state, error: message}));
				return false;
			}
			if (status >= 400 && status < 500) {
				console.error('[auth] Refresh failed (auth):', message);
				get().logout();
				return false;
			}
			console.error('[auth] Refresh failed:', message);
			set((state) => ({...state, error: message}));
			return false;
		}
	},

	checkAuth: async () => {
		const authData = getItem(MMKV_AUTH_KEY);
		if (!authData) return false;

		const { accessToken, accessTokenExpiration } = authData;
		const resolvedExpiration =
			accessTokenExpiration ??
			getAccessTokenExpiration(accessToken, {skewMs: 60 * 1000});

		if (accessToken && resolvedExpiration && resolvedExpiration > Date.now()) {
			console.log('[auth] Access token still valid.');
			const updatedAuthData = accessTokenExpiration === resolvedExpiration
				? authData
				: {...authData, accessTokenExpiration: resolvedExpiration};
			set(updatedAuthData);
			if (updatedAuthData !== authData) {
				setItem(MMKV_AUTH_KEY, updatedAuthData);
			}
			return true;
		}

		console.log('[auth] Access token expired or missing, trying refresh.');
		set(authData);
		return await get().refreshAccessToken();
	}
}))
