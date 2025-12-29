import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import NotificationsBell from 'components/Notifications/NotificationsBell';

const AppHeader = ({title = 'Główna', onFilterPress, onNotificationsPress}) => {
	return (
		<SafeAreaView edges={['top']} style={styles.safeArea}>
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.actions}>
					<Pressable style={styles.iconButton} onPress={onFilterPress}>
						<Feather name="sliders" size={18} color={colors.primary} />
					</Pressable>
					<Pressable style={styles.iconButton}>
						<Feather name="search" size={18} color={colors.primary} />
					</Pressable>
					<NotificationsBell
						onPress={onNotificationsPress}
						style={styles.iconButton}
						badgeStyle={styles.badgeDot}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
};

export default AppHeader;

const styles = StyleSheet.create({
	safeArea: {
		backgroundColor: colors.surface,
	},
	container: {
		height: 54,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	iconButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f4f6fb',
		borderWidth: 1,
		borderColor: '#e3e9f7',
	},
	badgeDot: {
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
