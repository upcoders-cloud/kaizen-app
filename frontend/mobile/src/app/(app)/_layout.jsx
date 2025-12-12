import {Stack} from 'expo-router';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import colors from 'theme/colors';

const Layout = () => {
	return (
			<View style={styles.container}>
				<Stack
					screenOptions={{
						headerShown: false,
						contentStyle: {backgroundColor: colors.background},
					}}
				/>
				<SafeAreaView style={styles.footerWrapper}>
					<View style={styles.footer}>
						<Text style={styles.footerTitle}>Kaizen</Text>
						<Text style={styles.footerText}>Improving together • v1.0</Text>
						<Text style={styles.footerSubText}>Crafted by Upcoders</Text>
					</View>
				</SafeAreaView>
			</View>
		);
	};

export default Layout;

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
		paddingVertical: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	footerTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: colors.primary,
	},
	footerText: {
		fontSize: 12,
		color: colors.muted,
		marginTop: 2,
	},
	footerSubText: {
		fontSize: 11,
		color: colors.mutedAlt,
		marginTop: 2,
	},
});
