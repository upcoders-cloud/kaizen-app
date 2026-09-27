import {useEffect, useRef} from 'react';
import {Animated, Platform, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {radius, spacing, typography} from 'theme/theme';
import NotificationsBell from 'components/Notifications/NotificationsBell';

const AppHeader = ({
	title = 'Główna',
	onFilterPress,
	onNotificationsPress,
	onSearchPress,
	isSearchActive = false,
}) => {
	const searchScale = useRef(new Animated.Value(1)).current;
	const hasMounted = useRef(false);

	useEffect(() => {
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}
		Animated.sequence([
			Animated.spring(searchScale, {toValue: 1.08, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}),
			Animated.spring(searchScale, {toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}),
		]).start();
	}, [isSearchActive, searchScale]);

	return (
		<SafeAreaView edges={['top']} style={styles.safeArea}>
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.actions}>
					<Pressable style={styles.iconButton} onPress={onFilterPress} accessibilityRole="button" accessibilityLabel="Filtry">
						<Feather name="sliders" size={18} color={colors.primary} />
					</Pressable>
					<Pressable
						style={[styles.iconButton, isSearchActive ? styles.iconButtonActive : null]}
						onPress={onSearchPress}
						accessibilityRole="button"
						accessibilityLabel={isSearchActive ? 'Zamknij wyszukiwanie' : 'Szukaj'}
					>
						<Animated.View style={{transform: [{scale: searchScale}]}}>
							<Feather name={isSearchActive ? 'x' : 'search'} size={18} color={colors.primary} />
						</Animated.View>
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
		height: 60,
		paddingHorizontal: spacing.lg,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	title: {
		...typography.title,
		color: colors.text,
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
	},
	iconButton: {
		width: 44,
		height: 44,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
	},
	iconButtonActive: {
		backgroundColor: colors.primarySoft,
		borderColor: colors.primary,
	},
	badgeDot: {
		position: 'absolute',
		top: 6,
		right: 6,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.danger,
		borderWidth: 1,
		borderColor: colors.surface,
	},
});
