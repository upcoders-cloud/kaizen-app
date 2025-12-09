import httpClient from 'src/server/httpClient';
import {SLASH} from "constants/constans";

const ensureTrailingSlash = (path) => (path.endsWith(SLASH) ? path : `${path}/`);

export const createResourceService = (resourcePath) => {
	const basePath = ensureTrailingSlash(resourcePath);

	return {
		list(params) {
			return httpClient.get(basePath, {params});
		},
		get(id, params) {
			return httpClient.get(`${basePath}${id}/`, {params});
		},
		create(payload) {
			return httpClient.post(basePath, payload);
		},
		update(id, payload) {
			return httpClient.put(`${basePath}${id}/`, payload);
		},
		patch(id, payload) {
			return httpClient.patch(`${basePath}${id}/`, payload);
		},
		remove(id) {
			return httpClient.delete(`${basePath}${id}/`);
		},
	};
};
