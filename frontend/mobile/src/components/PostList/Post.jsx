import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';

const CATEGORY_STYLES = {
	BHP: {backgroundColor: '#E6F6FF', color: '#0F5F7F'},
	PROCES: {backgroundColor: '#E9F7EF', color: '#2E7D32'},
	JAKOSC: {backgroundColor: '#FFF3E0', color: '#C16A00'},
	INNE: {backgroundColor: '#F2F4F8', color: '#4A5568'},
};

const Post = ({post, onPress}) => {
	const likes = post?.likes_count ?? post?.likes?.length ?? 0;
	const comments = post?.comments_count ?? post?.comments?.length ?? 0;
	const imageUrls = Array.isArray(post?.image_urls)
		? post.image_urls
		: Array.isArray(post?.images)
			? post.images
			: [];
	const primaryImage = imageUrls[0];
	const extraImagesCount = Math.max(0, imageUrls.length - 1);
	const categoryKey = post?.category || 'INNE';
	const categoryStyle = CATEGORY_STYLES[categoryKey] || CATEGORY_STYLES.INNE;

	return (
		<Pressable
			onPress={onPress}
			style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
		>
			<View style={styles.accent} />
			<View style={styles.headerRow}>
				<View style={styles.headerMain}>
					<Text style={[styles.category, categoryStyle]}>{post?.category || 'Post'}</Text>
					<Text style={styles.title}>{post?.title || 'Bez tytułu'}</Text>
					<Text style={styles.excerpt} numberOfLines={2} ellipsizeMode="tail">
						{post?.content || 'No content'}
					</Text>
				</View>
				{primaryImage ? (
					<View style={styles.thumbContainer}>
						<View style={styles.thumbWrapper}>
							<Image source={{uri: primaryImage}} style={styles.thumb} />
						</View>
						{extraImagesCount > 0 ? (
							<View style={styles.thumbBadge}>
								<Text style={styles.thumbBadgeText}>+{extraImagesCount}</Text>
							</View>
						) : null}
					</View>
				) : null}
			</View>
			<View style={styles.metaRow}>
				<View style={styles.metaItem}>
					<Feather name="user" size={14} color={colors.muted} />
					<Text style={styles.meta}>Author: {post?.author?.nickname || 'Unknown'}</Text>
				</View>
				<View style={styles.metaStats}>
					<View style={styles.metaItem}>
						<Feather name="heart" size={14} color={colors.danger} />
						<Text style={styles.meta}>{likes}</Text>
					</View>
					<View style={styles.metaItem}>
						<Feather name="message-circle" size={14} color={colors.primary} />
						<Text style={styles.meta}>{comments}</Text>
					</View>
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
		borderRadius: 12,
		borderColor: colors.borderMuted,
		borderWidth: 1,
		backgroundColor: colors.surface,
		padding: 16,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowOffset: {width: 0, height: 4},
		shadowRadius: 8,
		elevation: 3,
	},
	category: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.primary,
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: colors.badgeBackground,
		alignSelf: 'flex-start',
	},
	title: {
		marginTop: 10,
		fontSize: 18,
		fontWeight: '800',
		color: colors.text,
	},
	excerpt: {
		fontSize: 14,
		lineHeight: 20,
		color: colors.muted,
	},
	metaRow: {
		marginTop: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	meta: {
		fontSize: 12,
		color: colors.muted,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	metaStats: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	accent: {
		position: 'absolute',
		left: 0,
		top: 10,
		bottom: 10,
		width: 4,
		backgroundColor: colors.primary,
		borderRadius: 4,
	},
	cardPressed: {
		transform: [{scale: 0.995}],
		shadowOpacity: 0.08,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 12,
	},
	headerMain: {
		flex: 1,
		minWidth: 0,
		gap: 6,
	},
	thumbWrapper: {
		width: 68,
		height: 68,
		borderRadius: 14,
		overflow: 'hidden',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	thumbContainer: {
		width: 68,
		height: 68,
		position: 'relative',
	},
	thumb: {
		width: '100%',
		height: '100%',
	},
	thumbBadge: {
		position: 'absolute',
		right: -6,
		top: -6,
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderWidth: 1,
		borderColor: colors.surface,
	},
	thumbBadgeText: {
		color: colors.surface,
		fontSize: 12,
		fontWeight: '700',
	},
});
