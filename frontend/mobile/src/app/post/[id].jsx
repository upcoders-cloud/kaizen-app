import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {
	Animated,
	Pressable,
	Text,
	View,
	RefreshControl,
	ActivityIndicator,
	LayoutAnimation,
	Platform,
	UIManager,
	Alert,
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
import {buildCommentTree} from 'utils/commentTree';
import KeyboardAwareScrollView from 'components/KeyboardAwareScrollView/KeyboardAwareScrollView';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_LOAD_POST, FAILED_TO_LOAD_COMMENTS} from 'constants/constans';
import PostOverview from 'components/PostDetail/PostOverview';
import PostMediaSurvey from 'components/PostDetail/PostMediaSurvey';
import PostDiscussion from 'components/PostDetail/PostDiscussion';
import PostDetailModals from 'components/PostDetail/PostDetailModals';
import styles from 'components/PostDetail/detailStyles';
import BackButton from 'components/Navigation/BackButton';
import Toast from 'react-native-toast-message';

const CATEGORY_STYLES = {
	BHP: {backgroundColor: colors.infoSoft, color: colors.statusTextInProgress},
	PROCES: {backgroundColor: colors.successSoft, color: colors.success},
	'USPRAWNIENIE PROCESU': {backgroundColor: colors.successSoft, color: colors.success},
	JAKOSC: {backgroundColor: colors.warningSoft, color: colors.warning},
	'JAKOŚĆ': {backgroundColor: colors.warningSoft, color: colors.warning},
	INNE: {backgroundColor: colors.surfaceAlt, color: colors.textMuted},
};

const resolveCategoryStyle = (value) => {
	if (!value) return CATEGORY_STYLES.INNE;
	const normalized = String(value).toUpperCase();
	return CATEGORY_STYLES[normalized] || CATEGORY_STYLES.INNE;
};

const COMMENTS_PREVIEW_COUNT = 2;

