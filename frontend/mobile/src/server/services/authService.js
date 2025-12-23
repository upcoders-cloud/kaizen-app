import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
const basePath = '/api/access';

const authService = {
	login(body, options) {
		return httpClient.post(ensureTrailingSlash(`${basePath}/token`), body, options);
	},
	refresh(body, options) {
		return httpClient.post(ensureTrailingSlash(`${basePath}/token/refresh`), body, options);
	}
};

export default authService;
