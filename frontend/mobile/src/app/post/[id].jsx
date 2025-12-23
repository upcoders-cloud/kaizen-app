import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {
	ScrollView,
	Pressable,
	Text,
	StyleSheet,
	View,
	RefreshControl,
	ActivityIndicator,
	LayoutAnimation,
	Platform,
	UIManager,
	Modal,
	Alert,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';

import postsService from 'src/server/services/postsService';
import commentsService from 'src/server/services/commentsService';
import {useAuthStore} from 'store/authStore';
import colors from 'theme/colors';
import {navigateBack} from 'utils/navigation';
import {getJwtPayload} from 'utils/jwt';
import PostHeader from 'components/PostDetail/PostHeader';
import PostContent from 'components/PostDetail/PostContent';
import PostActions from 'components/PostDetail/PostActions';
import CommentsList from 'components/Comments/CommentsList';
import CommentInput from 'components/Comments/CommentInput';
import TextBase from 'components/Text/Text';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_LOAD_POST, FAILED_TO_LOAD_COMMENTS} from 'constants/constans';

export default function PostDetails() {
	const router = useRouter();
	const {id: resolvedId} = useLocalSearchParams();
	const [post, setPost] = useState(null);
	const [comments, setComments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);
	const [liking, setLiking] = useState(false);
	const [commentValue, setCommentValue] = useState('');
	const [commentError, setCommentError] = useState(null);
	const [submittingComment, setSubmittingComment] = useState(false);
	const [likesCount, setLikesCount] = useState(0);
	const [isLiked, setIsLiked] = useState(false);
	const [updatingCommentId, setUpdatingCommentId] = useState(null);
	const [deletingCommentId, setDeletingCommentId] = useState(null);
	const [menuVisible, setMenuVisible] = useState(false);
	const [deletingPost, setDeletingPost] = useState(false);
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);
	const isOwner = post?.author?.id && String(post.author.id) === String(currentUserId);

	useEffect(() => {
		if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
			UIManager.setLayoutAnimationEnabledExperimental(true);
		}
	}, []);

	const handleBack = () => {
		navigateBack(router, '/');
	};

	const handleOpenMenu = () => setMenuVisible(true);
	const handleCloseMenu = () => setMenuVisible(false);

	const handleEditPost = () => {
		handleCloseMenu();
		if (!resolvedId) return;
		router.push(`/post/${resolvedId}/edit`);
	};

	const handleDeletePost = () => {
		handleCloseMenu();
		if (!resolvedId || deletingPost) return;
		Alert.alert('Usuń post', 'Na pewno usunąć ten post?', [
			{text: 'Anuluj', style: 'cancel'},
			{
				text: 'Usuń',
				style: 'destructive',
				onPress: async () => {
					setDeletingPost(true);
					try {
						await postsService.remove(resolvedId);
						router.replace('/');
					} finally {
						setDeletingPost(false);
					}
				},
			},
		]);
	};

	const fetchPost = async (targetId, {withLoader = true} = {}) => {
		if (!targetId) return;
		if (withLoader) setLoading(true);
		setError(null);
		try {
			const data = await postsService.get(targetId);
			setPost(data);
			setLikesCount(data?.likes_count ?? data?.likes?.length ?? 0);
			setIsLiked(Boolean(data?.is_liked_by_me));
		} catch (err) {
			setError(err?.message || FAILED_TO_LOAD_POST);
		} finally {
			if (withLoader) setLoading(false);
		}
	};

	const fetchComments = async (targetId) => {
		if (!targetId) return;
		try {
			const data = await postsService.fetchComments(targetId);
			setComments(data || []);
		} catch (err) {
			console.warn(FAILED_TO_LOAD_COMMENTS, err);
		}
	};

	useEffect(() => {
		if (!resolvedId) return;
		void fetchPost(resolvedId);
		void fetchComments(resolvedId);
	}, [resolvedId]);

	useFocusEffect(
		useCallback(() => {
			if (!resolvedId) return;
			void fetchPost(resolvedId, {withLoader: false});
		}, [resolvedId])
	);

	const handleRefresh = async () => {
		if (!resolvedId) return;
		setRefreshing(true);
		await Promise.all([
			fetchPost(resolvedId, {withLoader: false}),
			fetchComments(resolvedId),
		]).finally(() => setRefreshing(false));
	};

	const handleToggleLike = async () => {
		if (!resolvedId || liking) return;
		setLiking(true);
		const nextLiked = !isLiked;
		setIsLiked(nextLiked);
		setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
		try {
			await postsService.toggleLike(resolvedId);
		} catch (err) {
			setIsLiked(!nextLiked);
			setLikesCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
			console.warn('Failed to toggle like', err);
		} finally {
			setLiking(false);
		}
	};

	const handleSubmitComment = async () => {
		const text = commentValue.trim();
		if (!text) {
			setCommentError(CONTENT_IS_REQUIRED);
			return;
		}
		setCommentError(null);
		setSubmittingComment(true);
		try {
			const newComment = await postsService.addComment(resolvedId, {text});
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setComments((prev) => [newComment, ...prev]);
			setCommentValue(EMPTY_STRING);
		} catch (err) {
			setCommentError(err?.message || 'Nie udało się dodać komentarza');
		} finally {
			setSubmittingComment(false);
		}
	};

	const handleUpdateComment = async (commentId, text) => {
		if (!commentId) {
			return {success: false, error: 'Brak komentarza do edycji'};
		}
		setUpdatingCommentId(commentId);
		try {
			const updated = await commentsService.update(commentId, {text});
			setComments((prev) =>
				prev.map((comment) => (comment.id === commentId ? updated : comment))
			);
			return {success: true, data: updated};
		} catch (err) {
			return {success: false, error: err?.message || 'Nie udało się zaktualizować komentarza'};
		} finally {
			setUpdatingCommentId(null);
		}
	};

	const handleDeleteComment = async (commentId) => {
		if (!commentId) {
			return {success: false, error: 'Brak komentarza do usunięcia'};
		}
		setDeletingCommentId(commentId);
		try {
			await commentsService.remove(commentId);
			setComments((prev) => prev.filter((comment) => comment.id !== commentId));
			return {success: true};
		} catch (err) {
			return {success: false, error: err?.message || 'Nie udało się usunąć komentarza'};
		} finally {
			setDeletingCommentId(null);
		}
	};

	const likesLabel = likesCount === 1 ? 'polubienie' : 'polubienia';

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Post details',
					headerShown: true,
					headerTitleAlign: 'center',
					headerLeft: () => (
						<Pressable onPress={handleBack} style={styles.backButton}>
							<Feather name="arrow-left" size={18} color={colors.primary} />
							<Text style={styles.backText}>Back</Text>
						</Pressable>
					),
					headerRight: () =>
						isOwner ? (
							<Pressable onPress={handleOpenMenu} style={styles.menuButton}>
								<Text style={styles.menuLabel}>Więcej</Text>
								<Feather name="more-vertical" size={18} color={colors.primary} />
							</Pressable>
						) : null,
				}}
			/>
			<ScrollView
				contentContainerStyle={styles.container}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
				}
			>
				{error ? (
					<View style={styles.centered}>
						<Text style={styles.error}>{typeof error === 'string' ? error : error?.message}</Text>
						<Text style={styles.muted}>Przeciągnij w dół aby spróbować ponownie.</Text>
					</View>
				) : loading && !refreshing && !post ? (
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={styles.muted}>Ładowanie posta...</Text>
					</View>
				) : (
					<>
						<PostHeader post={post} />
						<PostContent content={post?.content} images={post?.image_urls} />
						<PostActions
							likes={likesCount}
							comments={comments.length}
							isLiked={isLiked}
							onLikePress={handleToggleLike}
							disabled={liking || loading}
						/>
						<View style={styles.sectionHeader}>
							<TextBase style={styles.sectionTitle}>Komentarze</TextBase>
							<TextBase style={styles.sectionSubtitle}>
								{likesCount} {likesLabel} • {comments.length} komentarzy
							</TextBase>
						</View>
						<CommentsList
							comments={comments}
							currentUserId={currentUserId}
							onUpdate={handleUpdateComment}
							onDelete={handleDeleteComment}
							updatingId={updatingCommentId}
							deletingId={deletingCommentId}
						/>
						<CommentInput
							value={commentValue}
							onChangeText={setCommentValue}
							onSubmit={handleSubmitComment}
							loading={submittingComment}
							error={commentError}
						/>
					</>
				)}
			</ScrollView>
			<Modal transparent visible={menuVisible} animationType="fade" onRequestClose={handleCloseMenu}>
				<Pressable style={styles.menuOverlay} onPress={handleCloseMenu}>
					<Pressable style={styles.menuCard} onPress={(event) => event.stopPropagation()}>
						<Pressable style={styles.menuItem} onPress={handleEditPost}>
							<Feather name="edit-2" size={16} color={colors.primary} />
							<Text style={styles.menuText}>Edytuj</Text>
						</Pressable>
						<Pressable style={styles.menuItem} onPress={handleDeletePost}>
							<Feather name="trash-2" size={16} color={colors.danger} />
							<Text style={[styles.menuText, styles.menuTextDanger]}>Usuń</Text>
						</Pressable>
					</Pressable>
				</Pressable>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 14,
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
	menuButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
	},
	menuLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		gap: 6,
		padding: 24,
	},
	error: {
		color: colors.danger,
		fontWeight: '700',
		fontSize: 16,
	},
	muted: {
		color: colors.muted,
		textAlign: 'center',
	},
	sectionHeader: {
		gap: 4,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	sectionSubtitle: {
		color: colors.muted,
	},
	menuOverlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 23, 42, 0.2)',
		justifyContent: 'flex-start',
		alignItems: 'flex-end',
		paddingTop: 56,
		paddingRight: 16,
	},
	menuCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		paddingVertical: 6,
		minWidth: 160,
		shadowColor: '#1d2b64',
		shadowOpacity: 0.14,
		shadowRadius: 14,
		shadowOffset: {width: 0, height: 8},
		elevation: 4,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	menuText: {
		fontSize: 15,
		fontWeight: '600',
		color: colors.text,
	},
	menuTextDanger: {
		color: colors.danger,
	},
});
