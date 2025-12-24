import {create} from 'zustand';
import authService from 'server/services/authService';
import {LOGIN_FAILED, MMKV_AUTH_KEY, REFRESH_FAILED} from "constants/constans";
import {getItem, removeItem, setItem} from "store/storage";
import {getAccessTokenExpiration} from "utils/jwt";

export const useAuthStore = create((set, get) => ({
	isAuthenticated: false,
	accessToken: null,
	accessTokenExpiration: null,
	user: null,
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
					user: null,
					error: message,
				}));
				return {success: false, error: message};
			}
			const authData = {
				isAuthenticated: true,
				accessToken,
				accessTokenExpiration: getAccessTokenExpiration(accessToken, {skewMs: 60 * 1000}),
				user: response,
				error: null,
			};
			console.log(
				'[auth] Login success, accessTokenExpiration:',
				authData.accessTokenExpiration
					? new Date(authData.accessTokenExpiration).toLocaleString('pl-PL', {
						timeZone: 'Europe/Warsaw',
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
						hour12: false,
					})
					: null
			);

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
			accessTokenExpiration: null,
			user: null,
			error: null,
		}));
		return {success: true};
	},

	refreshAccessToken: async () => {
		try {
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
				user: get().user ?? null,
				error: null,
			};
			console.log(
				'[auth] Refresh success, accessTokenExpiration:',
				updatedAuthData.accessTokenExpiration
					? new Date(updatedAuthData.accessTokenExpiration).toLocaleString('pl-PL', {
						timeZone: 'Europe/Warsaw',
						year: 'numeric',
						month: '2-digit',
						day: '2-digit',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
						hour12: false,
					})
					: null
			);

			set(updatedAuthData);
			setItem(MMKV_AUTH_KEY, updatedAuthData);

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

		console.log('[auth] checkAuth', {
			accessTokenExpiration: accessTokenExpiration
				? new Date(accessTokenExpiration).toLocaleString('pl-PL', {
					timeZone: 'Europe/Warsaw',
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false,
				})
				: null,
			resolvedExpiration: resolvedExpiration
				? new Date(resolvedExpiration).toLocaleString('pl-PL', {
					timeZone: 'Europe/Warsaw',
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false,
				})
				: null,
			now: new Date().toLocaleString('pl-PL', {
				timeZone: 'Europe/Warsaw',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false,
			}),
		});

		if (accessToken && resolvedExpiration && resolvedExpiration > Date.now()) {
			const updatedAuthData = accessTokenExpiration === resolvedExpiration
				? authData
				: {...authData, accessTokenExpiration: resolvedExpiration};
			set(updatedAuthData);
			if (updatedAuthData !== authData) {
				setItem(MMKV_AUTH_KEY, updatedAuthData);
			}
			return true;
		}

		set(authData);
		return await get().refreshAccessToken();
	}
}))
