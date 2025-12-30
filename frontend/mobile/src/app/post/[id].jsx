import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {
	Animated,
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
	Image,
	Dimensions,
	useWindowDimensions,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';

import postsService from 'src/server/services/postsService';
import commentsService from 'src/server/services/commentsService';
import {useAuthStore} from 'store/authStore';
import colors from 'theme/colors';
import {navigateBack} from 'utils/navigation';
import {getJwtPayload} from 'utils/jwt';
import CommentsList from 'components/Comments/CommentsList';
import CommentInput from 'components/Comments/CommentInput';
import TextBase from 'components/Text/Text';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_LOAD_POST, FAILED_TO_LOAD_COMMENTS} from 'constants/constans';
import {getPostStatusMeta} from 'utils/postStatus';
import ImageCarousel from 'components/PostDetail/ImageCarousel';
import Button from 'components/Button/Button';
import BackButton from 'components/Navigation/BackButton';
import Toast from 'react-native-toast-message';

const CATEGORY_STYLES = {
	BHP: {backgroundColor: '#E6F6FF', color: '#0F5F7F'},
	PROCES: {backgroundColor: '#E9F7EF', color: '#2E7D32'},
	'USPRAWNIENIE PROCESU': {backgroundColor: '#E9F7EF', color: '#2E7D32'},
	JAKOSC: {backgroundColor: '#FFF3E0', color: '#C16A00'},
	'JAKOŚĆ': {backgroundColor: '#FFF3E0', color: '#C16A00'},
	INNE: {backgroundColor: '#F2F4F8', color: '#4A5568'},
};

const resolveCategoryStyle = (value) => {
	if (!value) return CATEGORY_STYLES.INNE;
	const normalized = String(value).toUpperCase();
	return CATEGORY_STYLES[normalized] || CATEGORY_STYLES.INNE;
};

const COMMENTS_PREVIEW_COUNT = 2;

