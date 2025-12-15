import {StyleSheet, Text} from 'react-native';
import colors from 'theme/colors';
import {SafeAreaView} from 'react-native-safe-area-context';
import Button from 'components/Button/Button';
import {useAuthStore} from "store/authStore";

const Profile = () => {
	const {logout} = useAuthStore();

	const handleLogout = () => {
		logout();
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<Text style={styles.title}>Profile</Text>
			<Button
				title="Wyloguj"
				onPress={handleLogout}
				variant="outline"
				style={styles.logoutButton}
			/>
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
	logoutButton: {
		marginTop: 12,
		minWidth: 180,
	},
});