export default function PostDetails() {
	const router = useRouter();
	const {id: resolvedId, backTo, commentId, scrollTo} = useLocalSearchParams();
	const resolvedCommentId = Array.isArray(commentId) ? commentId[0] : commentId;
	const resolvedScrollTo = Array.isArray(scrollTo) ? scrollTo[0] : scrollTo;
	const shouldScrollToComments = resolvedScrollTo === 'comments';
	const scrollRef = useRef(null);
	const processedCommentIdRef = useRef(null);
	const processedScrollToRef = useRef(false);
	const highlightTimeoutRef = useRef(null);
	const contentReadyTimeoutRef = useRef(null);
	const contentSizeRef = useRef({width: 0, height: 0});
	const {width: windowWidth} = useWindowDimensions();
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
	const [replyingTo, setReplyingTo] = useState(null);
	const [menuVisible, setMenuVisible] = useState(false);
	const [deletingPost, setDeletingPost] = useState(false);
	const [showAllComments, setShowAllComments] = useState(false);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [commentOffsets, setCommentOffsets] = useState({});
	const [highlightCommentId, setHighlightCommentId] = useState(null);
	const [approvingPost, setApprovingPost] = useState(false);
	const [rejectModalVisible, setRejectModalVisible] = useState(false);
	const [rejectLoading, setRejectLoading] = useState(false);
	const [progressModalVisible, setProgressModalVisible] = useState(false);
	const [progressSaving, setProgressSaving] = useState(false);
	const [approveModalVisible, setApproveModalVisible] = useState(false);
	const likeScale = useRef(new Animated.Value(1)).current;
	const accessToken = useAuthStore((state) => state.accessToken);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);
	const isOwner = post?.author?.id && String(post.author.id) === String(currentUserId);
	const canManageProgress = post?.can_update_progress === true;
	const currentStageApprover = post?.current_stage?.approver;
	const isCurrentStageApprover =
		currentStageApprover?.id && String(currentStageApprover.id) === String(currentUserId);

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

	const handleApproveDirector = async () => {
		// Akceptacja dyrektora - bez dodatkowych pól.
		if (!resolvedId || approvingPost) return;
		setApprovingPost(true);
		try {
			const updated = await postsService.approve(resolvedId);
			setPost((prev) => ({...prev, ...updated}));
			Toast.show({type: 'success', text1: 'Zgłoszenie zatwierdzone', visibilityTime: 2000});
		} catch (err) {
			Toast.show({type: 'error', text1: 'Nie udało się zatwierdzić', text2: err?.message, visibilityTime: 2500});
		} finally {
			setApprovingPost(false);
		}
	};

	const handleApproveManager = async (payload) => {
		// Akceptacja kierownika - z payloadem koszt/termin/dyrektor.
		if (!resolvedId || approvingPost) return;
		setApprovingPost(true);
		try {
			const updated = await postsService.approve(resolvedId, payload);
			setPost((prev) => ({...prev, ...updated}));
			setApproveModalVisible(false);
			Toast.show({type: 'success', text1: 'Zgłoszenie zatwierdzone', visibilityTime: 2000});
		} catch (err) {
			Toast.show({type: 'error', text1: 'Nie udało się zatwierdzić', text2: err?.message, visibilityTime: 2500});
		} finally {
			setApprovingPost(false);
		}
	};

	const handleApprovePost = () => {
		const stageName = post?.current_stage?.stage;
		if (stageName === 'MANAGER') {
			setApproveModalVisible(true);
		} else {
			void handleApproveDirector();
		}
	};

	const handleRejectPost = async (reason) => {
		if (!resolvedId) return;
		setRejectLoading(true);
		try {
			const updated = await postsService.reject(resolvedId, {rejection_reason: reason});
			setPost((prev) => ({...prev, ...updated}));
			setRejectModalVisible(false);
			Toast.show({type: 'success', text1: 'Zgłoszenie odrzucone', visibilityTime: 2000});
		} catch (err) {
			Toast.show({type: 'error', text1: 'Nie udało się odrzucić', text2: err?.message, visibilityTime: 2500});
		} finally {
			setRejectLoading(false);
		}
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
		processedScrollToRef.current = false;
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

	useEffect(() => {
		if (!shouldScrollToComments || resolvedCommentId) return;
		if (loading || !commentsLoaded || !contentReady) return;
		if (processedScrollToRef.current) return;
		if (!scrollRef.current || commentsLayoutY === null) return;
		processedScrollToRef.current = true;
		requestAnimationFrame(() => {
			scrollRef.current?.scrollTo({y: Math.max(0, commentsLayoutY - 12), animated: true});
		});
	}, [commentsLayoutY, commentsLoaded, contentReady, loading, resolvedCommentId, shouldScrollToComments]);

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
			const payload = {text};
			if (replyingTo?.id) {
				payload.parent = replyingTo.id;
			}
			const newComment = await postsService.addComment(resolvedId, payload);
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			setComments((prev) => [newComment, ...prev]);
			setCommentValue(EMPTY_STRING);
			setReplyingTo(null);
		} catch (err) {
			setCommentError(err?.message || 'Nie udało się dodać komentarza');
		} finally {
			setSubmittingComment(false);
		}
	};

	const handleStartReply = useCallback((comment) => {
		if (!comment?.id) return;
		setReplyingTo({id: comment.id, nickname: comment?.author?.nickname || 'użytkownik'});
		setCommentValue((prev) => {
			const nick = comment?.author?.nickname;
			if (!nick) return prev;
			const mention = `@${nick} `;
			return prev?.startsWith(mention) ? prev : mention;
		});
		requestAnimationFrame(() => {
			scrollRef.current?.scrollToEnd({animated: true});
		});
	}, []);

	const handleCancelReply = useCallback(() => {
		setReplyingTo(null);
	}, []);

	const handleSubmitProgress = async (payload) => {
		if (!resolvedId) return;
		setProgressSaving(true);
		try {
			const updated = await postsService.updateProgress(resolvedId, payload);
			setPost(updated);
			setProgressModalVisible(false);
			Toast.show({
				type: 'success',
				text1: 'Zaktualizowano postęp',
				visibilityTime: 1800,
			});
		} catch (err) {
			Toast.show({
				type: 'error',
				text1: 'Nie udało się zaktualizować',
				text2: err?.message || 'Spróbuj ponownie',
				visibilityTime: 2500,
			});
		} finally {
			setProgressSaving(false);
		}
	};

	const handleCommentFocus = useCallback(() => {
		requestAnimationFrame(() => {
			scrollRef.current?.scrollToEnd({animated: true});
		});
	}, []);

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

	const authorFullName = [post?.author?.first_name, post?.author?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();
	const authorName = authorFullName || post?.author?.nickname || post?.author?.username || 'Użytkownik';
	const authorInitials =
		(authorFullName && authorFullName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()) ||
		(authorName ? authorName[0]?.toUpperCase() : 'U');
	const managerDetail = post?.assigned_manager_detail;
	const managerFullName = [managerDetail?.first_name, managerDetail?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();
	const managerName = managerFullName || managerDetail?.nickname || null;
	const managerInitials = managerFullName
		? managerFullName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
		: managerName ? managerName[0]?.toUpperCase() : 'K';
	const categoryLabel = post?.category_name
		?? post?.category?.name
		?? (typeof post?.category === 'string' ? post.category : null);
	const categoryStyle = resolveCategoryStyle(categoryLabel);
	const fallbackUrls = Array.isArray(post?.image_urls) ? post.image_urls.filter(Boolean) : [];
	const typedImageItems = Array.isArray(post?.image_items) ? post.image_items.filter((item) => item?.url) : [];
	const imageItems = typedImageItems.length
		? typedImageItems
		: fallbackUrls.map((url) => ({url, type: 'GENERAL'}));
	const extraImagesCount = Math.max(0, imageItems.length - 1);
	const formattedDate = post?.created_at
		? new Date(post.created_at).toLocaleDateString('pl-PL', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
		: '-';
	const survey = post?.survey;
	const hasSurvey = Boolean(survey);
	const surveyHours = Number(survey?.estimated_time_savings_hours ?? 0);
	const surveySavings = Number(survey?.estimated_financial_savings ?? 0);
	const surveyHoursLabel = Number.isFinite(surveyHours) ? surveyHours.toFixed(1) : '0.0';
	const surveySavingsLabel = Number.isFinite(surveySavings)
		? surveySavings.toLocaleString('pl-PL', {minimumFractionDigits: 0, maximumFractionDigits: 0})
		: '0';
	const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
	const visibleTree = showAllComments
		? commentTree
		: commentTree.slice(0, COMMENTS_PREVIEW_COUNT);
	const totalCommentsCount = comments.length;

	return (
		<>
			<Stack.Screen
				options={{
					title: '',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
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
			<KeyboardAwareScrollView
				ref={scrollRef}
				contentContainerStyle={styles.container}
				onContentSizeChange={handleContentSizeChange}
				keyboardVerticalOffset={12}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
				}
			>
				{error ? (
					<View style={styles.centered}>
						<Feather name="wifi-off" size={32} color={colors.muted} />
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
						<PostOverview
							{...{post, categoryStyle, categoryLabel, authorInitials, authorName, managerName, managerInitials, formattedDate, isOwner, router, resolvedId, canManageProgress, setProgressModalVisible, isCurrentStageApprover, handleApprovePost, approvingPost, setRejectModalVisible}}
						/>
						<PostMediaSurvey
							{...{imageItems, extraImagesCount, contentWidth, openPreview, hasSurvey, surveyHoursLabel, surveySavingsLabel, isOwner, router, resolvedId}}
						/>
						<PostDiscussion
							{...{likeScale, handleToggleLike, liking, loading, isLiked, likesCount, scrollToComments, comments, setCommentsLayoutY, commentTree, showAllComments, handleToggleComments, totalCommentsCount, visibleTree, currentUserId, handleUpdateComment, handleDeleteComment, handleStartReply, updatingCommentId, deletingCommentId, handleCommentLayout, highlightCommentId, commentValue, setCommentValue, handleSubmitComment, submittingComment, commentError, handleCommentFocus, replyingTo, handleCancelReply}}
						/>
					</>
				)}
			</KeyboardAwareScrollView>
			<PostDetailModals
				{...{previewVisible, closePreview, imageItems, screenWidth, screenHeight, previewIndex, menuVisible, handleCloseMenu, handleEditPost, handleDeletePost, rejectModalVisible, setRejectModalVisible, handleRejectPost, rejectLoading, progressModalVisible, setProgressModalVisible, handleSubmitProgress, post, progressSaving, approveModalVisible, setApproveModalVisible, handleApproveManager, approvingPost}}
			/>
		</>
	);
}
