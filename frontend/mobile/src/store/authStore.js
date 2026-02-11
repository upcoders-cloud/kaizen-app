import {create} from 'zustand';
import authService from 'server/services/authService';
import {LOGIN_FAILED, MMKV_AUTH_KEY, REFRESH_FAILED} from "constants/constans";
import {getItem, removeItem, setItem} from "store/storage";
import {getAccessTokenExpiration} from "utils/jwt";

const ACCESS_CODE_LOGIN_FAILED = 'Access code login failed';

const resolveUnauthenticatedState = (message = null) => ({
	isAuthenticated: false,
	accessToken: null,
	accessTokenExpiration: null,
	user: null,
	error: message,
});

const persistAuthSession = ({response, set}) => {
	const accessToken = response?.access || null;
	if (!accessToken) {
		return null;
	}

	const authData = {
		isAuthenticated: true,
		accessToken,
		accessTokenExpiration: getAccessTokenExpiration(accessToken, {skewMs: 60 * 1000}),
		user: response,
		error: null,
	};
	setItem(MMKV_AUTH_KEY, authData);
	set(authData);
	return authData;
};

const processLoginError = ({set, error, fallbackMessage}) => {
	const message = error?.message || fallbackMessage;
	set(() => resolveUnauthenticatedState(message));
	return {success: false, error: message};
};

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

			const authData = persistAuthSession({response, set});
			if (!authData) {
				return processLoginError({
					set,
					error: null,
					fallbackMessage: LOGIN_FAILED,
				});
			}

			return {success: true, data: response};
		} catch (error) {
			return processLoginError({
				set,
				error,
				fallbackMessage: LOGIN_FAILED,
			});
		}
	},

	loginWithAccessCode: async (code) => {
		try {
			const response = await authService.loginWithAccessCode(
				{code},
				{withCredentials: true}
			);

			const authData = persistAuthSession({response, set});
			if (!authData) {
				return processLoginError({
					set,
					error: null,
					fallbackMessage: ACCESS_CODE_LOGIN_FAILED,
				});
			}

			return {success: true, data: response};
		} catch (error) {
			return processLoginError({
				set,
				error,
				fallbackMessage: ACCESS_CODE_LOGIN_FAILED,
			});
		}
	},

	logout: () => {
		removeItem(MMKV_AUTH_KEY);
		set(() => resolveUnauthenticatedState(null));
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
