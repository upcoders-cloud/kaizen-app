import {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import PostList from 'components/PostList/PostList';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import postsService from 'src/server/services/postsService';
import {useAuthStore} from 'store/authStore';
import {getJwtPayload} from 'utils/jwt';

const Bookmarks = () => {
	const router = useRouter();
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);

	const load = useCallback(async ({refresh = false} = {}) => {
		if (refresh) setRefreshing(true);
		else setLoading(true);
		setError(null);
		try {
			const data = await postsService.bookmarked();
			setPosts(Array.isArray(data) ? data : data?.results ?? []);
		} catch (err) {
			setError(err?.message || 'Nie udało się załadować zapisanych pomysłów');
		} finally {
			if (refresh) setRefreshing(false);
			else setLoading(false);
		}
	}, []);

	useFocusEffect(useCallback(() => { load(); }, [load]));

	const handleToggleBookmark = async (postId) => {
		if (!postId) return;
		// Optimistic: jeśli zdejmujemy bookmark, usuwamy z listy
		const target = posts.find((p) => String(p?.id) === String(postId));
		const wasBookmarked = Boolean(target?.is_bookmarked_by_me);
		let previousPosts = null;
		setPosts((prev) => {
			previousPosts = prev;
			if (wasBookmarked) {
				return prev.filter((p) => String(p?.id) !== String(postId));
			}
			return prev.map((p) =>
				String(p?.id) !== String(postId) ? p : {...p, is_bookmarked_by_me: true}
			);
		});
		try {
			await postsService.toggleBookmark(postId);
		} catch (err) {
			if (previousPosts) setPosts(previousPosts);
			Toast.show({
				type: 'error',
				text1: 'Nie udało się',
				text2: err?.message || 'Spróbuj ponownie',
				visibilityTime: 2000,
			});
		}
	};

	const handleToggleLike = async (postId) => {
		if (!postId) return;
		let previousPosts = null;
		setPosts((prev) => {
			previousPosts = prev;
			return prev.map((post) => {
				if (String(post?.id) !== String(postId)) return post;
				const currentLikes = post?.likes_count ?? 0;
				const nextLiked = !post?.is_liked_by_me;
				return {
					...post,
					is_liked_by_me: nextLiked,
					likes_count: Math.max(0, currentLikes + (nextLiked ? 1 : -1)),
				};
			});
		});
		try {
			const response = await postsService.toggleLike(postId);
			if (typeof response?.is_liked_by_me === 'boolean') {
				setPosts((prev) =>
					prev.map((post) =>
						String(post?.id) !== String(postId)
							? post
							: {...post, is_liked_by_me: response.is_liked_by_me, likes_count: response.likes_count}
					)
				);
			}
		} catch (err) {
			if (previousPosts) setPosts(previousPosts);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.header}>
				<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
					<Feather name="chevron-left" size={22} color={colors.text} />
				</Pressable>
				<Text style={styles.title}>Zapisane pomysły</Text>
				<View style={styles.headerSpacer} />
			</View>
			<PostList
				posts={posts}
				loading={loading}
				refreshing={refreshing}
				error={error}
				emptyText="Nie masz jeszcze zapisanych pomysłów. Stuknij ikonę zakładki na karcie posta."
				onRefresh={() => load({refresh: true})}
				onPressItem={(item) => router.push(`/post/${item.id}`)}
				onToggleLike={handleToggleLike}
				onToggleBookmark={handleToggleBookmark}
				onPressComment={(item) =>
					router.push({pathname: `/post/${item.id}`, params: {scrollTo: 'comments'}})
				}
				currentUserId={currentUserId}
			/>
		</SafeAreaView>
	);
};

export default Bookmarks;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	backButton: {
		padding: 6,
		borderRadius: 999,
	},
	headerSpacer: {
		width: 32,
	},
	title: {
		fontSize: 18,
		fontWeight: '800',
		color: colors.text,
	},
});
