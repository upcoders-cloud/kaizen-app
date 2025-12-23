import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/comments');

const commentsService = {
	update(commentId, payload) {
		const options = withAuthHeaders();
		return httpClient.put(`${basePath}${commentId}/`, payload, options);
	},

	remove(commentId) {
		const options = withAuthHeaders();
		return httpClient.delete(`${basePath}${commentId}/`, options);
	},
};

export default commentsService;
