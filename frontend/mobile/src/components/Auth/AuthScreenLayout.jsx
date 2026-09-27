import {Feather} from '@expo/vector-icons';
import Constants from 'expo-constants';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import KeyboardAwareScrollView from 'components/KeyboardAwareScrollView/KeyboardAwareScrollView';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {radius, shadows, spacing, typography} from 'theme/theme';

const AuthScreenLayout = ({
	title,
	subtitle,
	children,
	footerAction,
	footerNote,
	onBackPress,
	backLabel = 'Wybór logowania',
	cardStyle,
	contentStyle,
	centerCard = false,
}) => {
	const appVersion = Constants.expoConfig?.version ?? '1.0.0';

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.decorativeBubble} />
			<KeyboardAwareScrollView
				contentContainerStyle={[styles.content, contentStyle]}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.main, centerCard ? styles.mainCenteredCard : null]}>
				<View style={styles.brandMark}><Feather name="zap" size={25} color={colors.white} /></View>
					{onBackPress ? (
						<Pressable onPress={onBackPress} style={styles.backButton}>
							<Feather name="chevron-left" size={18} color={colors.primary} />
							<Text style={styles.backButtonText}>{backLabel}</Text>
						</Pressable>
					) : null}

					<View style={styles.header}>
						<Text style={styles.title}>{title}</Text>
						{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
					</View>

					<View style={centerCard ? styles.centerCardWrapper : null}>
						<View style={[styles.card, cardStyle]}>{children}</View>
					</View>
				</View>

				<View style={styles.footerWrapper}>
					{footerAction ? <View style={styles.footerAction}>{footerAction}</View> : null}
					<View style={styles.footer}>
						<Text style={styles.footerTitle}>Kaizen App</Text>
						<Text style={styles.footerText}>Wersja {appVersion}</Text>
						{footerNote ? (
							<>
								<View style={styles.footerDivider} />
								<Text style={styles.footerNote}>{footerNote}</Text>
							</>
						) : null}
					</View>
				</View>
			</KeyboardAwareScrollView>
		</SafeAreaView>
	);
};

export default AuthScreenLayout;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: spacing.xxl,
		paddingVertical: spacing.xxxl,
		justifyContent: 'space-between',
		gap: 24,
	},
	main: {
		gap: 16,
	},
	mainCenteredCard: {
		flex: 1,
	},
	brandMark: {width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, ...shadows.card},
	centerCardWrapper: {
		flex: 1,
		justifyContent: 'center',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		paddingVertical: 4,
	},
	backButtonText: {
		fontWeight: '700',
		color: colors.primary,
	},
	header: {
		gap: 6,
	},
	title: {
		...typography.display,
		color: colors.primary,
		lineHeight: 32,
	},
	subtitle: {
		...typography.body,
		color: colors.muted,
	},
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.xl,
		padding: 18,
		gap: 14,
		...shadows.card,
	},
	footerWrapper: {
		gap: 12,
	},
	footerAction: {
		gap: 8,
	},
	footer: {
		paddingVertical: 14,
		paddingHorizontal: 18,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		borderRadius: 14,
		backgroundColor: colors.surface,
		gap: 3,
		alignItems: 'center',
	},
	footerTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: colors.primary,
	},
	footerText: {
		fontSize: 12,
		color: colors.muted,
	},
	footerDivider: {
		width: 42,
		height: 1,
		marginTop: 3,
		marginBottom: 1,
		backgroundColor: colors.borderMuted,
	},
	footerNote: {
		fontSize: 12,
		lineHeight: 17,
		textAlign: 'center',
		color: colors.muted,
	},
	decorativeBubble: {
		position: 'absolute',
		top: -90,
		right: -60,
		width: 220,
		height: 220,
		borderRadius: 120,
		backgroundColor: colors.infoSoft,
		transform: [{rotate: '10deg'}],
	},
});
