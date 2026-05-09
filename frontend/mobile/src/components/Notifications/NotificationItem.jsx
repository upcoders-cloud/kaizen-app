import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const TYPE_CONFIG = {
	LIKE: {icon: 'heart', color: '#e11d48', bg: '#fff1f2'},
	COMMENT: {icon: 'message-circle', color: '#2563eb', bg: '#eff6ff'},
	REPLY: {icon: 'corner-down-right', color: '#2563eb', bg: '#eff6ff'},
	MENTION: {icon: 'at-sign', color: '#0ea5e9', bg: '#f0f9ff'},
	ASSIGNED: {icon: 'user-check', color: '#7c3aed', bg: '#f5f3ff'},
	APPROVED: {icon: 'check-circle', color: '#16a34a', bg: '#f0fdf4'},
	REJECTED: {icon: 'x-circle', color: '#dc2626', bg: '#fef2f2'},
};

const NotificationItem = ({notification, onPress}) => {
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
		? createdAt.toLocaleDateString('pl-PL', {day: '2-digit', month: 'short', year: 'numeric'})
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
				{formattedDate ? <Text style={styles.date}>{formattedDate}</Text> : null}
			</View>
		</Pressable>
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
		borderColor: '#c7d2fe',
		backgroundColor: '#f8f9ff',
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
		backgroundColor: '#e0e7ff',
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
});
