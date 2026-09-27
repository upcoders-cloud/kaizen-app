import {Animated, PanResponder, Pressable, StyleSheet, View} from 'react-native';
import {useMemo, useRef} from 'react';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const TYPE_CONFIG = {
	LIKE: {icon: 'heart', color: colors.danger, bg: colors.dangerSoft},
	COMMENT: {icon: 'message-circle', color: colors.statusTextSubmitted, bg: colors.statusSubmitted},
	REPLY: {icon: 'corner-down-right', color: colors.statusTextSubmitted, bg: colors.statusSubmitted},
	MENTION: {icon: 'at-sign', color: colors.statusTextInProgress, bg: colors.infoSoft},
	ASSIGNED: {icon: 'user-check', color: colors.roleManagerText, bg: colors.roleManagerSurface},
	APPROVED: {icon: 'check-circle', color: colors.success, bg: colors.successSoft},
	REJECTED: {icon: 'x-circle', color: colors.danger, bg: colors.dangerSoft},
};

const NotificationItem = ({notification, onPress, onMarkRead}) => {
	const translateX = useRef(new Animated.Value(0)).current;
	const panResponder = useMemo(() => PanResponder.create({
		onMoveShouldSetPanResponder: (_, gesture) => !notification?.is_read && Math.abs(gesture.dx) > 15 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
		onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-90, Math.min(0, gesture.dx))),
		onPanResponderRelease: (_, gesture) => {
			if (gesture.dx < -65) onMarkRead?.(notification);
			Animated.spring(translateX, {toValue: 0, useNativeDriver: true}).start();
		},
		onPanResponderTerminate: () => Animated.spring(translateX, {toValue: 0, useNativeDriver: true}).start(),
	}), [notification, onMarkRead, translateX]);
	const firstName = notification?.actor?.first_name?.trim() || '';
	const lastName = notification?.actor?.last_name?.trim() || '';
	const lastInitial = lastName ? `${lastName.charAt(0).toUpperCase()}.` : '';
	const fullName = firstName ? `${firstName}${lastInitial ? ` ${lastInitial}` : ''}` : '';
	const actorName =
		fullName ||
		notification?.actor?.nickname ||
		notification?.actor?.username ||
		'Użytkownik';
	const isOwnerAction = notification?.type === 'ASSIGNED';
	const postTitle = notification?.post_title
		? notification.post_title
		: isOwnerAction ? 'Post do weryfikacji' : 'Twój post';
	const actionLabel = {
		LIKE: 'polubił Twój post',
		COMMENT: 'skomentował Twój post',
		REPLY: 'odpowiedział na Twój komentarz',
		MENTION: 'oznaczył Cię w komentarzu',
		ASSIGNED: 'przypisał Ci post do weryfikacji',
		APPROVED: 'zatwierdził Twój post',
		REJECTED: 'odrzucił Twój post',
	}[notification?.type] || 'polubił Twój post';
	const createdAt = notification?.created_at ? new Date(notification.created_at) : null;
	const formattedDate = createdAt
		? createdAt.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})
		: '';
	const isRead = Boolean(notification?.is_read);
	const typeConfig = TYPE_CONFIG[notification?.type] || {icon: 'bell', color: colors.muted, bg: colors.placeholderSurface};

	const initials = actorName
		.split(' ')
		.filter(Boolean)
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	return (
		<Animated.View style={{transform: [{translateX}]}} {...panResponder.panHandlers}>
		<Pressable
			onPress={() => onPress?.(notification)}
			style={({pressed}) => [
				styles.card,
				!isRead ? styles.cardUnread : null,
				pressed ? styles.cardPressed : null,
			]}
		>
			{!isRead ? <View style={styles.unreadDot} /> : null}
			<View style={styles.avatarRow}>
				<View style={styles.avatar}>
					<Text style={styles.avatarText}>{initials}</Text>
				</View>
				<View style={[styles.typeIconBadge, {backgroundColor: typeConfig.bg}]}>
					<Feather name={typeConfig.icon} size={10} color={typeConfig.color} />
				</View>
			</View>
			<View style={styles.content}>
				<Text style={styles.message} numberOfLines={2}>
					<Text style={styles.actor}>{actorName}</Text> {actionLabel}
				</Text>
				<Text style={styles.postTitle} numberOfLines={1}>
					{postTitle}
				</Text>
				<View style={styles.footer}>
					{formattedDate ? <Text style={styles.date}>{formattedDate}</Text> : null}
					{!isRead ? <Pressable onPress={(event) => { event.stopPropagation(); onMarkRead?.(notification); }} hitSlop={6}><Text style={styles.readAction}>Oznacz jako przeczytane</Text></Pressable> : null}
				</View>
			</View>
		</Pressable>
		</Animated.View>
	);
};

export default NotificationItem;

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		padding: 14,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	cardUnread: {
		borderColor: colors.borderStrong,
		backgroundColor: colors.surfaceAlt,
	},
	cardPressed: {
		opacity: 0.85,
	},
	unreadDot: {
		position: 'absolute',
		top: 14,
		left: 14,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.primary,
		zIndex: 1,
	},
	avatarRow: {
		position: 'relative',
	},
	avatar: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: colors.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.primary,
	},
	typeIconBadge: {
		position: 'absolute',
		bottom: -2,
		right: -2,
		width: 18,
		height: 18,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: colors.surface,
	},
	content: {
		flex: 1,
		gap: 3,
	},
	message: {
		color: colors.text,
		fontSize: 14,
		lineHeight: 20,
	},
	actor: {
		fontWeight: '700',
		color: colors.text,
	},
	postTitle: {
		color: colors.primary,
		fontSize: 13,
		fontWeight: '600',
	},
	date: {
		color: colors.mutedAlt,
		fontSize: 12,
		marginTop: 2,
	},
	footer: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8},
	readAction: {fontSize: 11, fontWeight: '700', color: colors.primary},
});
