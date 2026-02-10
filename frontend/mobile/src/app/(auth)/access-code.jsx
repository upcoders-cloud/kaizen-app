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
import {formatAccessCodeInput, isAccessCodeFormatValid} from 'utils/accessCode';

const AUTH_ROUTES = {
	selector: '/(auth)/login',
	password: '/(auth)/login-password',
};

const AccessCode = () => {
	const [accessCode, setAccessCode] = useState(EMPTY_STRING);
	const [loading, setLoading] = useState(false);
	const [accessCodeError, setAccessCodeError] = useState(EMPTY_STRING);
	const {isAuthenticated, loginWithAccessCode, error: authError} = useAuthStore();

	if (isAuthenticated) {
		return <Redirect href="/(tabs)" />;
	}

	const handleCodeChange = (valueOrEvent) => {
		const rawValue = typeof valueOrEvent === STRING
			? valueOrEvent
			: valueOrEvent?.nativeEvent?.text || EMPTY_STRING;
		const formattedCode = formatAccessCodeInput(rawValue);
		setAccessCode(formattedCode);
		if (accessCodeError && isAccessCodeFormatValid(formattedCode)) {
			setAccessCodeError(EMPTY_STRING);
		}
	};

	const resolveLoginErrorMessage = (message) => {
		const normalized = String(message ?? EMPTY_STRING).toLowerCase();
		if (normalized.includes('invalid credentials')) {
			return 'Nieprawidłowy kod dostępu';
		}
		if (normalized.includes('too many requests') || normalized.includes('throttled')) {
			return 'Za dużo prób logowania. Spróbuj ponownie za chwilę.';
		}
		return message || 'Spróbuj ponownie';
	};

	const handleCodeLogin = async () => {
		if (!isAccessCodeFormatValid(accessCode)) {
			setAccessCodeError('Wpisz kod w formacie XXXX-XXXX.');
			return;
		}

		setAccessCodeError(EMPTY_STRING);
		setLoading(true);
		try {
			const result = await loginWithAccessCode(accessCode);
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
					text2: resolveLoginErrorMessage(result?.error || authError),
					visibilityTime: 2600,
				});
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Logowanie nieudane',
				text2: resolveLoginErrorMessage(error?.message),
				visibilityTime: 2600,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthScreenLayout
			title="Kod dostępu"
			subtitle="Wpisz kod otrzymany od administratora"
			onBackPress={() => router.replace(AUTH_ROUTES.selector)}
			footerNote="Tworzone i rozwijane przez Upcoders"
			footerAction={(
				<View style={styles.switchContainer}>
					<Text style={styles.switchHint}>Nie wiesz jak się zalogować?</Text>
					<Button
						title="Użyj loginu i hasła"
						variant="outline"
						onPress={() => router.replace(AUTH_ROUTES.password)}
					/>
				</View>
			)}
		>
			<Input
				label="Kod dostępu"
				placeholder="np. ABCD-1234"
				autoCapitalize="characters"
				autoCorrect={false}
				maxLength={9}
				value={accessCode}
				onChangeText={handleCodeChange}
				onChange={handleCodeChange}
				error={accessCodeError}
			/>
			<Text style={styles.helper}>Format kodu: XXXX-XXXX</Text>
			<Button
				title="Zaloguj kodem"
				onPress={handleCodeLogin}
				loading={loading}
				disabled={loading}
				leftIcon={<Feather name="key" size={16} color="#ffffff" />}
			/>
		</AuthScreenLayout>
	);
};

export default AccessCode;

const styles = StyleSheet.create({
	helper: {
		fontSize: 12,
		color: colors.muted,
		marginTop: -2,
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
