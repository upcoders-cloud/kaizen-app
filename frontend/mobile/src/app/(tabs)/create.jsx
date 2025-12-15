import {Pressable, Text, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {Stack, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
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
					contentStyle: {backgroundColor: colors.background},
					headerLeft: () => (
						<Pressable onPress={handleBack} style={styles.backButton}>
							<Feather name="arrow-left" size={18} color={colors.primary} />
							<Text style={styles.backText}>Back</Text>
						</Pressable>
					),
				}}
			/>
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.decorativeBubbleLarge} pointerEvents="none" />
				<CreatePost
					onSubmitSuccess={() => {
						handleBack();
					}}
				/>
			</SafeAreaView>
		</>
	);
};

export default CreateRoute;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
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
	decorativeBubbleLarge: {
		position: 'absolute',
		bottom: -70,
		right: -50,
		width: 240,
		height: 240,
		borderRadius: 120,
		backgroundColor: '#36d1dc22',
		transform: [{rotate: '-6deg'}],
	},
});
