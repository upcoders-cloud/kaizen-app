import {useCallback, useMemo, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import postsService from 'src/server/services/postsService';
import colors from 'theme/colors';
import Text from 'components/Text/Text';
import Post from 'components/PostList/Post';
import Button from 'components/Button/Button';
import RejectionReasonModal from 'components/RejectionReasonModal/RejectionReasonModal';
import {FAILED_TO_LOAD_POSTS} from 'constants/constans';
import AppHeader from 'components/Navigation/AppHeader';
import SearchBar from 'components/Search/SearchBar';

const MyCases = () => {
	const [allPosts, setAllPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);
	const [approvingId, setApprovingId] = useState(null);
	const [rejectingPost, setRejectingPost] = useState(null);
	const [rejectLoading, setRejectLoading] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const router = useRouter();

	const fetchCases = useCallback(async ({withLoader = true} = {}) => {
		if (withLoader) setLoading(true);
		setError(null);
		try {
			const data = await postsService.myCases();
			const resolved = Array.isArray(data) ? data : data?.results ?? [];
			setAllPosts(resolved.filter((post) => post?.status === 'TO_VERIFY'));
		} catch (err) {
			setError(err?.message || FAILED_TO_LOAD_POSTS);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			void fetchCases();
		}, [fetchCases])
	);

	const filteredPosts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return allPosts;
		return allPosts.filter((post) => String(post?.title ?? '').toLowerCase().includes(query));
	}, [allPosts, searchQuery]);

	const handleToggleSearch = () => {
		setSearchVisible((prev) => {
			const next = !prev;
			if (!next) {
				setSearchQuery('');
			}
			return next;
		});
	};
	const handleOpenNotifications = () => {
		router.push('/notifications');
	};
	const handleClearSearch = () => {
		setSearchQuery('');
	};

	const handleRefresh = () => {
		setRefreshing(true);
		void fetchCases({withLoader: false});
	};

	const handleApprove = async (postId) => {
		if (approvingId) return;
		setApprovingId(postId);
		try {
			await postsService.approve(postId);
			setAllPosts((prev) => prev.filter((p) => String(p?.id) !== String(postId)));
			Toast.show({type: 'success', text1: 'Zgłoszenie zatwierdzone', visibilityTime: 2000});
		} catch (err) {
			Toast.show({
				type: 'error',
				text1: 'Nie udało się zatwierdzić',
				text2: err?.message || 'Spróbuj ponownie',
				visibilityTime: 2500,
			});
		} finally {
			setApprovingId(null);
		}
	};

	const handleRejectSubmit = async (reason) => {
		if (!rejectingPost?.id) return;
		setRejectLoading(true);
		try {
			await postsService.reject(rejectingPost.id, {rejection_reason: reason});
			setAllPosts((prev) => prev.filter((p) => String(p?.id) !== String(rejectingPost.id)));
			setRejectingPost(null);
			Toast.show({type: 'success', text1: 'Zgłoszenie odrzucone', visibilityTime: 2000});
		} catch (err) {
			Toast.show({
				type: 'error',
				text1: 'Nie udało się odrzucić',
				text2: err?.message || 'Spróbuj ponownie',
				visibilityTime: 2500,
			});
		} finally {
			setRejectLoading(false);
		}
	};

	const renderItem = ({item}) => {
		const isApproving = String(approvingId) === String(item?.id);

		return (
			<View style={styles.cardWrapper}>
				<Post
					post={item}
					onPress={() => router.push(`/post/${item.id}`)}
				/>
				<View style={styles.caseActions}>
					<Button
						title="Zatwierdź"
						onPress={() => handleApprove(item.id)}
						loading={isApproving}
						leftIcon={<Feather name="check" size={16} color="#fff" />}
						style={styles.approveButton}
						textStyle={styles.approveText}
					/>
					<Button
						title="Odrzuć"
						variant="outline"
						onPress={() => setRejectingPost(item)}
						leftIcon={<Feather name="x" size={16} color={colors.danger} />}
						style={styles.rejectButton}
						textStyle={styles.rejectText}
					/>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.decorativeBubble} pointerEvents="none" />
				<AppHeader
					title="Moje sprawy"
					onNotificationsPress={handleOpenNotifications}
					onSearchPress={handleToggleSearch}
					isSearchActive={searchVisible}
				/>
				<SearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					visible={searchVisible}
					onClear={handleClearSearch}
					placeholder="Szukaj spraw po tytule..."
				/>
				{loading && !refreshing ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={colors.primary} />
					</View>
				) : error ? (
					<View style={styles.centered}>
						<Text style={styles.error}>{error}</Text>
					</View>
				) : (
					<FlatList
						data={filteredPosts}
						keyExtractor={(item) => String(item?.id)}
						renderItem={renderItem}
						contentContainerStyle={
							filteredPosts.length ? styles.listContent : styles.listContentEmpty
						}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor={colors.primary}
							/>
						}
						ListEmptyComponent={
							<View style={styles.emptyState}>
								<Text style={styles.emptyText}>Brak spraw do zatwierdzenia.</Text>
							</View>
						}
					/>
				)}
				<RejectionReasonModal
					visible={Boolean(rejectingPost)}
					onClose={() => setRejectingPost(null)}
					onSubmit={handleRejectSubmit}
					loading={rejectLoading}
				/>
			</SafeAreaView>
		</SafeAreaProvider>
	);
};

export default MyCases;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	listContent: {
		padding: 12,
		gap: 12,
	},
	listContentEmpty: {
		flexGrow: 1,
	},
	cardWrapper: {
		gap: 0,
	},
	caseActions: {
		flexDirection: 'row',
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderTopWidth: 0,
		borderColor: colors.border,
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
	},
	approveButton: {
		flex: 1,
		minHeight: 40,
		backgroundColor: '#16a34a',
		borderColor: '#16a34a',
	},
	approveText: {
		color: '#fff',
	},
	rejectButton: {
		flex: 1,
		minHeight: 40,
		borderColor: colors.danger,
	},
	rejectText: {
		color: colors.danger,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	error: {
		color: colors.danger,
		fontWeight: '700',
	},
	emptyText: {
		color: colors.muted,
		fontSize: 14,
	},
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
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
