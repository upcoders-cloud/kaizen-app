import {useCallback, useMemo, useState} from 'react';
import {Stack, useRouter} from 'expo-router';
import {useFocusEffect} from '@react-navigation/native';
import {
	ActivityIndicator,
	FlatList,
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
import Button from 'components/Button/Button';

const NotificationsScreen = () => {
	const router = useRouter();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);
	const [markingAll, setMarkingAll] = useState(false);

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

	const hasMultipleNotifications = notifications.length > 1;
	const hasUnreadNotifications = useMemo(
		() => notifications.some((notification) => !notification?.is_read),
		[notifications]
	);

	const handleMarkAllRead = async () => {
		if (markingAll || !hasUnreadNotifications) return;
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

	const renderListHeader = () => {
		if (!hasMultipleNotifications) return null;
		const iconColor = hasUnreadNotifications ? colors.primary : '#9ca3af';
		return (
			<View style={styles.markAllContainer}>
				<Button
					title="Oznacz wszystkie jako przeczytane"
					variant="outline"
					onPress={handleMarkAllRead}
					loading={markingAll}
					disabled={!hasUnreadNotifications}
					leftIcon={<Feather name="check-circle" size={16} color={iconColor} />}
					style={styles.markAllButton}
					textStyle={styles.markAllText}
				/>
			</View>
		);
	};

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
				{loading ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={styles.muted}>Ładowanie powiadomień...</Text>
					</View>
				) : error ? (
					<View style={styles.centered}>
						<Text style={styles.error}>{error}</Text>
					</View>
				) : (
					<FlatList
						data={notifications}
						keyExtractor={(item) => String(item.id)}
						renderItem={({item}) => (
							<NotificationItem notification={item} onPress={handlePressNotification} />
						)}
						ListHeaderComponent={renderListHeader}
						contentContainerStyle={notifications.length ? styles.listContent : styles.centered}
						ListEmptyComponent={<Text style={styles.muted}>Brak powiadomień.</Text>}
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
	listContent: {
		padding: 16,
		gap: 12,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		padding: 16,
	},
	muted: {
		color: colors.muted,
	},
	error: {
		color: colors.danger,
		fontWeight: '600',
		textAlign: 'center',
	},
	markAllContainer: {
		paddingBottom: 4,
	},
	markAllButton: {
		borderRadius: 999,
		minHeight: 44,
	},
	markAllText: {
		fontSize: 14,
	},
});
