import {Animated, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRef} from 'react';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import {getPostStatusMeta} from 'utils/postStatus';

const CATEGORY_STYLES = {
	BHP: {backgroundColor: '#E6F6FF', color: '#0F5F7F'},
	PROCES: {backgroundColor: '#E9F7EF', color: '#2E7D32'},
	JAKOSC: {backgroundColor: '#FFF3E0', color: '#C16A00'},
	INNE: {backgroundColor: '#F2F4F8', color: '#4A5568'},
};

const Post = ({post, onPress, onToggleLike}) => {
	const likes = post?.likes_count ?? post?.likes?.length ?? 0;
	const comments = post?.comments_count ?? post?.comments?.length ?? 0;
	const authorFullName = [post?.author?.first_name, post?.author?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();
	const authorName = authorFullName || post?.author?.nickname || post?.author?.username || 'Użytkownik';
	const department = post?.author?.department || '—';
	const statusMeta = getPostStatusMeta(post?.status);
	const isLiked = Boolean(post?.is_liked_by_me);
	const likeScale = useRef(new Animated.Value(1)).current;
	const imageUrls = Array.isArray(post?.image_urls)
		? post.image_urls
		: Array.isArray(post?.images)
			? post.images
			: [];
	const primaryImage = imageUrls[0];
	const categoryKey = post?.category || 'INNE';
	const categoryStyle = CATEGORY_STYLES[categoryKey] || CATEGORY_STYLES.INNE;

	const initials = authorName
		.split(' ')
		.filter(Boolean)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

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

	const handleActionPress = (event) => {
		event.stopPropagation?.();
	};

	return (
		<Pressable
			onPress={onPress}
			style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
		>
			{/* Header */}
			<View style={styles.headerRow}>
				<View style={styles.authorRow}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{initials || 'U'}</Text>
					</View>
					<View style={styles.authorInfo}>
						<Text style={styles.authorName}>{authorName}</Text>
						<Text style={styles.authorDept}>Dział: {department}</Text>
					</View>
				</View>
				<View style={styles.headerMeta}>
					<Text
						style={[
							styles.statusBadge,
							{color: statusMeta.color, backgroundColor: statusMeta.backgroundColor},
						]}
					>
						{statusMeta.label}
					</Text>
					<Text style={styles.dateText}>{formatDate(post?.created_at)}</Text>
				</View>
			</View>

			{/* Body */}
			<View style={styles.body}>
				<Text style={[styles.category, categoryStyle]}>{post?.category || 'Post'}</Text>
				<Text style={styles.title} numberOfLines={2}>
					{post?.title || 'Bez tytułu'}
				</Text>
				<Text style={styles.excerpt} numberOfLines={4} ellipsizeMode="tail">
					{post?.content || 'No content'}
				</Text>
				{primaryImage ? <Image source={{uri: primaryImage}} style={styles.image} /> : null}
			</View>

			{/* Footer */}
			<View style={styles.footer}>
				<Text style={styles.footerMeta}>
					{likes} reakcji • {comments} komentarzy
				</Text>
				<View style={styles.footerActions}>
					<Animated.View style={[styles.footerButtonWrapper, {transform: [{scale: likeScale}]}]}>
						<Pressable
							style={[styles.footerButton, isLiked ? styles.footerButtonActive : null]}
							onPress={handleLikePress}
						>
							<Feather name="thumbs-up" size={14} color={isLiked ? '#fff' : colors.primary} />
							<Text style={[styles.footerButtonText, isLiked ? styles.footerButtonTextActive : null]}>
								Mam to samo
							</Text>
						</Pressable>
					</Animated.View>
					<Pressable style={styles.footerButton} onPress={handleActionPress}>
						<Feather name="plus-circle" size={14} color={colors.primary} />
						<Text style={styles.footerButtonText}>Dodaj pomysł</Text>
					</Pressable>
					<Pressable style={styles.footerButton} onPress={handleActionPress}>
						<Feather name="more-horizontal" size={14} color={colors.primary} />
						<Text style={styles.footerButtonText}>Więcej</Text>
					</Pressable>
				</View>
			</View>
		</Pressable>
	);
};

export default Post;

const styles = StyleSheet.create({
	card: {
		position: 'relative',
		margin: 0,
		borderRadius: 10,
		borderColor: colors.border,
		borderWidth: 1,
		backgroundColor: colors.surface,
		padding: 14,
	},
	category: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.muted,
		letterSpacing: 0.3,
		textTransform: 'uppercase',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		backgroundColor: colors.badgeBackground,
		alignSelf: 'flex-start',
	},
	title: {
		marginTop: 8,
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
	},
	excerpt: {
		fontSize: 14,
		lineHeight: 21,
		color: '#4b5563',
	},
	cardPressed: {
		transform: [{scale: 0.995}],
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 10,
	},
	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.border,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	avatarText: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.primary,
	},
	authorInfo: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	authorName: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	authorDept: {
		fontSize: 12,
		color: colors.muted,
	},
	headerMeta: {
		alignItems: 'flex-end',
		gap: 6,
	},
	statusBadge: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0f5132',
		backgroundColor: '#d1e7dd',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
	},
	dateText: {
		fontSize: 11,
		color: colors.muted,
	},
	body: {
		marginTop: 12,
		gap: 6,
	},
	image: {
		marginTop: 8,
		width: '100%',
		height: 180,
		borderRadius: 8,
		backgroundColor: colors.border,
	},
	footer: {
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		gap: 10,
	},
	footerMeta: {
		fontSize: 12,
		color: colors.muted,
	},
	footerActions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	footerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 8,
		borderRadius: 8,
		backgroundColor: '#f8fafc',
		borderWidth: 1,
		borderColor: colors.border,
	},
	footerButtonText: {
		fontSize: 12,
		fontWeight: '600',
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
});
