import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {
	Animated,
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
import {buildCommentTree} from 'utils/commentTree';
import KeyboardAwareScrollView from 'components/KeyboardAwareScrollView/KeyboardAwareScrollView';
import TextBase from 'components/Text/Text';
import {CONTENT_IS_REQUIRED, EMPTY_STRING, FAILED_TO_LOAD_POST, FAILED_TO_LOAD_COMMENTS} from 'constants/constans';
import {getPostStatusMeta} from 'utils/postStatus';
import ImageCarousel from 'components/PostDetail/ImageCarousel';
import Button from 'components/Button/Button';
import BackButton from 'components/Navigation/BackButton';
import RejectionReasonModal from 'components/RejectionReasonModal/RejectionReasonModal';
import Toast from 'react-native-toast-message';
import ExtraImagesBadge from 'components/Badges/ExtraImagesBadge';
import ApprovalTimeline from 'components/PostDetail/ApprovalTimeline';
import ApproveDecisionModal from 'components/PostDetail/ApproveDecisionModal';
import ImplementationCard from 'components/PostDetail/ImplementationCard';
import ProgressUpdateModal from 'components/PostDetail/ProgressUpdateModal';

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
	const user = useAuthStore((state) => state.user);
	const currentUserId = useMemo(
		() => getJwtPayload(accessToken)?.user_id ?? null,
		[accessToken]
	);
	const isOwner = post?.author?.id && String(post.author.id) === String(currentUserId);
	const isAssignedManager = post?.assigned_manager_detail?.id && String(post.assigned_manager_detail.id) === String(currentUserId);
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
		// Akceptacja dyrektora — bez dodatkowych pól.
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
		// Akceptacja kierownika — z payloadem koszt/termin/dyrektor.
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

	const statusMeta = getPostStatusMeta(post?.status);
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
	const imageUrls = Array.isArray(post?.image_urls) ? post.image_urls.filter(Boolean) : [];
	const extraImagesCount = Math.max(0, imageUrls.length - 1);
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
						{/* Main card: header + description */}
						<View style={styles.headerCard}>
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

							<TextBase style={styles.postTitle}>{post?.title || 'Bez tytułu'}</TextBase>

							<View style={styles.headerDivider} />

							<TextBase style={styles.descriptionText}>
								{post?.content || 'Brak treści.'}
							</TextBase>

							<View style={styles.headerDivider} />

							<View style={styles.metaGrid}>
								<View style={styles.metaItem}>
									<View style={styles.metaAvatar}>
										<TextBase style={styles.metaAvatarText}>{authorInitials}</TextBase>
									</View>
									<View style={styles.metaInfo}>
										<TextBase style={styles.metaLabel}>Autor</TextBase>
										<TextBase style={styles.metaValue}>{authorName}</TextBase>
									</View>
								</View>
								{managerName ? (
									<View style={styles.metaItem}>
										<View style={[styles.metaAvatar, styles.metaAvatarManager]}>
											<TextBase style={[styles.metaAvatarText, styles.metaAvatarManagerText]}>{managerInitials}</TextBase>
										</View>
										<View style={styles.metaInfo}>
											<TextBase style={styles.metaLabel}>Kierownik</TextBase>
											<TextBase style={styles.metaValue}>{managerName}</TextBase>
										</View>
									</View>
								) : null}
								<View style={styles.metaItem}>
									<View style={styles.metaIconCircle}>
										<Feather name="calendar" size={13} color={colors.muted} />
									</View>
									<View style={styles.metaInfo}>
										<TextBase style={styles.metaLabel}>Data</TextBase>
										<TextBase style={styles.metaValue}>{formattedDate}</TextBase>
									</View>
								</View>
							</View>
						</View>

						{/* Rejection reason */}
						{post?.status === 'CANCELLED' && post?.rejection_reason && isOwner ? (
							<View style={styles.rejectionCard}>
								<View style={styles.rejectionHeader}>
									<Feather name="alert-circle" size={16} color={colors.danger} />
									<TextBase style={styles.rejectionLabel}>Powód odrzucenia</TextBase>
								</View>
								<TextBase style={styles.rejectionText}>{post.rejection_reason}</TextBase>
								<Button
									title="Edytuj i zgłoś ponownie"
									variant="outline"
									onPress={() => router.push(`/post/${resolvedId}/edit`)}
									leftIcon={<Feather name="edit-2" size={14} color={colors.primary} />}
									style={styles.resubmitButton}
								/>
							</View>
						) : null}

						{/* Approval timeline — pokazuje wszystkie etapy zatwierdzenia */}
						{Array.isArray(post?.approvals) && post.approvals.length > 0 ? (
							<View style={styles.card}>
								<ApprovalTimeline approvals={post.approvals} />
							</View>
						) : null}

						{/* Implementation card — koszt, termin, postęp */}
						{(post?.estimated_cost != null || post?.deadline || post?.progress_percent > 0 || ['SUBMITTED', 'IN_PROGRESS', 'IMPLEMENTED'].includes(post?.status)) ? (
							<ImplementationCard
								post={post}
								canManage={Boolean(isAssignedManager)}
								onUpdateProgress={() => setProgressModalVisible(true)}
							/>
						) : null}

						{/* Approver actions (multi-stage) */}
						{post?.status === 'TO_VERIFY' && isCurrentStageApprover ? (
							<View style={styles.card}>
								<View style={styles.cardHeader}>
									<View style={[styles.cardIconCircle, {backgroundColor: '#fef3c7'}]}>
										<Feather name="shield" size={14} color="#92400e" />
									</View>
									<TextBase style={styles.cardTitle}>Twoja decyzja</TextBase>
								</View>
								<TextBase style={styles.stageHint}>
									Etap: {{
										TEAM_LEAD: 'Lider zespołu',
										MANAGER: 'Kierownik',
										DIRECTOR: 'Dyrektor',
									}[post?.current_stage?.stage] || post?.current_stage?.stage}
								</TextBase>
								<View style={styles.managerActionsRow}>
									<Button
										title="Zatwierdź"
										onPress={handleApprovePost}
										loading={approvingPost}
										leftIcon={<Feather name="check" size={16} color="#fff" />}
										style={styles.approveButton}
										textStyle={styles.approveButtonText}
									/>
									<Button
										title="Odrzuć"
										variant="outline"
										onPress={() => setRejectModalVisible(true)}
										leftIcon={<Feather name="x" size={16} color={colors.danger} />}
										style={styles.rejectButtonDetail}
										textStyle={styles.rejectButtonText}
									/>
								</View>
							</View>
						) : null}

						{/* Attachments card */}
						<View style={styles.card}>
							<View style={styles.cardHeader}>
								<View style={styles.cardIconCircle}>
									<Feather name="image" size={14} color={colors.primary} />
								</View>
								<TextBase style={styles.cardTitle}>Załączniki</TextBase>
								{imageUrls.length > 0 ? (
									<View style={styles.countBadge}>
										<TextBase style={styles.countBadgeText}>{imageUrls.length}</TextBase>
									</View>
								) : null}
							</View>
							{imageUrls.length === 1 ? (
								<Pressable style={styles.imageWrapper} onPress={() => openPreview(0)}>
									<Image source={{uri: imageUrls[0]}} style={styles.image} resizeMode="cover" />
									<ExtraImagesBadge count={extraImagesCount} />
								</Pressable>
							) : imageUrls.length > 1 ? (
								<View style={styles.imageWrapper}>
									<ImageCarousel
										images={imageUrls}
										width={contentWidth}
										height={240}
										onImagePress={openPreview}
										showDots
									/>
									<ExtraImagesBadge count={extraImagesCount} />
								</View>
							) : (
								<TextBase style={styles.placeholderText}>Brak załączników.</TextBase>
							)}
						</View>

						{/* Survey results card */}
						{hasSurvey ? (
							<View style={styles.surveyResultsCard}>
								<View style={styles.cardHeader}>
									<View style={[styles.cardIconCircle, {backgroundColor: '#dcfce7'}]}>
										<Feather name="bar-chart-2" size={14} color="#16a34a" />
									</View>
									<TextBase style={styles.cardTitle}>Przewidywane usprawnienia</TextBase>
								</View>
								<View style={styles.surveyRow}>
									<View style={styles.surveyItem}>
										<Feather name="clock" size={18} color={colors.primary} />
										<TextBase style={styles.surveyValue}>{surveyHoursLabel} h</TextBase>
										<TextBase style={styles.surveyLabel}>Czas / miesiąc</TextBase>
									</View>
									<View style={styles.surveyDivider} />
									<View style={styles.surveyItem}>
										<Feather name="trending-up" size={18} color="#16a34a" />
										<TextBase style={[styles.surveyValue, {color: '#16a34a'}]}>
											{surveySavingsLabel} PLN
										</TextBase>
										<TextBase style={styles.surveyLabel}>Oszczędności</TextBase>
									</View>
								</View>
							</View>
						) : isOwner ? (
							<View style={styles.card}>
								<View style={styles.cardHeader}>
									<View style={[styles.cardIconCircle, {backgroundColor: '#dcfce7'}]}>
										<Feather name="bar-chart-2" size={14} color="#16a34a" />
									</View>
									<TextBase style={styles.cardTitle}>Przewidywane usprawnienia</TextBase>
								</View>
								<TextBase style={styles.placeholderText}>
									Dodaj ankietę, aby oszacować korzyści z usprawnienia.
								</TextBase>
								<Button
									title="Uzupełnij ankietę"
									onPress={() => router.push(`/post/${resolvedId}/survey`)}
									leftIcon={<Feather name="bar-chart-2" size={14} color="#fff" />}
									style={styles.surveyCta}
								/>
							</View>
						) : null}

						{/* Actions row */}
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

						{/* Comments card */}
						<View
							style={styles.commentsCard}
							onLayout={(event) => setCommentsLayoutY(event.nativeEvent.layout.y)}
						>
							<View style={styles.cardHeader}>
								<View style={styles.cardIconCircle}>
									<Feather name="message-circle" size={14} color={colors.primary} />
								</View>
								<TextBase style={styles.cardTitle}>Komentarze</TextBase>
								{comments.length > 0 ? (
									<View style={styles.countBadge}>
										<TextBase style={styles.countBadgeText}>{comments.length}</TextBase>
									</View>
								) : null}
								<View style={{flex: 1}} />
								{commentTree.length > COMMENTS_PREVIEW_COUNT ? (
									<Pressable onPress={handleToggleComments}>
										<TextBase style={styles.showAllText}>
											{showAllComments ? 'Mniej' : `Wszystkie (${totalCommentsCount})`}
										</TextBase>
									</Pressable>
								) : null}
							</View>
							<CommentsList
								tree={visibleTree}
								currentUserId={currentUserId}
								onUpdate={handleUpdateComment}
								onDelete={handleDeleteComment}
								onReply={handleStartReply}
								updatingId={updatingCommentId}
								deletingId={deletingCommentId}
								onCommentLayout={handleCommentLayout}
								highlightedCommentId={highlightCommentId}
							/>
							<CommentInput
								value={commentValue}
								onChangeText={setCommentValue}
								onSubmit={handleSubmitComment}
								loading={submittingComment}
								error={commentError}
								onFocus={handleCommentFocus}
								replyingTo={replyingTo}
								onCancelReply={handleCancelReply}
							/>
						</View>
					</>
				)}
			</KeyboardAwareScrollView>
			<Modal
				transparent
				visible={previewVisible}
				animationType="fade"
				onRequestClose={closePreview}
			>
				<View style={styles.previewOverlay}>
					<Pressable style={styles.previewBackdrop} onPress={closePreview} />
					<View style={styles.previewModalCard}>
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
			<RejectionReasonModal
				visible={rejectModalVisible}
				onClose={() => setRejectModalVisible(false)}
				onSubmit={handleRejectPost}
				loading={rejectLoading}
			/>
			<ProgressUpdateModal
				visible={progressModalVisible}
				onClose={() => setProgressModalVisible(false)}
				onSubmit={handleSubmitProgress}
				initialProgress={post?.progress_percent ?? 0}
				initialDeadline={post?.deadline ?? ''}
				loading={progressSaving}
			/>
			<ApproveDecisionModal
				visible={approveModalVisible}
				onClose={() => setApproveModalVisible(false)}
				onSubmit={handleApproveManager}
				initialCost={post?.estimated_cost ?? ''}
				initialDeadline={post?.deadline ?? ''}
				initialDirector={post?.assigned_director_detail?.id ?? null}
				loading={approvingPost}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		paddingBottom: 32,
		gap: 14,
		backgroundColor: colors.background,
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
		gap: 10,
		padding: 32,
	},
	error: {
		color: colors.danger,
		fontWeight: '700',
		fontSize: 16,
		textAlign: 'center',
	},
	muted: {
		color: colors.muted,
		textAlign: 'center',
		fontSize: 14,
	},

	/* Header card */
	headerCard: {
		gap: 14,
		padding: 18,
		borderRadius: 16,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowOffset: {width: 0, height: 4},
		shadowRadius: 12,
		elevation: 2,
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
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		textTransform: 'uppercase',
	},
	statusBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 10,
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
		fontWeight: '800',
		color: colors.text,
		lineHeight: 28,
	},
	headerDivider: {
		height: 1,
		backgroundColor: colors.border,
	},
	metaGrid: {
		gap: 12,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	metaAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#e0e7ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	metaAvatarText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.primary,
	},
	metaAvatarManager: {
		backgroundColor: '#ede9fe',
	},
	metaAvatarManagerText: {
		color: '#5b21b6',
	},
	metaIconCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.placeholderSurface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	metaInfo: {
		gap: 1,
	},
	metaLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	metaValue: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},

	/* Shared card */
	card: {
		gap: 12,
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	cardIconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#e0e7ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	countBadge: {
		backgroundColor: colors.border,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
	},
	countBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.muted,
	},

	/* Description */
	descriptionText: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.text,
	},
	placeholderText: {
		color: colors.muted,
		fontSize: 13,
	},

	/* Rejection */
	rejectionCard: {
		gap: 10,
		padding: 16,
		borderRadius: 14,
		backgroundColor: '#fef2f2',
		borderWidth: 1,
		borderColor: '#fecaca',
	},
	rejectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	rejectionLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.danger,
	},
	rejectionText: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.text,
	},
	resubmitButton: {
		alignSelf: 'flex-start',
		marginTop: 2,
	},

	/* Manager actions */
	stageHint: {
		fontSize: 12,
		color: colors.muted,
		fontWeight: '600',
		marginBottom: 6,
	},
	managerActionsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	approveButton: {
		flex: 1,
		minHeight: 44,
		backgroundColor: '#16a34a',
		borderColor: '#16a34a',
	},
	approveButtonText: {
		color: '#fff',
	},
	rejectButtonDetail: {
		flex: 1,
		minHeight: 44,
		borderColor: colors.danger,
	},
	rejectButtonText: {
		color: colors.danger,
	},

	/* Images */
	imageWrapper: {
		width: '100%',
		height: 240,
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
		backgroundColor: colors.placeholderSurface,
	},
	image: {
		width: '100%',
		height: '100%',
	},

	/* Survey */
	surveyResultsCard: {
		gap: 14,
		padding: 16,
		borderRadius: 14,
		backgroundColor: '#f0f4ff',
		borderWidth: 1,
		borderColor: '#c7d2fe',
	},
	surveyRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	surveyItem: {
		flex: 1,
		alignItems: 'center',
		gap: 6,
	},
	surveyDivider: {
		width: 1,
		height: 48,
		backgroundColor: '#c7d2fe',
	},
	surveyValue: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.primary,
	},
	surveyLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.muted,
	},
	surveyCta: {
		alignSelf: 'flex-start',
	},

	/* Actions */
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
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

	/* Comments */
	commentsCard: {
		gap: 12,
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	showAllText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},

	/* Preview modal */
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
	previewModalCard: {
		width: '100%',
	},
	previewCarousel: {
		borderRadius: 0,
	},

	/* Menu modal */
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
