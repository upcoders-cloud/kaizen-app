import {Pressable, Text, StyleSheet} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {Stack, useRouter} from 'expo-router';
import CreatePost from 'components/CreatePost/CreatePost';
import colors from 'theme/colors';
import {navigateBack} from 'utils/navigation';

const CreateRoute = () => {
	const router = useRouter();
	const handleBack = () => navigateBack(router, '/');

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Create Post',
					headerShown: true,
					headerTitleAlign: 'center',
					headerLeft: () => (
						<Pressable onPress={handleBack} style={styles.backButton}>
							<Feather name="arrow-left" size={18} color={colors.primary} />
							<Text style={styles.backText}>Back</Text>
						</Pressable>
					),
				}}
			/>
			<CreatePost
				onSubmitSuccess={() => {
					handleBack();
				}}
			/>
		</>
	);
};

export default CreateRoute;

const styles = StyleSheet.create({
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
	},
	backText: {
		color: colors.primary,
		fontWeight: '600',
	},
});
