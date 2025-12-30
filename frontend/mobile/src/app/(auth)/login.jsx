import {useState} from 'react';
import {Redirect} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from 'store/authStore'
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {EMPTY_STRING, PLATFORM_IOS, STRING} from "constants/constans";

const Login = () => {
	const appVersion = Constants.expoConfig?.version ?? '1.0.0';
	const {width} = useWindowDimensions();
	const isCompact = width < 360;
	const [username, setUsername] = useState(EMPTY_STRING);
	const [password, setPassword] = useState(EMPTY_STRING);
	const [loading, setLoading] = useState(false);
	const {isAuthenticated, login, error: authError} = useAuthStore();

	if (isAuthenticated) {
		return <Redirect href="/(tabs)" />;
	}

	const handleUsernameChange = (valueOrEvent) => {
		const value = typeof valueOrEvent === STRING
			? valueOrEvent
			: valueOrEvent?.nativeEvent?.text || EMPTY_STRING;
		setUsername(value);
	};

	const handlePasswordChange = (valueOrEvent) => {
		const value = typeof valueOrEvent === STRING
			? valueOrEvent
			: valueOrEvent?.nativeEvent?.text || EMPTY_STRING;
		setPassword(value);
	};

	const handleLogin = async () => {
		setLoading(true);
		try {
			const result = await login(username, password);
			if (result?.success) {
				Toast.show({
					type: 'success',
					text1: 'Zalogowano pomyślnie',
					visibilityTime: 2000,
				});
			} else {
				Toast.show({
					type: 'error',
					text1: 'Logowanie nieudane',
					text2: result?.error || authError || 'Spróbuj ponownie',
					visibilityTime: 2500,
				});
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Logowanie nieudane',
				text2: error?.message || 'Spróbuj ponownie',
				visibilityTime: 2500,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.decorativeBubble} />
			<KeyboardAvoidingView
				behavior={Platform.OS === PLATFORM_IOS ? 'padding' : undefined}
				style={styles.flex}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.header}>
						<View style={styles.tag}>
							<Feather name="zap" size={14} color={colors.primary} />
							<Text style={styles.tagText}>Mentalność 改善</Text>
						</View>
						<Text style={styles.title}>Witaj ponownie</Text>
						<Text style={styles.subtitle}>
							Zaloguj się, aby rozwijać pomysły zespołu. Twoje dane są bezpieczne i gotowe do działania.
						</Text>
					</View>

					<View style={styles.card}>
						<View style={styles.cardHeader}>
						<View style={styles.cardHeaderText}>
							<Text style={styles.cardTitle}>Zaloguj się</Text>
							<Text style={styles.cardSubtitle}>Wpisz dane, aby wejść do aplikacji</Text>
						</View>
						<View style={styles.badge}>
							<Feather name="shield" size={14} color={colors.primary} />
							<Text style={styles.badgeText} numberOfLines={1}>
								Szyfrowane
							</Text>
						</View>
						</View>

						<View style={styles.form}>
							<Input
								label="Login"
								placeholder="np. emilys"
								autoCapitalize="none"
								value={username}
								onChangeText={handleUsernameChange}
								onChange={handleUsernameChange}
							/>
							<Input
								label="Hasło"
								placeholder="••••••••"
								secureTextEntry
								textContentType="password"
								value={password}
								onChangeText={handlePasswordChange}
								onChange={handlePasswordChange}
							/>
							<Button
								title="Zaloguj"
								onPress={handleLogin}
								loading={loading}
								leftIcon={<Feather name="log-in" size={16} color="#ffffff" />}
								style={styles.submitButton}
							/>
							<Pressable style={[styles.helperRow, isCompact ? styles.helperRowCompact : null]}>
								<Text style={styles.helperLink}>Nie pamiętasz hasła?</Text>
								{isCompact ? null : <View style={styles.dot} />}
								<Text style={styles.helperMuted}>Skontaktuj się z administratorem</Text>
							</Pressable>
						</View>
					</View>

					<View style={styles.footer}>
						<Text style={styles.footerTitle}>Kaizen App</Text>
						<Text style={styles.footerText}>
							Wersja {appVersion} • Stworzone przez Upcoders
						</Text>
						<Text style={styles.footerNote}>Małe usprawnienia, duży efekt.</Text>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default Login;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	flex: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		paddingHorizontal: 26,
		paddingVertical: 24,
		gap: 20,
	},
	header: {
		gap: 10,
	},
	tag: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		backgroundColor: colors.surface,
	},
	tagText: {
		fontWeight: '700',
		fontSize: 12,
		color: colors.primary,
		letterSpacing: 0.4,
	},
	title: {
		fontSize: 28,
		fontWeight: '800',
		color: colors.primary,
		lineHeight: 32,
	},
	subtitle: {
		color: colors.muted,
		fontSize: 14,
		lineHeight: 20,
	},
	card: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 16,
		padding: 20,
		gap: 16,
		shadowColor: '#000',
		shadowOpacity: 0.06,
		shadowOffset: {width: 0, height: 10},
		shadowRadius: 18,
		elevation: 4,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 12,
	},
	cardHeaderText: {
		flex: 1,
		minWidth: 0,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	cardSubtitle: {
		color: colors.muted,
		marginTop: 4,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: colors.badgeBackground,
		flexShrink: 0,
	},
	badgeText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.primary,
	},
	form: {
		gap: 14,
	},
	submitButton: {
		marginTop: 6,
	},
	helperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
		paddingHorizontal: 4,
	},
	helperRowCompact: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 4,
	},
	helperLink: {
		color: colors.primary,
		fontWeight: '700',
		flexShrink: 1,
	},
	helperMuted: {
		color: colors.muted,
		flexShrink: 1,
	},
	dot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border,
	},
	footer: {
		marginTop: 'auto',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		borderRadius: 14,
		backgroundColor: colors.surface,
		gap: 4,
		alignItems: 'center',
	},
	footerTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: colors.primary,
	},
	footerText: {
		color: colors.text,
		fontSize: 12,
	},
	footerNote: {
		color: colors.muted,
		fontSize: 12,
	},
	decorativeBubble: {
		position: 'absolute',
		top: -80,
		right: -60,
		width: 220,
		height: 220,
		borderRadius: 120,
		backgroundColor: '#36d1dc22',
		transform: [{rotate: '10deg'}],
	},
});
