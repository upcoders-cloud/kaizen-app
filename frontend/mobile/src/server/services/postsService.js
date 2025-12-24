import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/posts');

const postsService = {
	list(params) {
		return httpClient.get(basePath, {params});
	},
	get(id, params) {
		return httpClient.get(`${basePath}${id}/`, {params});
	},
	create(payload) {
		const options = withAuthHeaders();
		return httpClient.post(basePath, payload, options);
	},
	update(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.patch(`${basePath}${postId}/`, payload, options);
	},
	remove(postId) {
		const options = withAuthHeaders();
		return httpClient.delete(`${basePath}${postId}/`, options);
	},
	fetchComments(postId, params) {
		return httpClient.get(`${basePath}${postId}/comments/`, {params});
	},
	addComment(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/comments/`, payload, options);
	},
	toggleLike(postId) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/like/`, undefined, options);
	},
	createSurvey(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/survey/`, payload, options);
	},
	updateSurvey(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.put(`${basePath}${postId}/survey/`, payload, options);
	},
};

export default postsService;
