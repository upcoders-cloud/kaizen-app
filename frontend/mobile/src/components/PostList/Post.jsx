import {Animated, Image, Pressable, StyleSheet, View} from 'react-native';
import {useRef} from 'react';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import Text from 'components/Text/Text';
import {getPostStatusMeta} from 'utils/postStatus';
import ExtraImagesBadge from 'components/Badges/ExtraImagesBadge';

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

const Post = ({
	post,
	onPress,
	onToggleLike,
	onToggleBookmark,
	onPressComment,
	onPressMore,
	canManage = false,
	isDeleting = false,
}) => {
	const likes = post?.likes_count ?? post?.likes?.length ?? 0;
	const commentsCount = post?.comments_count ?? post?.comments?.length ?? 0;
	const authorFullName = [post?.author?.first_name, post?.author?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();
	const authorName = authorFullName || post?.author?.nickname || post?.author?.username || 'Użytkownik';
	const statusMeta = getPostStatusMeta(post?.status);
	const isLiked = Boolean(post?.is_liked_by_me);
	const isBookmarked = Boolean(post?.is_bookmarked_by_me);
	const likeScale = useRef(new Animated.Value(1)).current;
	const bookmarkScale = useRef(new Animated.Value(1)).current;
	const imageUrls = Array.isArray(post?.image_urls)
		? post.image_urls.filter(Boolean)
		: Array.isArray(post?.images)
			? post.images.filter(Boolean)
			: [];
	const primaryImage = imageUrls[0];
	const extraImagesCount = Math.max(0, imageUrls.length - 1);
	const categoryLabel = post?.category_name
		?? post?.category?.name
		?? (typeof post?.category === 'string' ? post.category : null);
	const categoryStyle = resolveCategoryStyle(categoryLabel);

	const initials = authorName
		.split(' ')
		.filter(Boolean)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	const managerDetail = post?.assigned_manager_detail;
	const managerName = [managerDetail?.first_name, managerDetail?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim() || managerDetail?.nickname || null;

	const formatDate = (value) => {
		if (!value) return '—';
		const date = new Date(value);
		return date.toLocaleDateString('pl-PL', {day: '2-digit', month: 'short'});
	};

	const handleLikePress = (event) => {
		event.stopPropagation?.();
		likeScale.setValue(1);
		Animated.sequence([
			Animated.spring(likeScale, {toValue: 1.08, useNativeDriver: true, speed: 30, bounciness: 6}),
			Animated.spring(likeScale, {toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6}),
		]).start();
		onToggleLike?.(post?.id);
	};

	const handleCommentPress = (event) => {
		event.stopPropagation?.();
		onPressComment?.(post);
	};

	const handleBookmarkPress = (event) => {
		event.stopPropagation?.();
		bookmarkScale.setValue(1);
		Animated.sequence([
			Animated.spring(bookmarkScale, {toValue: 1.12, useNativeDriver: true, speed: 30, bounciness: 8}),
			Animated.spring(bookmarkScale, {toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8}),
		]).start();
		onToggleBookmark?.(post?.id);
	};

	const handleMorePress = (event) => {
		event.stopPropagation?.();
		if (isDeleting) return;
		onPressMore?.(post);
	};

	return (
		<Pressable
			onPress={onPress}
			style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
		>
			{/* Badges row */}
			<View style={styles.badgesRow}>
				<Text style={[styles.categoryBadge, categoryStyle]}>
					{categoryLabel || 'Zgłoszenie'}
				</Text>
				<Text
					style={[
						styles.statusBadge,
						{color: statusMeta.color, backgroundColor: statusMeta.backgroundColor},
					]}
				>
					{statusMeta.label}
				</Text>
				{post?.id ? <Text style={styles.postId}>#{post.id}</Text> : null}
			</View>

			{/* Title */}
			<Text style={styles.title} numberOfLines={2}>
				{post?.title || 'Bez tytułu'}
			</Text>

			{/* Excerpt */}
			<Text style={styles.excerpt} numberOfLines={3} ellipsizeMode="tail">
				{post?.content || 'Brak treści'}
			</Text>

			{/* Image */}
			{primaryImage ? (
				<View style={styles.imageWrapper}>
					<Image source={{uri: primaryImage}} style={styles.image} />
					<ExtraImagesBadge count={extraImagesCount} />
				</View>
			) : null}

			{/* Meta row */}
			<View style={styles.metaRow}>
				<View style={styles.metaAuthor}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{initials || 'U'}</Text>
					</View>
					<Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
				</View>
				<Text style={styles.dot}>·</Text>
				<Text style={styles.dateText}>{formatDate(post?.created_at)}</Text>
				{managerName ? (
					<>
						<Text style={styles.dot}>·</Text>
						<Feather name="shield" size={11} color={colors.mutedAlt} />
						<Text style={styles.managerText} numberOfLines={1}>{managerName}</Text>
					</>
				) : null}
			</View>

			{/* Footer actions */}
			<View style={styles.footer}>
				<View style={styles.footerActions}>
					<Animated.View style={[styles.footerButtonWrapper, {transform: [{scale: likeScale}]}]}>
						<Pressable
							style={[styles.footerButton, isLiked ? styles.footerButtonActive : null]}
							onPress={handleLikePress}
						>
							<Feather name="thumbs-up" size={13} color={isLiked ? '#fff' : colors.primary} />
							<Text style={[styles.footerButtonText, isLiked ? styles.footerButtonTextActive : null]}>
								{likes}
							</Text>
						</Pressable>
					</Animated.View>
					<Pressable style={styles.footerButton} onPress={handleCommentPress}>
						<Feather name="message-circle" size={13} color={colors.primary} />
						<Text style={styles.footerButtonText}>{commentsCount}</Text>
					</Pressable>
					{onToggleBookmark ? (
						<Animated.View style={[styles.footerButtonWrapper, styles.bookmarkWrapper, {transform: [{scale: bookmarkScale}]}]}>
							<Pressable
								style={[styles.footerButton, isBookmarked ? styles.bookmarkButtonActive : null]}
								onPress={handleBookmarkPress}
								hitSlop={6}
							>
								<Feather
									name="bookmark"
									size={13}
									color={isBookmarked ? '#fff' : colors.primary}
								/>
							</Pressable>
						</Animated.View>
					) : null}
					{canManage ? (
						<Pressable
							style={[styles.footerButton, isDeleting ? styles.footerButtonDisabled : null]}
							onPress={handleMorePress}
							disabled={isDeleting}
						>
							<Feather name="more-horizontal" size={13} color={colors.primary} />
						</Pressable>
					) : null}
				</View>
			</View>
		</Pressable>
	);
};

export default Post;

const styles = StyleSheet.create({
	card: {
		gap: 10,
		padding: 16,
		borderRadius: 14,
		borderColor: colors.border,
		borderWidth: 1,
		backgroundColor: colors.surface,
	},
	cardPressed: {
		transform: [{scale: 0.985}],
		opacity: 0.95,
	},

	/* Badges */
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
		paddingVertical: 3,
		borderRadius: 999,
		textTransform: 'uppercase',
	},
	statusBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 999,
	},
	postId: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
	},

	/* Content */
	title: {
		fontSize: 17,
		fontWeight: '800',
		color: colors.text,
		lineHeight: 22,
	},
	excerpt: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.muted,
	},

	/* Image */
	imageWrapper: {
		width: '100%',
		height: 180,
		borderRadius: 10,
		overflow: 'hidden',
		position: 'relative',
		backgroundColor: colors.placeholderSurface,
	},
	image: {
		width: '100%',
		height: '100%',
	},

	/* Meta */
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingTop: 2,
	},
	metaAuthor: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 1,
	},
	avatar: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e0e7ff',
	},
	avatarText: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.primary,
	},
	authorName: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
		flexShrink: 1,
	},
	dot: {
		fontSize: 12,
		color: colors.muted,
	},
	dateText: {
		fontSize: 12,
		color: colors.muted,
	},
	managerText: {
		fontSize: 12,
		color: colors.mutedAlt,
		flexShrink: 1,
	},

	/* Footer */
	footer: {
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	footerActions: {
		flexDirection: 'row',
		gap: 8,
	},
	footerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 10,
		backgroundColor: colors.placeholderSurface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	footerButtonText: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.primary,
	},
	footerButtonWrapper: {
		alignSelf: 'flex-start',
	},
	footerButtonActive: {
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	footerButtonTextActive: {
		color: '#fff',
	},
	footerButtonDisabled: {
		opacity: 0.5,
	},
	bookmarkWrapper: {
		marginLeft: 'auto',
	},
	bookmarkButtonActive: {
		backgroundColor: '#f59e0b',
		borderColor: '#f59e0b',
	},
});
