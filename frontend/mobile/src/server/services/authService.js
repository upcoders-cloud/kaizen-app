import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
const basePath = '/auth';

const authService = {
	login(credentials) {
		return httpClient.post(ensureTrailingSlash(`${basePath}/login`), credentials);
	},
	register(payload) {
		return httpClient.post(ensureTrailingSlash(`${basePath}/register`), payload);
	},
	logout() {
		return httpClient.post(ensureTrailingSlash(`${basePath}/logout`));
	},
	refresh(payload) {
		return httpClient.post(ensureTrailingSlash(`${basePath}/refresh`), payload);
	},
	me() {
		return httpClient.get(ensureTrailingSlash(`${basePath}/me`));
	},
};

export default authService;
