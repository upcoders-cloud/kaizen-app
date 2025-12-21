import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
const basePath = 'https://dummyjson.com/auth';

const authService = {
	login(body, options) {
		return httpClient.post(`${basePath}/login`, body, options);
	},
	refresh(body, options) {
		return httpClient.post(`${basePath}/refresh`, body, options);
	}
	// raczej nie potrzebujemy tego endpoint'a
	// me(options) {
	// 	return httpClient.get(ensureTrailingSlash(`${basePath}/me`), options);
	// },
};

export default authService;
