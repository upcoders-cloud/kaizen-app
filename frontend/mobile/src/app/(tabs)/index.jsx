import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {FAILED_TO_LOAD_POSTS} from 'constants/constans';
import PostList from 'components/PostList/PostList';
import postsService from 'src/server/services/postsService';
import categoriesService from 'src/server/services/categoriesService';
import colors from 'theme/colors';
import {useAuthStore} from 'store/authStore';
import {getJwtPayload} from 'utils/jwt';
import AppHeader from 'components/Navigation/AppHeader';
import SearchBar from 'components/Search/SearchBar';
import Toast from 'react-native-toast-message';

const SORT_FILTERS = [
	{key: 'all', label: 'Wszystkie'},
	{key: 'mine', label: 'Moje'},
	{key: 'newest', label: 'Najnowsze'},
	{key: 'likes', label: 'Najwięcej polubień'},
];

const STATUS_FILTERS = [
	{key: null, label: 'Wszystkie statusy'},
	{key: 'SUBMITTED', label: 'Zgłoszone'},
	{key: 'IN_PROGRESS', label: 'W trakcie wdrożenia'},
	{key: 'IMPLEMENTED', label: 'Wdrożone'},
];

const SEARCH_DEBOUNCE_MS = 300;

const buildPostsParams = ({sortKey, statusKey, categoryId, search}) => {
	const params = {};
	if (sortKey === 'mine') params.mine = 'true';
	if (sortKey === 'likes') params.ordering = 'likes';
	if (statusKey) params.status = statusKey;
	if (categoryId) params.category = categoryId;
	const trimmed = search?.trim();
	if (trimmed) params.search = trimmed;
	return params;
};

