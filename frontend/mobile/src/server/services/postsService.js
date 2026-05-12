import httpClient from 'src/server/httpClient';
import {ensureTrailingSlash} from 'utils/url';
import {withAuthHeaders} from 'utils/authHeaders';

const basePath = ensureTrailingSlash('/api/posts');

const postsService = {
	list(params) {
		const options = withAuthHeaders({params});
		return httpClient.get(basePath, options);
	},
	get(id, params) {
		const options = withAuthHeaders({params});
		return httpClient.get(`${basePath}${id}/`, options);
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
	toggleBookmark(postId) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/bookmark/`, undefined, options);
	},
	bookmarked(params) {
		const options = withAuthHeaders({params});
		return httpClient.get(`${basePath}bookmarked/`, options);
	},
	createSurvey(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/survey/`, payload, options);
	},
	updateSurvey(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.put(`${basePath}${postId}/survey/`, payload, options);
	},
	approve(postId) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/approve/`, undefined, options);
	},
	reject(postId, payload) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/reject/`, payload, options);
	},
	resubmit(postId) {
		const options = withAuthHeaders();
		return httpClient.post(`${basePath}${postId}/resubmit/`, undefined, options);
	},
	myCases(params) {
		const options = withAuthHeaders({params});
		return httpClient.get(`${basePath}my_cases/`, options);
	},
};

export default postsService;
