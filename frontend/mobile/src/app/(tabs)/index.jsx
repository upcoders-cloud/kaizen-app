import {useCallback, useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
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

const FILTERS = [
	{key: 'all', label: 'All posts'},
	{key: 'mine', label: 'My posts'},
	{key: 'newest', label: 'Newest'},
	{key: 'likes', label: 'Most likes'},
];

const Home = () => {
	const [allPosts, setAllPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
	const [filterVisible, setFilterVisible] = useState(false);
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

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.decorativeBubble} pointerEvents="none" />
				<AppHeader title="Główna" onFilterPress={handleOpenFilter} />
					<PostList
						posts={filteredPosts}
						loading={loading}
						error={error}
						onRefresh={loadPosts}
						onPressItem={(item) => router.push(`/post/${item.id}`)}
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
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	filterMenu: {
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
});
