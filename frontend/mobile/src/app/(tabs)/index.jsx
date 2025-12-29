import {useCallback, useMemo, useState} from 'react';
import {Alert, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {FAILED_TO_LOAD_POSTS} from 'constants/constans';
import PostList from 'components/PostList/PostList';
import postsService from 'src/server/services/postsService';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {getJwtPayload} from 'utils/jwt';
import AppHeader from 'components/Navigation/AppHeader';
import Toast from 'react-native-toast-message';

const FILTERS = [
	{key: 'all', label: 'Wszystkie'},
	{key: 'mine', label: 'Moje'},
	{key: 'newest', label: 'Najnowsze'},
	{key: 'likes', label: 'Najwięcej polubień'},
];

const Home = () => {
	const [allPosts, setAllPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
	const [filterVisible, setFilterVisible] = useState(false);
	const [likingPostId, setLikingPostId] = useState(null);
	const [menuVisible, setMenuVisible] = useState(false);
	const [menuPost, setMenuPost] = useState(null);
	const [deletingPostId, setDeletingPostId] = useState(null);
	const router = useRouter();
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);
	const loadPosts = useCallback(() => {
		void loadPostsData({setLoading, setError, setPosts: setAllPosts});
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadPosts();
		}, [loadPosts])
	);

	const filteredPosts = useMemo(() => {
		const data = Array.isArray(allPosts) ? [...allPosts] : [];
		switch (activeFilter.key) {
			case 'mine': {
				if (!currentUserId) return [];
				return data.filter((post) => String(post?.author?.id) === String(currentUserId));
			}
			case 'newest':
				return data.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
			case 'likes':
				return data.sort((a, b) => {
					const likesA = a?.likes_count ?? a?.likes?.length ?? 0;
					const likesB = b?.likes_count ?? b?.likes?.length ?? 0;
					return likesB - likesA;
				});
			default:
				return data;
		}
	}, [allPosts, activeFilter.key, currentUserId]);

	const handleOpenFilter = () => setFilterVisible(true);
	const handleCloseFilter = () => setFilterVisible(false);
	const handleSelectFilter = (filter) => {
		setActiveFilter(filter);
		setFilterVisible(false);
	};
	const handleOpenNotifications = () => {
		router.push('/notifications');
	};
	const handleOpenComments = (post) => {
		if (!post?.id) return;
		router.push(`/post/${post.id}`);
	};
	const handleOpenMenu = (post) => {
		if (!post?.id || deletingPostId) return;
		setMenuPost(post);
		setMenuVisible(true);
	};
	const handleCloseMenu = () => setMenuVisible(false);
	const handleEditPost = () => {
		if (!menuPost?.id) return;
		handleCloseMenu();
		router.push(`/post/${menuPost.id}/edit`);
	};
	const handleDeletePost = () => {
		if (!menuPost?.id || deletingPostId) return;
		handleCloseMenu();
		Alert.alert('Usuń post', 'Na pewno usunąć ten post?', [
			{text: 'Anuluj', style: 'cancel'},
			{
				text: 'Usuń',
				style: 'destructive',
				onPress: async () => {
					setDeletingPostId(menuPost.id);
					try {
						await postsService.remove(menuPost.id);
						setAllPosts((prev) => prev.filter((post) => String(post?.id) !== String(menuPost.id)));
						setMenuPost(null);
						Toast.show({
							type: 'success',
							text1: 'Post został poprawnie usunięty',
							visibilityTime: 2000,
						});
					} catch (err) {
						Toast.show({
							type: 'error',
							text1: 'Nie udało się usunąć posta',
							text2: err?.message || 'Spróbuj ponownie',
							visibilityTime: 2500,
						});
					} finally {
						setDeletingPostId(null);
					}
				},
			},
		]);
	};

	const handleToggleLike = async (postId) => {
		if (!postId || likingPostId) return;
		let previousPosts = null;
		setLikingPostId(postId);
		setAllPosts((prev) => {
			previousPosts = prev;
			return prev.map((post) => {
				if (String(post?.id) !== String(postId)) return post;
				const currentLikes = post?.likes_count ?? post?.likes?.length ?? 0;
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
			const nextLiked = response?.is_liked_by_me;
			const nextLikesCount = response?.likes_count;
			if (typeof nextLiked === 'boolean' || typeof nextLikesCount === 'number') {
				setAllPosts((prev) =>
					prev.map((post) => {
						if (String(post?.id) !== String(postId)) return post;
						return {
							...post,
							is_liked_by_me: typeof nextLiked === 'boolean' ? nextLiked : post?.is_liked_by_me,
							likes_count: typeof nextLikesCount === 'number' ? nextLikesCount : post?.likes_count,
						};
					})
				);
			}
		} catch (err) {
			if (previousPosts) {
				setAllPosts(previousPosts);
			}
		} finally {
			setLikingPostId(null);
		}
	};

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.decorativeBubble} pointerEvents="none" />
				<AppHeader
					title="Główna"
					onFilterPress={handleOpenFilter}
					onNotificationsPress={handleOpenNotifications}
				/>
					<PostList
						posts={filteredPosts}
						loading={loading}
						error={error}
						onRefresh={loadPosts}
						onPressItem={(item) => router.push(`/post/${item.id}`)}
						onToggleLike={handleToggleLike}
						onPressComment={handleOpenComments}
						onPressMore={handleOpenMenu}
						currentUserId={currentUserId}
						isDeleting={Boolean(deletingPostId)}
					/>
				<Modal transparent visible={filterVisible} animationType="fade" onRequestClose={handleCloseFilter}>
					<Pressable style={styles.filterOverlay} onPress={handleCloseFilter}>
						<Pressable style={styles.filterMenu} onPress={(event) => event.stopPropagation()}>
							{FILTERS.map((option) => {
								const isActive = option.key === activeFilter.key;
								return (
									<Pressable
										key={option.key}
										style={styles.filterOption}
										onPress={() => handleSelectFilter(option)}
									>
										<Text style={[styles.filterOptionText, isActive ? styles.filterOptionTextActive : null]}>
											{option.label}
										</Text>
										{isActive ? (
											<Feather name="check" size={16} color={colors.primary} />
										) : null}
									</Pressable>
								);
							})}
						</Pressable>
					</Pressable>
				</Modal>
				<Modal transparent visible={menuVisible} animationType="fade" onRequestClose={handleCloseMenu}>
					<Pressable style={styles.menuOverlay} onPress={handleCloseMenu}>
						<Pressable style={styles.menuCard} onPress={(event) => event.stopPropagation()}>
							<Pressable style={styles.menuItem} onPress={handleEditPost}>
								<Feather name="edit-2" size={16} color={colors.primary} />
								<Text style={styles.menuText}>Edytuj</Text>
							</Pressable>
							<Pressable style={styles.menuItem} onPress={handleDeletePost}>
								<Feather name="trash-2" size={16} color={colors.danger} />
								<Text style={[styles.menuText, styles.menuTextDanger]}>Usuń</Text>
							</Pressable>
						</Pressable>
					</Pressable>
				</Modal>
			</SafeAreaView>
		</SafeAreaProvider>
	);
};

const loadPostsData = async ({setLoading, setError, setPosts}) => {
	setLoading(true);
	setError(null);
	try {
		const data = await postsService.list();
		setPosts(data);
	} catch (err) {
		setError(err?.message || FAILED_TO_LOAD_POSTS);
	} finally {
		setLoading(false);
	}
};

export default Home;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	filterOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.2)',
		justifyContent: 'flex-start',
		paddingTop: 68,
		paddingHorizontal: 16,
	},
	filterMenu: {
		alignSelf: 'flex-end',
		marginRight: 96,
		backgroundColor: colors.surface,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 8,
		shadowColor: '#1d2b64',
		shadowOpacity: 0.14,
		shadowRadius: 16,
		shadowOffset: {width: 0, height: 10},
		elevation: 4,
	},
	filterOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 12,
	},
	filterOptionText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
	},
	filterOptionTextActive: {
		color: colors.primary,
	},
	decorativeBubble: {
		position: 'absolute',
		top: -60,
		right: -60,
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: '#36d1dc22',
		transform: [{rotate: '8deg'}],
	},
	menuOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.18)',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	menuCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 8,
		shadowColor: '#0f172a',
		shadowOpacity: 0.15,
		shadowRadius: 18,
		shadowOffset: {width: 0, height: 10},
		elevation: 5,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingHorizontal: 18,
		paddingVertical: 12,
	},
	menuText: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	menuTextDanger: {
		color: colors.danger,
	},
});
