import {Animated, Image, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useRef} from 'react';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import Text from 'components/Text/Text';
import ExtraImagesBadge from 'components/Badges/ExtraImagesBadge';
import {Avatar, StatusPill} from 'components/ui';
import {radius, shadows, spacing, typography} from 'theme/theme';

const CATEGORY_STYLES = {
	BHP: {backgroundColor: colors.infoSoft, color: colors.statusTextInProgress},
	PROCES: {backgroundColor: colors.successSoft, color: colors.success},
	'USPRAWNIENIE PROCESU': {backgroundColor: colors.successSoft, color: colors.success},
	JAKOSC: {backgroundColor: colors.warningSoft, color: colors.warning},
	'JAKOŚĆ': {backgroundColor: colors.warningSoft, color: colors.warning},
	INNE: {backgroundColor: colors.primarySoft, color: colors.primary},
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

	const managerDetail = post?.assigned_manager_detail;
	const managerName = [managerDetail?.first_name, managerDetail?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim() || managerDetail?.nickname || null;

	const formatDate = (value) => {
		if (!value) return '-';
		const date = new Date(value);
		return date.toLocaleDateString('pl-PL', {day: '2-digit', month: 'short'});
	};

	const handleLikePress = (event) => {
		event.stopPropagation?.();
		likeScale.setValue(1);
		Animated.sequence([
			Animated.spring(likeScale, {toValue: 1.08, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}),
			Animated.spring(likeScale, {toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}),
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
			Animated.spring(bookmarkScale, {toValue: 1.12, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 8}),
			Animated.spring(bookmarkScale, {toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 8}),
		]).start();
		onToggleBookmark?.(post?.id);
	};

	const handleMorePress = (event) => {
		event.stopPropagation?.();
		if (isDeleting) return;
		onPressMore?.(post);
	};

	return (
		<View style={styles.card}>
			<View style={styles.metaRow}>
				<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Otwórz pomysł ${post?.title || 'Bez tytułu'}`} style={styles.metaPressArea}>
					<Avatar name={authorName} size={32} />
					<View style={styles.authorBlock}>
						<Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
						<Text style={styles.dateText} numberOfLines={1}>{post?.author?.department_name ? `${post.author.department_name} · ` : ''}{formatDate(post?.created_at)}</Text>
					</View>
				</Pressable>
				{canManage && onPressMore ? <Pressable onPress={handleMorePress} style={styles.moreButton} accessibilityLabel="Więcej opcji"><Feather name="more-horizontal" size={20} color={colors.textMuted} /></Pressable> : null}
			</View>
			<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Otwórz pomysł ${post?.title || 'Bez tytułu'}`} style={styles.cardContent}>
				<View style={styles.badgesRow}>
					<Text style={[styles.categoryBadge, categoryStyle]}>{categoryLabel || 'Zgłoszenie'}</Text>
					<StatusPill status={post?.status} />
					{post?.id ? <Text style={styles.postId}>#{post.id}</Text> : null}
				</View>

				<Text style={styles.title} numberOfLines={2}>{post?.title || 'Bez tytułu'}</Text>

				<Text style={styles.excerpt} numberOfLines={3} ellipsizeMode="tail">{post?.content || 'Brak treści'}</Text>

				{primaryImage ? <View style={styles.imageWrapper}><Image source={{uri: primaryImage}} style={styles.image} /><ExtraImagesBadge count={extraImagesCount} /></View> : null}

				{managerName ? <Text style={styles.managerText} numberOfLines={1}>Akceptuje: {managerName}</Text> : null}
			</Pressable>

			<View style={styles.footer}>
				<View style={styles.footerActions}>
					<Animated.View style={[styles.footerButtonWrapper, {transform: [{scale: likeScale}]}]}>
						<Pressable
							style={[styles.footerButton, isLiked ? styles.footerButtonActive : null]}
							onPress={handleLikePress}
							accessibilityRole="button"
							accessibilityLabel={isLiked ? 'Usuń polubienie' : 'Polub pomysł'}
						>
							<Feather name="thumbs-up" size={13} color={isLiked ? colors.white : colors.primary} />
							<Text style={[styles.footerButtonText, isLiked ? styles.footerButtonTextActive : null]}>
								{likes}
							</Text>
						</Pressable>
					</Animated.View>
					<Pressable style={styles.footerButton} onPress={handleCommentPress} accessibilityRole="button" accessibilityLabel="Otwórz komentarze">
						<Feather name="message-circle" size={13} color={colors.primary} />
						<Text style={styles.footerButtonText}>{commentsCount}</Text>
					</Pressable>
					{onToggleBookmark ? (
						<Animated.View style={[styles.footerButtonWrapper, styles.bookmarkWrapper, {transform: [{scale: bookmarkScale}]}]}>
							<Pressable
								style={[styles.footerButton, isBookmarked ? styles.bookmarkButtonActive : null]}
								onPress={handleBookmarkPress}
								accessibilityRole="button"
								accessibilityLabel={isBookmarked ? 'Usuń z zapisanych' : 'Zapisz pomysł'}
								hitSlop={6}
							>
								<Feather
									name="bookmark"
									size={13}
									color={isBookmarked ? colors.white : colors.primary}
								/>
							</Pressable>
						</Animated.View>
					) : null}
				</View>
			</View>
		</View>
	);
};

export default Post;

const styles = StyleSheet.create({
	card: {
		gap: spacing.md,
		padding: spacing.lg,
		borderRadius: radius.lg,
		borderColor: colors.border,
		borderWidth: 1,
		backgroundColor: colors.surface,
		...shadows.card,
	},
	metaPressArea: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1},
	cardContent: {gap: spacing.md},

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
	postId: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
	},

	/* Content */
	title: {
		...typography.subtitle,
		color: colors.text,
		lineHeight: 22,
	},
	excerpt: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.textMuted,
	},

	/* Image */
	imageWrapper: {
		width: '100%',
		height: 180,
		borderRadius: radius.md,
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
		gap: spacing.sm,
	},
	authorBlock: {flex: 1, gap: 1},
	moreButton: {width: 34, height: 34, alignItems: 'center', justifyContent: 'center'},
	authorName: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.text,
		flexShrink: 1,
	},
	dateText: {
		fontSize: 12,
		color: colors.muted,
	},
	managerText: {
		fontSize: 12,
		color: colors.textMuted,
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
		backgroundColor: colors.surfaceAlt,
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
		color: colors.white,
	},
	bookmarkWrapper: {
		marginLeft: 'auto',
	},
	bookmarkButtonActive: {
		backgroundColor: colors.warning,
		borderColor: colors.warning,
	},
});
