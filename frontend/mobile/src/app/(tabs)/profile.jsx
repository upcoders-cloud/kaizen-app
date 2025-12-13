import {SafeAreaView, StyleSheet, Text} from 'react-native';
import colors from 'theme/colors';

const Profile = () => {
	return (
		<SafeAreaView style={styles.safeArea}>
			<Text style={styles.title}>Profile</Text>
		</SafeAreaView>
	);
};

export default Profile;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: colors.primary,
	},
});
