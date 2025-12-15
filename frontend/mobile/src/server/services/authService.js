import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
const basePath = 'https://dummyjson.com/auth';

const authService = {
	login(body, options) {
		return httpClient.post(`${basePath}/login`, body, options);
	},
	// register(body, options) {
	// 	return httpClient.post(ensureTrailingSlash(`${basePath}/register`), body, options);
	// },
	// logout(options) {
	// 	return httpClient.post(ensureTrailingSlash(`${basePath}/logout`), undefined, options);
	// },
	// refresh(body, options) {
	// 	return httpClient.post(ensureTrailingSlash(`${basePath}/refresh`), body, options);
	// },
	// me(options) {
	// 	return httpClient.get(ensureTrailingSlash(`${basePath}/me`), options);
	// },
};

export default authService;
