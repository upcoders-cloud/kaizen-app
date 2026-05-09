/**
 * Buduje strukturę wątkową z płaskiej listy komentarzy.
 *
 * Zwraca: `[{root, replies: [{...comment, replyToNickname}]}]`,
 * posortowane top-level po `created_at` (najnowsze na górze),
 * a replies wewnątrz każdej grupy chronologicznie (rosnąco — naturalna dyskusja).
 *
 * "Po facebookowemu": wszystkie odpowiedzi (każdej głębokości) renderują się
 * na jednym poziomie wcięcia pod top-level, z opcjonalnym tagiem "↳ @nickname"
 * pokazującym do kogo użytkownik się odnosi.
 */
export const buildCommentTree = (comments = []) => {
	if (!Array.isArray(comments) || !comments.length) return [];

	const byId = new Map();
	comments.forEach((comment) => {
		if (comment?.id != null) {
			byId.set(String(comment.id), comment);
		}
	});

	const childrenByParent = new Map();
	const roots = [];

	comments.forEach((comment) => {
		const parentId = comment?.parent;
		if (parentId == null || !byId.has(String(parentId))) {
			roots.push(comment);
			return;
		}
		const key = String(parentId);
		if (!childrenByParent.has(key)) childrenByParent.set(key, []);
		childrenByParent.get(key).push(comment);
	});

	const collectDescendants = (rootId) => {
		const out = [];
		const stack = [rootId];
		const visited = new Set();
		while (stack.length) {
			const currentId = stack.shift();
			const children = (childrenByParent.get(String(currentId)) || []).slice().sort(
				(a, b) => new Date(a?.created_at) - new Date(b?.created_at)
			);
			children.forEach((child) => {
				if (visited.has(String(child.id))) return;
				visited.add(String(child.id));
				const parentComment = byId.get(String(child.parent));
				out.push({
					...child,
					replyToNickname: parentComment?.author?.nickname || null,
				});
				stack.push(child.id);
			});
		}
		return out;
	};

	const sortedRoots = roots.slice().sort(
		(a, b) => new Date(b?.created_at) - new Date(a?.created_at)
	);

	return sortedRoots.map((root) => ({
		root,
		replies: collectDescendants(root.id),
	}));
};

export const flattenTree = (tree) => {
	const out = [];
	tree.forEach(({root, replies}) => {
		out.push(root);
		replies.forEach((reply) => out.push(reply));
	});
	return out;
};
