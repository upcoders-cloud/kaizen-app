import httpClient from './httpClient';

const POSTS_PATH = '/api/posts/';

const postsController = {
	async fetchPosts() {
		console.log('postsController')
		return httpClient.get(POSTS_PATH);
	},

	async createPost(post) {
		return httpClient.post(POSTS_PATH, post);
	},
};

export default postsController;
