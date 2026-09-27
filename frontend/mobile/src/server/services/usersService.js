import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/users');

const usersService = {
	listManagers(params) {
		const options = withAuthHeaders({params});
		return httpClient.get(`${basePath}managers/`, options);
	},
	listApprovers(params) {
		return httpClient.get(`${basePath}approvers/`, withAuthHeaders({params}));
	},
	me() {
		const options = withAuthHeaders();
		return httpClient.get(`${basePath}me/`, options);
	},
	get(userId) {
		return httpClient.get(`${basePath}${userId}/`, withAuthHeaders());
	},
	updateMe(payload) {
		const options = withAuthHeaders();
		return httpClient.patch(`${basePath}me/`, payload, options);
	},
};

export default usersService;