export default function PostDetails() {
	const router = useRouter();
	const {id: resolvedId, backTo, commentId} = useLocalSearchParams();
	const resolvedCommentId = Array.isArray(commentId) ? commentId[0] : commentId;
	const scrollRef = useRef(null);
	const processedCommentIdRef = useRef(null);
	const highlightTimeoutRef = useRef(null);
	const contentReadyTimeoutRef = useRef(null);
	const contentSizeRef = useRef({width: 0, height: 0});
	const {width: windowWidth} = useWindowDimensions();
	// Explicit screen width keeps carousel pages perfectly aligned.
	const screenWidth = Dimensions.get('window').width;
	const screenHeight = Dimensions.get('window').height;
	const contentWidth = windowWidth - 32;
	const [commentsLayoutY, setCommentsLayoutY] = useState(null);
	const [post, setPost] = useState(null);
	const [comments, setComments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);
	const [commentsLoaded, setCommentsLoaded] = useState(false);
	const [contentReady, setContentReady] = useState(false);
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
	const [showAllComments, setShowAllComments] = useState(false);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [commentOffsets, setCommentOffsets] = useState({});
	const [highlightCommentId, setHighlightCommentId] = useState(null);
	const likeScale = useRef(new Animated.Value(1)).current;
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
		const backTarget = Array.isArray(backTo) ? backTo[0] : backTo;
		if (backTarget === 'home') {
			router.replace('/');
			return;
		}
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
						Toast.show({
							type: 'success',
							text1: 'Post został poprawnie usunięty',
							visibilityTime: 2000,
						});
						router.replace('/');
					} catch (err) {
						Toast.show({
							type: 'error',
							text1: 'Nie udało się usunąć posta',
							text2: err?.message || 'Spróbuj ponownie',
							visibilityTime: 2500,
						});
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
		setContentReady(false);
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
		setCommentsLoaded(false);
		setContentReady(false);
		try {
			const data = await postsService.fetchComments(targetId);
			setComments(data || []);
		} catch (err) {
			console.warn(FAILED_TO_LOAD_COMMENTS, err);
		} finally {
			setCommentsLoaded(true);
		}
	};

	useEffect(() => {
		if (!resolvedId) return;
		processedCommentIdRef.current = null;
		setCommentsLoaded(false);
		setContentReady(false);
		void fetchPost(resolvedId);
		void fetchComments(resolvedId);
	}, [resolvedId]);

	const maybeExpandCommentsForTarget = useCallback((targetId) => {
		if (!targetId) return;
		if (comments.length > 3) {
			if (!showAllComments) setShowAllComments(true);
			return;
		}
		const sorted = [...comments].sort((a, b) => new Date(b?.created_at) - new Date(a?.created_at));
		const targetIndex = sorted.findIndex((comment) => String(comment?.id) === targetId);
		if (targetIndex >= COMMENTS_PREVIEW_COUNT && !showAllComments) {
			setShowAllComments(true);
		}
	}, [comments, showAllComments]);

	const maybeScrollToTargetComment = useCallback((targetId) => {
		if (!targetId || commentsLayoutY === null) return false;
		const offset = commentOffsets[targetId];
		if (typeof offset !== 'number' || !scrollRef.current) return false;
		const targetY = Math.max(0, commentsLayoutY + offset - 12);
		requestAnimationFrame(() => {
			scrollRef.current?.scrollTo({y: targetY, animated: true});
		});
		return true;
	}, [commentOffsets, commentsLayoutY]);

	const triggerCommentHighlight = useCallback((targetId) => {
		setHighlightCommentId(targetId);
		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}
		highlightTimeoutRef.current = setTimeout(() => {
			setHighlightCommentId((current) => (current === targetId ? null : current));
		}, 1500);
	}, []);

	const handleCommentDeepLink = useCallback(() => {
		if (!resolvedCommentId) return;
		if (loading || !commentsLoaded || !contentReady) return;
		const targetId = String(resolvedCommentId);
		if (processedCommentIdRef.current === targetId) return;
		maybeExpandCommentsForTarget(targetId);
		const didScroll = maybeScrollToTargetComment(targetId);
		if (!didScroll) return;
		processedCommentIdRef.current = targetId;
		triggerCommentHighlight(targetId);
	}, [
		commentsLoaded,
		contentReady,
		loading,
		maybeExpandCommentsForTarget,
		maybeScrollToTargetComment,
		resolvedCommentId,
		triggerCommentHighlight,
	]);

	useEffect(() => {
		handleCommentDeepLink();
	}, [handleCommentDeepLink]);

	useEffect(() => () => {
		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}
		if (contentReadyTimeoutRef.current) {
			clearTimeout(contentReadyTimeoutRef.current);
		}
	}, []);

	const handleCommentLayout = useCallback((commentKey, layoutY) => {
		const key = String(commentKey);
		setCommentOffsets((prev) => {
			if (prev[key] === layoutY) return prev;
			return {...prev, [key]: layoutY};
		});
	}, []);

	const handleContentSizeChange = useCallback((width, height) => {
		const previous = contentSizeRef.current;
		if (previous.width === width && previous.height === height) {
			return;
		}
		contentSizeRef.current = {width, height};
		setContentReady(false);
		if (contentReadyTimeoutRef.current) {
			clearTimeout(contentReadyTimeoutRef.current);
		}
		contentReadyTimeoutRef.current = setTimeout(() => {
			setContentReady(true);
		}, 160);
	}, []);

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
		likeScale.setValue(1);
		Animated.sequence([
			Animated.spring(likeScale, {toValue: 1.08, useNativeDriver: true, speed: 30, bounciness: 6}),
			Animated.spring(likeScale, {toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6}),
		]).start();
		setLiking(true);
		const nextLiked = !isLiked;
		setIsLiked(nextLiked);
		setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
		try {
			const response = await postsService.toggleLike(resolvedId);
			const nextServerLiked = response?.is_liked_by_me;
			const nextServerCount = response?.likes_count;
			if (typeof nextServerLiked === 'boolean') {
				setIsLiked(nextServerLiked);
			}
			if (typeof nextServerCount === 'number') {
				setLikesCount(nextServerCount);
			}
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

	const handleToggleComments = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowAllComments((prev) => !prev);
	};

	const closePreview = () => setPreviewVisible(false);
	const openPreview = (index) => {
		setPreviewIndex(index);
		setPreviewVisible(true);
	};

	const scrollToComments = useCallback(() => {
		if (!scrollRef.current || commentsLayoutY === null) return;
		scrollRef.current.scrollTo({y: commentsLayoutY, animated: true});
	}, [commentsLayoutY]);

	const statusMeta = getPostStatusMeta(post?.status);
	const authorFullName = [post?.author?.first_name, post?.author?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();
	const authorName = authorFullName || post?.author?.nickname || post?.author?.username || 'Użytkownik';
	const categoryLabel = post?.category_name
		?? post?.category?.name
		?? (typeof post?.category === 'string' ? post.category : null);
	const categoryStyle = resolveCategoryStyle(categoryLabel);
	const imageUrls = Array.isArray(post?.image_urls) ? post.image_urls.filter(Boolean) : [];
	const formattedDate = post?.created_at
		? new Date(post.created_at).toLocaleDateString('pl-PL', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
		: '—';
	const survey = post?.survey;
	const hasSurvey = Boolean(survey);
	const surveyHours = Number(survey?.estimated_time_savings_hours ?? 0);
	const surveySavings = Number(survey?.estimated_financial_savings ?? 0);
	const surveyHoursLabel = Number.isFinite(surveyHours) ? surveyHours.toFixed(2) : '0.00';
	const surveySavingsLabel = Number.isFinite(surveySavings)
		? surveySavings.toLocaleString('pl-PL', {minimumFractionDigits: 2, maximumFractionDigits: 2})
		: '0.00';
	const sortedComments = useMemo(
		() =>
			[...comments].sort((a, b) => new Date(b?.created_at) - new Date(a?.created_at)),
		[comments]
	);
	const visibleComments = showAllComments
		? sortedComments
		: sortedComments.slice(0, COMMENTS_PREVIEW_COUNT);

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Post details',
					headerShown: true,
					headerTitleAlign: 'center',
					headerLeft: () => (
						<BackButton onPress={handleBack} />
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
				ref={scrollRef}
				contentContainerStyle={styles.container}
				onContentSizeChange={handleContentSizeChange}
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
						{/* Header section */}
						<View style={styles.headerSection}>
							<View style={styles.headerTopRow}>
								<View style={styles.badgesRow}>
									<TextBase style={[styles.categoryBadge, categoryStyle]}>
										{categoryLabel || 'Zgłoszenie'}
									</TextBase>
									<TextBase
										style={[
											styles.statusBadge,
											{color: statusMeta.color, backgroundColor: statusMeta.backgroundColor},
										]}
									>
										{statusMeta.label}
									</TextBase>
									{post?.id ? <TextBase style={styles.postId}>#{post.id}</TextBase> : null}
								</View>
								<View style={styles.metaRow}>
									<TextBase style={styles.authorName}>{authorName}</TextBase>
									<TextBase style={styles.metaSeparator}>•</TextBase>
									<TextBase style={styles.metaText}>{formattedDate}</TextBase>
								</View>
							</View>
							<TextBase style={styles.postTitle}>{post?.title || 'Bez tytułu'}</TextBase>
						</View>

						{/* Description section */}
						<View style= {[styles.section, styles.descriptionSection]}>
							<TextBase style={styles.descriptionText}>
								{post?.content || 'Brak treści.'}
							</TextBase>
						</View>

						{/* Attachments section */}
						<View style={styles.section}>
							<TextBase style={styles.sectionTitle}>Załączniki</TextBase>
							{imageUrls.length === 1 ? (
								<Pressable style={styles.imageWrapper} onPress={() => openPreview(0)}>
									<Image source={{uri: imageUrls[0]}} style={styles.image} resizeMode="cover" />
								</Pressable>
							) : imageUrls.length > 1 ? (
								<ImageCarousel
									images={imageUrls}
									width={contentWidth}
									height={240}
									onImagePress={openPreview}
									showDots
								/>
							) : (
								<TextBase style={styles.placeholderText}>Brak załączników.</TextBase>
							)}
						</View>

						{/* Survey results section */}
						{hasSurvey ? (
							<View style={styles.section}>
								<TextBase style={styles.sectionTitle}>Przewidywane usprawnienia</TextBase>
								<View style={styles.surveyCard}>
									<TextBase style={styles.surveyLabel}>Szacowany czas oszczędności</TextBase>
									<TextBase style={styles.surveyValue}>{surveyHoursLabel} h</TextBase>
								</View>
								<View style={styles.surveyCard}>
									<TextBase style={styles.surveyLabel}>Szacowane oszczędności finansowe</TextBase>
									<TextBase style={styles.surveyValue}>{surveySavingsLabel} PLN</TextBase>
								</View>
							</View>
						) : isOwner ? (
							<View style={styles.section}>
								<TextBase style={styles.sectionTitle}>Przewidywane usprawnienia</TextBase>
								<TextBase style={styles.placeholderText}>
									Dodaj ankietę, aby oszacować korzyści z usprawnienia.
								</TextBase>
								<Button
									title="Uzupełnij ankietę"
									onPress={() => router.push(`/post/${resolvedId}/survey`)}
									style={styles.surveyCta}
								/>
							</View>
						) : null}

						{/* Actions section (single source of interaction counts) */}
						<View style={styles.section}>
							<View style={styles.actionsRow}>
								<Animated.View style={[styles.actionButtonWrapper, {transform: [{scale: likeScale}]}]}>
									<Pressable
										onPress={handleToggleLike}
										disabled={liking || loading}
										style={({pressed}) => [
											styles.actionButton,
											isLiked ? styles.actionButtonActive : null,
											pressed && !(liking || loading) ? styles.actionButtonPressed : null,
										]}
									>
										<Feather name="thumbs-up" size={16} color={isLiked ? '#fff' : colors.primary} />
										<TextBase style={[styles.actionButtonText, isLiked ? styles.actionButtonTextActive : null]}>
											Mam to samo
										</TextBase>
										<TextBase style={[styles.actionCount, isLiked ? styles.actionButtonTextActive : null]}>
											{likesCount}
										</TextBase>
									</Pressable>
								</Animated.View>
								<Pressable style={styles.actionButton} onPress={scrollToComments}>
									<Feather name="message-circle" size={16} color={colors.primary} />
									<TextBase style={styles.actionButtonText}>Komentarze</TextBase>
									<TextBase style={styles.actionCount}>{comments.length}</TextBase>
								</Pressable>
							</View>
						</View>

						{/* Comments section */}
						<View
							style={styles.section}
							onLayout={(event) => setCommentsLayoutY(event.nativeEvent.layout.y)}
						>
							<View style={styles.sectionHeader}>
								<TextBase style={styles.sectionTitle}>Komentarze</TextBase>
								{comments.length > COMMENTS_PREVIEW_COUNT ? (
									<Pressable onPress={handleToggleComments}>
										<TextBase style={styles.showAllText}>
											{showAllComments
												? 'Pokaż mniej'
												: `Pokaż wszystkie komentarze (${comments.length})`}
										</TextBase>
									</Pressable>
								) : null}
							</View>
							<CommentsList
								comments={visibleComments}
								currentUserId={currentUserId}
								onUpdate={handleUpdateComment}
								onDelete={handleDeleteComment}
								updatingId={updatingCommentId}
								deletingId={deletingCommentId}
								onCommentLayout={handleCommentLayout}
								highlightedCommentId={highlightCommentId}
							/>
						</View>
						<View style={styles.commentInputSection}>
							<CommentInput
								value={commentValue}
								onChangeText={setCommentValue}
								onSubmit={handleSubmitComment}
								loading={submittingComment}
								error={commentError}
							/>
						</View>
					</>
				)}
			</ScrollView>
			<Modal
				transparent
				visible={previewVisible}
				animationType="fade"
				onRequestClose={closePreview}
			>
				<View style={styles.previewOverlay}>
					<Pressable style={styles.previewBackdrop} onPress={closePreview} />
					<View style={styles.previewCard}>
						<ImageCarousel
							images={imageUrls}
							width={screenWidth}
							height={Math.min(520, screenHeight * 0.78)}
							initialIndex={previewIndex}
							showDots={false}
							showCounter
							imageResizeMode="contain"
							containerStyle={styles.previewCarousel}
						/>
					</View>
				</View>
			</Modal>
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
		backgroundColor: colors.surface,
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
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 4,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	headerSection: {
		gap: 8,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	headerTopRow: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 8,
	},
	badgesRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		alignItems: 'center',
	},
	categoryBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		textTransform: 'uppercase',
	},
	statusBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
	},
	postId: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
	},
	postTitle: {
		fontSize: 22,
		fontWeight: '700',
		color: colors.text,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	authorName: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	metaSeparator: {
		color: colors.muted,
	},
	metaText: {
		fontSize: 13,
		color: colors.muted,
	},
	section: {
		paddingVertical: 12,
		gap: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	descriptionSection: {
		paddingTop: 0,
	},
	descriptionText: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.text,
	},
	placeholderText: {
		color: colors.muted,
		fontSize: 13,
	},
	imageWrapper: {
		width: '100%',
		height: 240,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: colors.placeholderSurface,
	},
	image: {
		width: '100%',
		height: '100%',
	},
	previewOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		alignItems: 'stretch',
		justifyContent: 'center',
	},
	previewBackdrop: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	},
	previewCard: {
		width: '100%',
	},
	previewCarousel: {
		borderRadius: 0,
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.placeholderSurface,
	},
	actionButtonWrapper: {
		alignSelf: 'flex-start',
	},
	actionButtonActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	actionButtonPressed: {
		opacity: 0.75,
	},
	actionButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
	actionCount: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
	},
	actionButtonTextActive: {
		color: '#fff',
	},
	showAllText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
	surveyCard: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		padding: 14,
		backgroundColor: colors.surface,
		gap: 6,
	},
	surveyLabel: {
		color: colors.muted,
		fontSize: 13,
	},
	surveyValue: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	surveyCta: {
		alignSelf: 'flex-start',
		marginTop: 6,
	},
	commentInputSection: {
		paddingTop: 8,
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
