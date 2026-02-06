import {useState} from 'react';
import {Redirect, router} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {StyleSheet, View} from 'react-native';
import AuthScreenLayout from 'components/Auth/AuthScreenLayout';
import Button from 'components/Button/Button';
import Input from 'components/Input/Input';
import Text from 'components/Text/Text';
import {EMPTY_STRING, STRING} from 'constants/constans';
import {useAuthStore} from 'store/authStore';
import colors from 'theme/colors';

const AUTH_ROUTES = {
	selector: '/(auth)/login',
	accessCode: '/(auth)/access-code',
};

const LoginPassword = () => {
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
		<AuthScreenLayout
			title="Login i hasło"
			subtitle="Wpisz dane konta"
			onBackPress={() => router.replace(AUTH_ROUTES.selector)}
			footerAction={(
				<View style={styles.switchContainer}>
					<Text style={styles.switchHint}>Chcesz użyć innej metody?</Text>
					<Button
						title="Przejdź do kodu dostępu"
						variant="outline"
						onPress={() => router.replace(AUTH_ROUTES.accessCode)}
					/>
				</View>
			)}
		>
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
		</AuthScreenLayout>
	);
};

export default LoginPassword;

const styles = StyleSheet.create({
	submitButton: {
		marginTop: 6,
	},
	switchContainer: {
		gap: 8,
	},
	switchHint: {
		textAlign: 'center',
		color: colors.muted,
		fontSize: 13,
	},
});
