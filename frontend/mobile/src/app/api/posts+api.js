import postsController from 'src/server/postsController';
import {
	FAILED_TO_FETCH_POSTS,
	FAILED_TO_CREATE_POSTS,
	CONTENT_TYPE, APPLICATION_JSON
} from 'src/constants/constans';

export async function GET() {
	try {
		const posts = await postsController.fetchPosts();
		return Response.json(posts);
	} catch (error) {
		return new Response(
			JSON.stringify({message: error.message || FAILED_TO_FETCH_POSTS}),
			{status: 500, headers: {CONTENT_TYPE: APPLICATION_JSON}},
		);
	}
}

export async function POST(request) {
	try {
		const body = await request.json();
		const created = await postsController.createPost(body);
		return Response.json(created, {status: 201});
	} catch (error) {
		return new Response(
			JSON.stringify({message: error.message || FAILED_TO_CREATE_POSTS}),
			{status: 500, headers: {CONTENT_TYPE: APPLICATION_JSON}},
		);
	}
}
