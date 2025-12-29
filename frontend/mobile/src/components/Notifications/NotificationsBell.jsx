import {Pressable, StyleSheet, View} from 'react-native';
import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import notificationsService from 'src/server/services/notificationsService';
import {useAuthStore} from 'store/authStore';

const NotificationsBell = ({onPress, style, badgeStyle}) => {
	const [unreadCount, setUnreadCount] = useState(0);
	const accessToken = useAuthStore((state) => state.accessToken);

	const loadUnreadCount = useCallback(async () => {
		if (!accessToken) {
			setUnreadCount(0);
			return;
		}
		try {
			const data = await notificationsService.unreadCount();
			const count = Number(data?.count ?? 0);
			setUnreadCount(Number.isFinite(count) ? count : 0);
		} catch (err) {
			// Keep the last known count on transient errors.
		}
	}, [accessToken]);

	useFocusEffect(
		useCallback(() => {
			void loadUnreadCount();
		}, [loadUnreadCount])
	);

	return (
		<Pressable style={[styles.button, style]} onPress={onPress}>
			<Feather name="bell" size={18} color={colors.primary} />
			{unreadCount > 0 ? <View style={[styles.badge, badgeStyle]} /> : null}
		</Pressable>
	);
};

export default NotificationsBell;

const styles = StyleSheet.create({
	button: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f4f6fb',
		borderWidth: 1,
		borderColor: '#e3e9f7',
	},
	badge: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#ef4444',
		borderWidth: 1,
		borderColor: colors.surface,
	},
});
