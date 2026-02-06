import {Redirect, router} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {Pressable, StyleSheet, View} from 'react-native';
import AuthScreenLayout from 'components/Auth/AuthScreenLayout';
import Text from 'components/Text/Text';
import {useAuthStore} from 'store/authStore';
import colors from 'theme/colors';

const AUTH_ROUTES = {
	password: '/(auth)/login-password',
	accessCode: '/(auth)/access-code',
};

const METHODS = [
	{
		key: 'password',
		title: 'Login i hasło',
		subtitle: 'Klasyczne logowanie do konta',
		icon: 'user',
		route: AUTH_ROUTES.password,
	},
	{
		key: 'accessCode',
		title: 'Kod dostępu',
		subtitle: 'Szybkie logowanie kodem',
		icon: 'hash',
		route: AUTH_ROUTES.accessCode,
	},
];

const LoginMethodButton = ({title, subtitle, icon, onPress}) => (
	<Pressable onPress={onPress} style={({pressed}) => [styles.methodButton, pressed ? styles.methodButtonPressed : null]}>
		<View style={styles.iconWrapper}>
			<Feather name={icon} size={18} color={colors.primary} />
		</View>
		<View style={styles.methodCopy}>
			<Text style={styles.methodTitle}>{title}</Text>
			<Text style={styles.methodSubtitle}>{subtitle}</Text>
		</View>
		<Feather name="chevron-right" size={18} color={colors.muted} />
	</Pressable>
);

const Login = () => {
	const {isAuthenticated} = useAuthStore();

	if (isAuthenticated) {
		return <Redirect href="/(tabs)" />;
	}

	return (
		<AuthScreenLayout
			title="Zaloguj się"
			subtitle="Wybierz metodę logowania"
			centerCard
			cardStyle={styles.methodsCard}
		>
			<View style={styles.filler}>
				<Feather name="shield" size={14} color={colors.primary} />
				<Text style={styles.fillerText}>Bezpieczne logowanie</Text>
			</View>
			{METHODS.map((method) => (
				<LoginMethodButton
					key={method.key}
					title={method.title}
					subtitle={method.subtitle}
					icon={method.icon}
					onPress={() => router.push(method.route)}
				/>
			))}
		</AuthScreenLayout>
	);
};

export default Login;

const styles = StyleSheet.create({
	methodsCard: {
		backgroundColor: 'transparent',
		borderWidth: 0,
		padding: 0,
		shadowOpacity: 0,
		shadowRadius: 0,
		elevation: 0,
	},
	methodButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 13,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		backgroundColor: '#f9fbff',
	},
	methodButtonPressed: {
		opacity: 0.85,
	},
	iconWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e8efff',
	},
	methodCopy: {
		flex: 1,
		gap: 2,
	},
	methodTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.text,
	},
	methodSubtitle: {
		fontSize: 13,
		color: colors.muted,
	},
	filler: {
		marginTop: 2,
		marginBottom: 6,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		backgroundColor: '#ffffffb3',
	},
	fillerText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.primary,
	},
});
