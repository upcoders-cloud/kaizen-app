import {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';

import CreatePost from 'components/CreatePost/CreatePost';
import postsService from 'src/server/services/postsService';
import colors from 'theme/colors';
import {navigateBack} from 'utils/navigation';
import {useAuthStore} from 'store/authStore';
import {getJwtPayload} from 'utils/jwt';
import BackButton from 'components/Navigation/BackButton';

const EditPostRoute = () => {
	const router = useRouter();
	const {id: resolvedId} = useLocalSearchParams();
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);
	const [post, setPost] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const handleBack = () => navigateBack(router, `/post/${resolvedId}`);

	useEffect(() => {
		if (!resolvedId) return;
		const fetchPost = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await postsService.get(resolvedId);
				setPost(data);
			} catch (err) {
				setError(err?.message || 'Nie udało się pobrać posta');
			} finally {
				setLoading(false);
			}
		};
		void fetchPost();
	}, [resolvedId]);

	const isOwner = post?.author?.id && String(post.author.id) === String(currentUserId);
	const initialValues = useMemo(() => ({
		title: post?.title ?? '',
		content: post?.content ?? '',
		category: post?.category ?? 'BHP',
	}), [post?.title, post?.content, post?.category]);

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Edycja zgłoszenia',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
					headerLeft: () => <BackButton onPress={handleBack} />,
				}}
			/>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.decorativeBubbleLarge} pointerEvents="none" />
				{loading ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={styles.muted}>Ładowanie posta...</Text>
					</View>
				) : error ? (
					<View style={styles.centered}>
						<Text style={styles.error}>{error}</Text>
					</View>
				) : !isOwner ? (
					<View style={styles.centered}>
						<Text style={styles.error}>Nie masz uprawnień do edycji tego posta.</Text>
					</View>
				) : (
					<CreatePost
						mode="edit"
						postId={resolvedId}
						initialValues={initialValues}
						submitLabel="Zapisz zmiany"
						onSubmitSuccess={handleBack}
					/>
				)}
			</SafeAreaView>
		</>
	);
};

export default EditPostRoute;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
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
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		padding: 24,
	},
	error: {
		color: colors.danger,
		fontWeight: '700',
		textAlign: 'center',
	},
	muted: {
		color: colors.muted,
		textAlign: 'center',
	},
});
