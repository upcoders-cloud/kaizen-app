import {StatusBar} from 'expo-status-bar';
import {Redirect, Stack} from 'expo-router';
import {ActivityIndicator, AppState, StyleSheet, View} from 'react-native';
import Toast from 'react-native-toast-message';
import colors from 'theme/colors';
import {useAuthStore} from "store/authStore";
import {useEffect, useState} from "react";

const RootLayout = () => {
	const {isAuthenticated, checkAuth} = useAuthStore();
	const initialRouteName = isAuthenticated ? '(tabs)' : '(auth)';
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		checkAuth();
		setIsLoading(false);

		const subscription = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') {
				checkAuth();
			}
		});

		return () => subscription.remove();
	}, [checkAuth]);

	if (isLoading) {
		return (
			<View style={styles.loaderContainer}>
				<ActivityIndicator size="large" />
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<StatusBar style='auto' />
			<Stack
				initialRouteName={initialRouteName}
				screenOptions={{
					headerShown: false,
					contentStyle: {backgroundColor: colors.background},
				}}
			>
				<Stack.Protected guard={!isAuthenticated} fallback={<Redirect href="/(tabs)" />}>
					<Stack.Screen name="(auth)" options={{headerShown: false}} />
				</Stack.Protected>
				<Stack.Protected guard={isAuthenticated} fallback={<Redirect href="/(auth)/login" />}>
					<Stack.Screen name="(tabs)" options={{headerShown: false}} />
					<Stack.Screen name="post/[id]" options={{headerShown: false}} />
					<Stack.Screen name="post/[id]/edit" options={{headerShown: false}} />
					<Stack.Screen name="post/[id]/survey" options={{headerShown: false}} />
					<Stack.Screen name="post/[id]/survey-results" options={{headerShown: false}} />
				</Stack.Protected>
			</Stack>
			<Toast
				topOffset={60}
				text1Style={{fontSize: 16}}
				text2Style={{fontSize: 14}}
			/>
		</View>
	);
};

export default RootLayout;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	footerWrapper: {
		backgroundColor: colors.surface,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	footer: {
		paddingHorizontal: 16,
		paddingVertical: 4,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.primary,
	},
	footerText: {
		fontSize: 10,
		color: colors.muted,
		marginTop: 2,
	},
	footerSubText: {
		fontSize: 9,
		color: colors.mutedAlt,
		marginTop: 2,
	},
	loaderContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	}
});
