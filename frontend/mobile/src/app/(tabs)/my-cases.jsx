import {useCallback, useMemo, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
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

const CASE_FILTERS = [
	{key: 'all', label: 'Wszystkie', status: null},
	{key: 'to_verify', label: 'Do weryfikacji', status: 'TO_VERIFY'},
	{key: 'approved', label: 'Zatwierdzone', status: 'SUBMITTED'},
	{key: 'rejected', label: 'Odrzucone', status: 'CANCELLED'},
];

const MyCases = () => {
	const [allPosts, setAllPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeFilter, setActiveFilter] = useState(CASE_FILTERS[0]);
	const [refreshing, setRefreshing] = useState(false);
	const [approvingId, setApprovingId] = useState(null);
	const [rejectingPost, setRejectingPost] = useState(null);
	const [rejectLoading, setRejectLoading] = useState(false);
	const router = useRouter();

	const fetchCases = useCallback(async ({withLoader = true} = {}) => {
		if (withLoader) setLoading(true);
		setError(null);
		try {
			const data = await postsService.myCases();
			const resolved = Array.isArray(data) ? data : data?.results ?? [];
			setAllPosts(resolved);
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
		if (!activeFilter.status) return allPosts;
		return allPosts.filter((post) => post?.status === activeFilter.status);
	}, [allPosts, activeFilter.status]);

	const handleRefresh = () => {
		setRefreshing(true);
		void fetchCases({withLoader: false});
	};

	const handleApprove = async (postId) => {
		if (approvingId) return;
		setApprovingId(postId);
		try {
			const updated = await postsService.approve(postId);
			setAllPosts((prev) =>
				prev.map((p) => (String(p?.id) === String(postId) ? {...p, ...updated} : p))
			);
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
			const updated = await postsService.reject(rejectingPost.id, {rejection_reason: reason});
			setAllPosts((prev) =>
				prev.map((p) => (String(p?.id) === String(rejectingPost.id) ? {...p, ...updated} : p))
			);
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
		const isToVerify = item?.status === 'TO_VERIFY';
		const isApproving = String(approvingId) === String(item?.id);

		return (
			<View style={styles.cardWrapper}>
				<Post
					post={item}
					onPress={() => router.push(`/post/${item.id}`)}
				/>
				{isToVerify ? (
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
				) : null}
			</View>
		);
	};

	return (
		<SafeAreaProvider>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.decorativeBubble} pointerEvents="none" />
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Moje sprawy</Text>
				</View>
				<View style={styles.filtersRow}>
					{CASE_FILTERS.map((filter) => {
						const isActive = filter.key === activeFilter.key;
						return (
							<Pressable
								key={filter.key}
								style={[styles.filterPill, isActive ? styles.filterPillActive : null]}
								onPress={() => setActiveFilter(filter)}
							>
								<Text style={[styles.filterPillText, isActive ? styles.filterPillTextActive : null]}>
									{filter.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
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
						contentContainerStyle={styles.listContent}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor={colors.primary}
							/>
						}
						ListEmptyComponent={
							<View style={styles.centered}>
								<Text style={styles.emptyText}>Brak spraw do wyświetlenia.</Text>
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
	header: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: colors.text,
	},
	filtersRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
		backgroundColor: colors.surface,
	},
	filterPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.placeholderSurface,
	},
	filterPillActive: {
		backgroundColor: '#eef2ff',
		borderColor: '#c7d2fe',
	},
	filterPillText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.muted,
	},
	filterPillTextActive: {
		color: colors.primary,
	},
	listContent: {
		padding: 12,
		gap: 12,
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
