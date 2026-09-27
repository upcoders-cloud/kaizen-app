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
import {useAuthStore} from 'store/authStore';
import {EmptyState, ErrorState, Chip} from 'components/ui';

const STATUS_LABELS = {
	TO_VERIFY: 'Do weryfikacji',
	CANCELLED: 'Odrzucony',
};

const MyCases = () => {
	const [allPosts, setAllPosts] = useState([]);
	const [nextPage, setNextPage] = useState(null);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);
	const [approvingId, setApprovingId] = useState(null);
	const [rejectingPost, setRejectingPost] = useState(null);
	const [rejectLoading, setRejectLoading] = useState(false);
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [tab, setTab] = useState('queue');
	const router = useRouter();
	const user = useAuthStore((state) => state.user);
	const isApprover = user?.permissions?.is_approver ?? Boolean(user?.is_staff || user?.is_superuser ||
		['TEAM_LEAD', 'MANAGER', 'DIRECTOR'].includes(user?.role));
	// Approver ma dwie listy: sprawy do decyzji oraz własne zgłoszenia (oczekujące i odrzucone).
	const showQueue = isApprover && tab === 'queue';

	const fetchCases = useCallback(async ({withLoader = true} = {}) => {
		if (withLoader) setLoading(true);
		setError(null);
		try {
			let data;
			if (showQueue) data = await postsService.approvalsQueue({page: 1});
			else if (isApprover) data = await postsService.list({mine: true, status: 'TO_VERIFY,CANCELLED', page_size: 50});
			else data = await postsService.myCases();
			const resolved = Array.isArray(data) ? data : data?.results ?? [];
			setAllPosts(resolved);
			setNextPage(showQueue && data?.next ? 2 : null);
		} catch (err) {
			setError(err?.message || FAILED_TO_LOAD_POSTS);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [isApprover, showQueue]);
	const loadNext = async () => {
		if (!showQueue || !nextPage || loadingMore) return;
		setLoadingMore(true);
		try {
			const data = await postsService.approvalsQueue({page: nextPage});
			const incoming = Array.isArray(data) ? data : data?.results ?? [];
			setAllPosts((prev) => {
				const ids = new Set(prev.map((post) => String(post.id)));
				return [...prev, ...incoming.filter((post) => !ids.has(String(post.id)))];
			});
			setNextPage(data?.next ? nextPage + 1 : null);
		} catch (err) {
			Toast.show({type: 'error', text1: 'Nie udało się pobrać kolejnych spraw', text2: err?.message});
		} finally {
			setLoadingMore(false);
		}
	};

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
			if (!next) setSearchQuery('');
			return next;
		});
	};
	const handleOpenNotifications = () => router.push('/notifications');
	const handleClearSearch = () => setSearchQuery('');

	const handleRefresh = () => {
		setRefreshing(true);
		void fetchCases({withLoader: false});
	};

	const handleApprove = async (post) => {
		const postId = post?.id;
		if (post?.current_stage?.stage === 'MANAGER') {
			router.push(`/post/${postId}`);
			return;
		}
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

	const handleResubmit = async (postId) => {
		try {
			await postsService.resubmit(postId);
			setAllPosts((prev) => prev.map((p) =>
				String(p?.id) === String(postId) ? {...p, status: 'TO_VERIFY', rejection_reason: null} : p
			));
			Toast.show({type: 'success', text1: 'Zgłoszenie wysłane ponownie', visibilityTime: 2000});
		} catch (err) {
			Toast.show({
				type: 'error',
				text1: 'Nie udało się ponownie zgłosić',
				text2: err?.message || 'Spróbuj ponownie',
				visibilityTime: 2500,
			});
		}
	};

	const renderManagerItem = ({item}) => {
		const isApproving = String(approvingId) === String(item?.id);
		const isCancelled = item?.status === 'CANCELLED';

		return (
			<View style={styles.cardWrapper}>
				<View style={styles.caseHeading}><Text style={styles.caseHeadingText}>Do Twojej decyzji</Text><Chip label={{TEAM_LEAD: 'Lider', MANAGER: 'Kierownik', DIRECTOR: 'Dyrektor'}[item?.current_stage?.stage] || 'Akceptacja'} /></View>
				<Post post={item} onPress={() => router.push(`/post/${item.id}`)} />
				{!isCancelled ? (
					<View style={styles.caseActions}>
						<Button
							title={item?.current_stage?.stage === 'MANAGER' ? 'Przejdź do decyzji' : 'Zatwierdź'}
							onPress={() => handleApprove(item)}
							loading={isApproving}
							leftIcon={<Feather name="check" size={16} color={colors.white} />}
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

	const renderEmployeeItem = ({item}) => {
		const isCancelled = item?.status === 'CANCELLED';

		return (
			<View style={styles.cardWrapper}>
				<Post post={item} onPress={() => router.push(`/post/${item.id}`)} />
				<View style={styles.statusBar}>
					<View style={[styles.statusBadge, isCancelled ? styles.statusCancelled : styles.statusPending]}>
						<Text style={[styles.statusBadgeText, isCancelled ? styles.statusCancelledText : styles.statusPendingText]}>
							{STATUS_LABELS[item?.status] || item?.status}
						</Text>
					</View>
					{isCancelled ? (
						<View style={styles.employeeActions}>
							<Button
								title="Edytuj"
								variant="outline"
								onPress={() => router.push(`/post/${item.id}/edit`)}
								leftIcon={<Feather name="edit-2" size={14} color={colors.primary} />}
								style={styles.smallButton}
								textStyle={styles.smallButtonText}
							/>
							<Button
								title="Zgłoś ponownie"
								onPress={() => handleResubmit(item.id)}
								leftIcon={<Feather name="refresh-cw" size={14} color={colors.white} />}
								style={styles.smallButton}
								textStyle={styles.smallButtonTextWhite}
							/>
						</View>
					) : null}
					{isCancelled && item?.rejection_reason ? (
						<Text style={styles.rejectionReason} numberOfLines={2}>
							Powód: {item.rejection_reason}
						</Text>
					) : null}
				</View>
			</View>
		);
	};

	const emptyText = showQueue
		? 'Brak spraw do weryfikacji.'
		: 'Nie masz zgłoszeń oczekujących na weryfikację.';

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
				{isApprover ? (
					<View style={styles.tabs}>
						<Chip label="Do decyzji" selected={tab === 'queue'} onPress={() => setTab('queue')} />
						<Chip label="Moje zgłoszenia" selected={tab === 'mine'} onPress={() => setTab('mine')} />
					</View>
				) : null}
				{loading && !refreshing ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={colors.primary} />
					</View>
				) : error ? (
					<View style={styles.centered}>
						<ErrorState description={error} onRetry={() => void fetchCases()} />
					</View>
				) : (
					<FlatList
						data={filteredPosts}
						keyExtractor={(item) => String(item?.id)}
						renderItem={showQueue ? renderManagerItem : renderEmployeeItem}
						contentContainerStyle={
							filteredPosts.length ? styles.listContent : styles.listContentEmpty
						}
						onEndReached={() => void loadNext()}
						onEndReachedThreshold={0.4}
						ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={styles.moreLoader} /> : null}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor={colors.primary}
							/>
						}
						ListEmptyComponent={
							<EmptyState icon={showQueue ? 'check-circle' : 'inbox'} title="Wszystko załatwione" description={emptyText} />
						}
					/>
				)}
				{isApprover ? (
					<RejectionReasonModal
						visible={Boolean(rejectingPost)}
						onClose={() => setRejectingPost(null)}
						onSubmit={handleRejectSubmit}
						loading={rejectLoading}
					/>
				) : null}
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
	tabs: {flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10},
	listContent: {
		padding: 12,
		paddingBottom: 120,
		gap: 12,
	},
	moreLoader: {marginVertical: 16},
	listContentEmpty: {
		flexGrow: 1,
	},
	cardWrapper: {
		gap: 0,
	},
	caseHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 11, paddingBottom: 7, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border},
	caseHeadingText: {fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5},
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
	statusBar: {
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderTopWidth: 0,
		borderColor: colors.border,
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
	},
	statusBadge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusPending: {
		backgroundColor: colors.warningSoft,
	},
	statusPendingText: {
		color: colors.warning,
	},
	statusCancelled: {
		backgroundColor: colors.dangerSoft,
	},
	statusCancelledText: {
		color: colors.statusTextCancelled,
	},
	statusBadgeText: {
		fontSize: 12,
		fontWeight: '700',
	},
	employeeActions: {
		flexDirection: 'row',
		gap: 10,
	},
	smallButton: {
		minHeight: 36,
		paddingHorizontal: 12,
	},
	smallButtonText: {
		fontSize: 13,
	},
	smallButtonTextWhite: {
		fontSize: 13,
		color: colors.white,
	},
	rejectionReason: {
		fontSize: 12,
		color: colors.danger,
		fontStyle: 'italic',
	},
	approveButton: {
		flex: 1,
		minHeight: 40,
		backgroundColor: colors.success,
		borderColor: colors.success,
	},
	approveText: {
		color: colors.white,
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
		backgroundColor: colors.accentWash,
		transform: [{rotate: '8deg'}],
	},
});
