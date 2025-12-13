import {Redirect} from 'expo-router';
import {StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';
import {isAuthenticated} from 'constants/auth';

const Login = () => {
	if (isAuthenticated) {
		return <Redirect href="/(tabs)" />;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Login Page</Text>
		</View>
	);
};

export default Login;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.background,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.primary,
	},
});
