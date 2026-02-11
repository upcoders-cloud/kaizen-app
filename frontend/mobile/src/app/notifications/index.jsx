import {useCallback, useMemo, useState} from 'react';
import {Stack, useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	View,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {SafeAreaView} from 'react-native-safe-area-context';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import notificationsService from 'src/server/services/notificationsService';
import NotificationItem from 'components/Notifications/NotificationItem';
import BackButton from 'components/Navigation/BackButton';

const TABS = {UNREAD: 'UNREAD', ALL: 'ALL'};

const NotificationsScreen = () => {
	const router = useRouter();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const [markingAll, setMarkingAll] = useState(false);
	const [activeTab, setActiveTab] = useState(TABS.UNREAD);

	const loadNotifications = useCallback(async ({withLoader = true} = {}) => {
		if (withLoader) setLoading(true);
		setError(null);
		try {
			const data = await notificationsService.list();
			setNotifications(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err?.message || 'Nie udało się pobrać powiadomień.');
		} finally {
			if (withLoader) setLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			void loadNotifications();
		}, [loadNotifications])
	);

	const handleRefresh = async () => {
		setRefreshing(true);
		await loadNotifications({withLoader: false});
		setRefreshing(false);
	};

	const unreadNotifications = useMemo(
		() => notifications.filter((n) => !n?.is_read),
		[notifications]
	);

	const displayedNotifications = activeTab === TABS.UNREAD
		? unreadNotifications
		: notifications;

	const unreadCount = unreadNotifications.length;
	const hasUnread = unreadCount > 0;

	const handlePressNotification = async (notification) => {
		const postId = notification?.post_id;
		if (!postId) return;
		const isCommentNotification = notification?.type === 'COMMENT';
		const commentId = isCommentNotification ? notification?.comment_id : null;
		if (!notification?.is_read) {
			setNotifications((prev) =>
				prev.map((item) =>
					item.id === notification.id
						? {...item, is_read: true, read_at: new Date().toISOString()}
						: item
				)
			);
			notificationsService.markRead(notification.id).catch(() => {
				setNotifications((prev) =>
					prev.map((item) => (item.id === notification.id ? notification : item))
				);
			});
		}
		if (commentId) {
			router.push({pathname: `/post/${postId}`, params: {commentId: String(commentId)}});
			return;
		}
		router.push(`/post/${postId}`);
	};

	const handleMarkAllRead = async () => {
		if (markingAll || !hasUnread) return;
		setMarkingAll(true);
		let previousNotifications = null;
		const timestamp = new Date().toISOString();
		setNotifications((prev) => {
			previousNotifications = prev;
			return prev.map((notification) =>
				notification?.is_read
					? notification
					: {...notification, is_read: true, read_at: timestamp}
			);
		});
		try {
			await notificationsService.markAllRead();
		} catch (err) {
			if (previousNotifications) {
				setNotifications(previousNotifications);
			}
		} finally {
			setMarkingAll(false);
		}
	};

	const emptyText = activeTab === TABS.UNREAD
		? 'Brak nieprzeczytanych powiadomień.'
		: 'Brak powiadomień.';

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Powiadomienia',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
					headerLeft: () => <BackButton onPress={() => router.back()} />,
				}}
			/>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				{/* Tabs */}
				<View style={styles.tabBar}>
					<Pressable
						style={[styles.tab, activeTab === TABS.UNREAD && styles.tabActive]}
						onPress={() => setActiveTab(TABS.UNREAD)}
					>
						<Text style={[styles.tabText, activeTab === TABS.UNREAD && styles.tabTextActive]}>
							Nieprzeczytane
						</Text>
						{unreadCount > 0 ? (
							<View style={[styles.tabBadge, activeTab === TABS.UNREAD && styles.tabBadgeActive]}>
								<Text style={[styles.tabBadgeText, activeTab === TABS.UNREAD && styles.tabBadgeTextActive]}>
									{unreadCount}
								</Text>
							</View>
						) : null}
					</Pressable>
					<Pressable
						style={[styles.tab, activeTab === TABS.ALL && styles.tabActive]}
						onPress={() => setActiveTab(TABS.ALL)}
					>
						<Text style={[styles.tabText, activeTab === TABS.ALL && styles.tabTextActive]}>
							Wszystkie
						</Text>
					</Pressable>
				</View>

				{/* Mark all as read */}
				{activeTab === TABS.UNREAD && hasUnread ? (
					<Pressable
						style={[styles.markAllRow, markingAll && {opacity: 0.6}]}
						onPress={handleMarkAllRead}
						disabled={markingAll}
					>
						{markingAll ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<Feather name="check-circle" size={15} color={colors.primary} />
						)}
						<Text style={styles.markAllText}>Oznacz wszystkie jako przeczytane</Text>
					</Pressable>
				) : null}

				{/* Content */}
				{loading ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={styles.muted}>Ładowanie powiadomień...</Text>
					</View>
				) : error ? (
					<View style={styles.centered}>
						<Feather name="wifi-off" size={28} color={colors.muted} />
						<Text style={styles.error}>{error}</Text>
					</View>
				) : (
					<FlatList
						data={displayedNotifications}
						keyExtractor={(item) => String(item.id)}
						renderItem={({item}) => (
							<NotificationItem notification={item} onPress={handlePressNotification} />
						)}
						contentContainerStyle={displayedNotifications.length ? styles.listContent : styles.centered}
						ListEmptyComponent={
							<View style={styles.emptyState}>
								<Feather
									name={activeTab === TABS.UNREAD ? 'check-circle' : 'bell-off'}
									size={32}
									color={colors.muted}
								/>
								<Text style={styles.muted}>{emptyText}</Text>
							</View>
						}
						showsVerticalScrollIndicator={false}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor={colors.primary}
							/>
						}
					/>
				)}
			</SafeAreaView>
		</>
	);
};

export default NotificationsScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},

	/* Tabs */
	tabBar: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 4,
		gap: 8,
	},
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 999,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	tabActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	tabText: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	tabTextActive: {
		color: '#fff',
	},
	tabBadge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
		backgroundColor: '#fee2e2',
	},
	tabBadgeActive: {
		backgroundColor: 'rgba(255,255,255,0.25)',
	},
	tabBadgeText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#dc2626',
	},
	tabBadgeTextActive: {
		color: '#fff',
	},

	/* Mark all */
	markAllRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	markAllText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.primary,
	},

	/* List */
	listContent: {
		padding: 16,
		paddingTop: 8,
		gap: 10,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		padding: 16,
	},
	emptyState: {
		alignItems: 'center',
		gap: 10,
	},
	muted: {
		color: colors.muted,
		fontSize: 14,
	},
	error: {
		color: colors.danger,
		fontWeight: '600',
		textAlign: 'center',
	},
});
