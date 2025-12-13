import {StatusBar} from 'expo-status-bar';
import {Redirect, Stack} from 'expo-router';
import {StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import {isAuthenticated} from 'constants/auth';

const RootLayout = () => {
	const initialRouteName = isAuthenticated ? '(tabs)' : '(auth)';

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
				</Stack.Protected>
			</Stack>
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
});
