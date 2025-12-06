import {Stack} from 'expo-router';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const Layout = () => {
	return (
		<View style={styles.container}>
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: {backgroundColor: '#f4f6fb'},
				}}
			/>
			<SafeAreaView style={styles.footerWrapper}>
				<View style={styles.footer}>
					<Text style={styles.footerTitle}>Kaizen</Text>
					<Text style={styles.footerText}>Improving together • v1.0</Text>
				</View>
			</SafeAreaView>
		</View>
	);
};

export default Layout;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f4f6fb',
	},
	footerWrapper: {
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#e1e6ed',
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
		color: '#1d2b64',
	},
	footerText: {
		fontSize: 12,
		color: '#6c7a92',
		marginTop: 2,
	},
});
