import {createResourceService} from './resourceService';
import httpClient from 'src/server/httpClient';

const basePath = '/api/posts';
const resource = createResourceService(basePath);

const postsService = {
	...resource,
	fetchComments(postId, params) {
		return httpClient.get(`${basePath}/${postId}/comments/`, {params});
	},
	addComment(postId, payload) {
		return httpClient.post(`${basePath}/${postId}/comments/`, payload);
	},
	toggleLike(postId) {
		return httpClient.post(`${basePath}/${postId}/like/`);
	},
};

export default postsService;