const Home = () => {
	const [allPosts, setAllPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const [activeFilter, setActiveFilter] = useState(SORT_FILTERS[0]);
	const [activeStatus, setActiveStatus] = useState(STATUS_FILTERS[0]);
	const [activeCategoryId, setActiveCategoryId] = useState(null);
	const [categories, setCategories] = useState([]);
	const [filterVisible, setFilterVisible] = useState(false);
	const [likingPostId, setLikingPostId] = useState(null);
	const [menuVisible, setMenuVisible] = useState(false);
	const [menuPost, setMenuPost] = useState(null);
	const [deletingPostId, setDeletingPostId] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [searchVisible, setSearchVisible] = useState(false);
	const router = useRouter();
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);

	useEffect(() => {
		const timeout = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchQuery]);

	useEffect(() => {
		categoriesService
			.list()
			.then((data) => setCategories(Array.isArray(data) ? data : data?.results ?? []))
			.catch(() => setCategories([]));
	}, []);

	const params = useMemo(
		() => buildPostsParams({
			sortKey: activeFilter.key,
			statusKey: activeStatus.key,
			categoryId: activeCategoryId,
			search: debouncedSearch,
		}),
		[activeFilter.key, activeStatus.key, activeCategoryId, debouncedSearch]
	);

	const isFirstLoadRef = useRef(true);
	const loadPosts = useCallback((options = {}) => {
		void loadPostsData({
			setLoading,
			setRefreshing,
			setError,
			setPosts: setAllPosts,
			refresh: Boolean(options.refresh),
			params,
		});
	}, [params]);

	const handleRefresh = useCallback(() => loadPosts({refresh: true}), [loadPosts]);

	useEffect(() => {
		if (isFirstLoadRef.current) {
			isFirstLoadRef.current = false;
			return;
		}
		loadPosts();
	}, [loadPosts]);

	useFocusEffect(
		useCallback(() => {
			loadPosts();
		}, [loadPosts])
	);

	const handleOpenFilter = () => setFilterVisible(true);
	const handleCloseFilter = () => setFilterVisible(false);
	const handleSelectFilter = (filter) => setActiveFilter(filter);
	const handleSelectStatus = (option) => setActiveStatus(option);
	const handleSelectCategory = (id) => setActiveCategoryId(id);
	const handleResetFilters = () => {
		setActiveFilter(SORT_FILTERS[0]);
		setActiveStatus(STATUS_FILTERS[0]);
		setActiveCategoryId(null);
	};
	const handleToggleSearch = () => {
		setSearchVisible((prev) => {
			const next = !prev;
			if (!next) {
				setSearchQuery('');
			}
			return next;
		});
	};
	const handleClearSearch = () => {
		setSearchQuery('');
	};
	const handleOpenNotifications = () => {
		router.push('/notifications');
	};
	const handleOpenComments = (post) => {
		if (!post?.id) return;
		router.push({pathname: `/post/${post.id}`, params: {scrollTo: 'comments'}});
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

	const hasActiveFilters =
		activeFilter.key !== 'all' || activeStatus.key !== null || activeCategoryId !== null;
	const emptyListText = debouncedSearch.trim() || hasActiveFilters
		? 'Brak wyników dla wybranych filtrów.'
		: 'Brak postów do wyświetlenia.';

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.decorativeBubble} pointerEvents="none" />
				<AppHeader
					title="Główna"
					onFilterPress={handleOpenFilter}
					onNotificationsPress={handleOpenNotifications}
					onSearchPress={handleToggleSearch}
					isSearchActive={searchVisible}
				/>
				<SearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					visible={searchVisible}
					onClear={handleClearSearch}
				/>
				<PostList
					posts={allPosts}
					loading={loading}
					refreshing={refreshing}
					error={error}
					emptyText={emptyListText}
					onRefresh={handleRefresh}
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
							<ScrollView showsVerticalScrollIndicator={false} style={styles.filterScroll}>
								<Text style={styles.filterSectionLabel}>Sortowanie</Text>
								{SORT_FILTERS.map((option) => {
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
											{isActive ? <Feather name="check" size={16} color={colors.primary} /> : null}
										</Pressable>
									);
								})}

								<Text style={styles.filterSectionLabel}>Status</Text>
								{STATUS_FILTERS.map((option) => {
									const isActive = option.key === activeStatus.key;
									return (
										<Pressable
											key={String(option.key)}
											style={styles.filterOption}
											onPress={() => handleSelectStatus(option)}
										>
											<Text style={[styles.filterOptionText, isActive ? styles.filterOptionTextActive : null]}>
												{option.label}
											</Text>
											{isActive ? <Feather name="check" size={16} color={colors.primary} /> : null}
										</Pressable>
									);
								})}

								{categories.length ? (
									<>
										<Text style={styles.filterSectionLabel}>Kategoria</Text>
										<Pressable
											style={styles.filterOption}
											onPress={() => handleSelectCategory(null)}
										>
											<Text style={[styles.filterOptionText, activeCategoryId === null ? styles.filterOptionTextActive : null]}>
												Wszystkie kategorie
											</Text>
											{activeCategoryId === null ? <Feather name="check" size={16} color={colors.primary} /> : null}
										</Pressable>
										{categories.map((category) => {
											const isActive = String(activeCategoryId) === String(category.id);
											return (
												<Pressable
													key={category.id}
													style={styles.filterOption}
													onPress={() => handleSelectCategory(category.id)}
												>
													<Text style={[styles.filterOptionText, isActive ? styles.filterOptionTextActive : null]}>
														{category.name}
													</Text>
													{isActive ? <Feather name="check" size={16} color={colors.primary} /> : null}
												</Pressable>
											);
										})}
									</>
								) : null}
							</ScrollView>
							<View style={styles.filterFooter}>
								<Pressable onPress={handleResetFilters} style={styles.filterResetButton} disabled={!hasActiveFilters}>
									<Text style={[styles.filterResetText, !hasActiveFilters ? styles.filterResetTextDisabled : null]}>
										Wyczyść filtry
									</Text>
								</Pressable>
								<Pressable onPress={handleCloseFilter} style={styles.filterApplyButton}>
									<Text style={styles.filterApplyText}>Gotowe</Text>
								</Pressable>
							</View>
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

const loadPostsData = async ({setLoading, setRefreshing, setError, setPosts, refresh = false, params}) => {
	if (refresh) {
		setRefreshing(true);
	} else {
		setLoading(true);
	}
	setError(null);
	try {
		const data = await postsService.list(params);
		setPosts(Array.isArray(data) ? data : data?.results ?? []);
	} catch (err) {
		setError(err?.message || FAILED_TO_LOAD_POSTS);
	} finally {
		if (refresh) {
			setRefreshing(false);
		} else {
			setLoading(false);
		}
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
		marginRight: 16,
		width: 300,
		maxHeight: '80%',
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
	filterScroll: {
		flexGrow: 0,
	},
	filterSectionLabel: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		color: colors.muted,
		paddingHorizontal: 18,
		paddingTop: 12,
		paddingBottom: 4,
	},
	filterOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 10,
	},
	filterOptionText: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	filterOptionTextActive: {
		color: colors.primary,
	},
	filterFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 4,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		marginTop: 8,
	},
	filterResetButton: {
		paddingVertical: 8,
		paddingHorizontal: 8,
	},
	filterResetText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.danger,
	},
	filterResetTextDisabled: {
		color: colors.muted,
	},
	filterApplyButton: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
		backgroundColor: colors.primary,
	},
	filterApplyText: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.surface,
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
