import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const NotificationItem = ({notification, onPress}) => {
	const actorName =
		notification?.actor?.nickname ||
		[notification?.actor?.first_name, notification?.actor?.last_name].filter(Boolean).join(' ') ||
		notification?.actor?.username ||
		'Użytkownik';
	const postTitle = notification?.post_title || 'Twój post';
	const actionLabel =
		notification?.type === 'COMMENT' ? 'skomentował Twój post' : 'polubił Twój post';
	const createdAt = notification?.created_at ? new Date(notification.created_at) : null;
	const formattedDate = createdAt
		? createdAt.toLocaleDateString('pl-PL', {day: '2-digit', month: 'short', year: 'numeric'})
		: '';
	const isRead = Boolean(notification?.is_read);

	return (
		<Pressable
			onPress={() => onPress?.(notification)}
			style={({pressed}) => [
				styles.card,
				!isRead ? styles.cardUnread : null,
				pressed ? styles.cardPressed : null,
			]}
		>
			<View style={styles.icon}>
				<Feather
					name={isRead ? 'check-circle' : 'circle'}
					size={18}
					color={isRead ? colors.muted : colors.primary}
				/>
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
		borderRadius: 12,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	cardUnread: {
		borderColor: '#c7d2fe',
		backgroundColor: '#f5f7ff',
	},
	cardPressed: {
		opacity: 0.85,
	},
	icon: {
		width: 28,
		alignItems: 'center',
		marginTop: 2,
	},
	content: {
		flex: 1,
		gap: 4,
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
		color: colors.muted,
		fontSize: 13,
	},
	date: {
		color: colors.mutedAlt,
		fontSize: 12,
	},
});
