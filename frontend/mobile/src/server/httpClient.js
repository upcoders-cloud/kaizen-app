import axios from 'axios';
import {API_BASE_URL} from 'src/constants/apiConfig';
import {
	APPLICATION_JSON,
	CONTENT_TYPE,
	DELETE,
	GET,
	PATCH,
	POST,
	PUT,
	REQUEST_FAILED_WITH_STATUS
} from 'src/constants/constans';
import {AUTH_BEARER_PREFIX, MMKV_AUTH_KEY} from 'src/constants/constans';
import {getItem, setItem, removeItem} from 'store/storage';
import {getAccessTokenExpiration} from 'utils/jwt';

class HttpClient {
	constructor(client) {
		this.client = client;
	}

	async request(path, options = {}) {
		const {method = GET, headers, body, params, ...rest} = options;
		try {
			const requestConfig = {
				url: path,
				method,
				headers,
				data: body,
				params,
				...rest,
			};
			const response = await this.client.request(requestConfig);
			return response.data;
		} catch (error) {
			const {response} = error || {};
			const message =
				response?.data?.detail ||
				response?.data?.message ||
				response?.statusText ||
				error?.message;
			const wrappedError = new Error(message || REQUEST_FAILED_WITH_STATUS);
			wrappedError.status = response?.status;
			wrappedError.data = response?.data;
			wrappedError.isNetworkError = !response;
			throw wrappedError;
		}
	}

	get(path, options) {
		return this.request(path, {...options, method: GET});
	}

	post(path, body, options) {
		return this.request(path, {...options, method: POST, body});
	}

	put(path, body, options) {
		return this.request(path, {...options, method: PUT, body});
	}

	patch(path, body, options) {
		return this.request(path, {...options, method: PATCH, body});
	}

	delete(path, options) {
		return this.request(path, {...options, method: DELETE});
	}
}

const axiosInstance = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		Accept: APPLICATION_JSON,
		[CONTENT_TYPE]: APPLICATION_JSON,
	},
});

const refreshClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		Accept: APPLICATION_JSON,
		[CONTENT_TYPE]: APPLICATION_JSON,
	},
});

let isRefreshing = false;
let refreshQueue = [];

const processRefreshQueue = (error, token = null) => {
	refreshQueue.forEach((promise) => {
		if (error) {
			promise.reject(error);
		} else {
			promise.resolve(token);
		}
	});
	refreshQueue = [];
};

axiosInstance.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error?.config;
		const status = error?.response?.status;
		const isRefreshRequest = originalRequest?.url?.includes('/api/access/token/refresh');

		if (status !== 401 || originalRequest?._retry || isRefreshRequest) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;
		const authData = getItem(MMKV_AUTH_KEY);
		if (!authData?.accessToken) {
			return Promise.reject(error);
		}

		if (isRefreshing) {
			return new Promise((resolve, reject) => {
				refreshQueue.push({resolve, reject});
			}).then((token) => {
				originalRequest.headers.Authorization = `${AUTH_BEARER_PREFIX} ${token}`;
				return axiosInstance.request(originalRequest);
			});
		}

		isRefreshing = true;
		try {
			const response = await refreshClient.post('/api/access/token/refresh/', undefined, {withCredentials: true});
			const accessToken = response?.data?.access;
			if (!accessToken) {
				throw new Error('Missing access token during refresh');
			}

			const updatedAuthData = {
				...authData,
				isAuthenticated: true,
				accessToken,
				accessTokenExpiration: getAccessTokenExpiration(accessToken, {skewMs: 60 * 1000}),
				error: null,
			};
			setItem(MMKV_AUTH_KEY, updatedAuthData);
			axiosInstance.defaults.headers.common.Authorization = `${AUTH_BEARER_PREFIX} ${accessToken}`;
			processRefreshQueue(null, accessToken);
			originalRequest.headers.Authorization = `${AUTH_BEARER_PREFIX} ${accessToken}`;
			return axiosInstance.request(originalRequest);
		} catch (refreshError) {
			removeItem(MMKV_AUTH_KEY);
			processRefreshQueue(refreshError, null);
			return Promise.reject(refreshError);
		} finally {
			isRefreshing = false;
		}
	}
);

const httpClient = new HttpClient(axiosInstance);

export default httpClient;
