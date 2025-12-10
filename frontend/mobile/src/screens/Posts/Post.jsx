import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';

const Post = ({post, onPress}) => {
	const likes = post?.likes_count ?? post?.likes?.length ?? 0;
	const comments = post?.comments_count ?? post?.comments?.length ?? 0;

	return (
		<Pressable
			onPress={onPress}
			style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
		>
			<View style={styles.accent} />
			<View style={styles.headerRow}>
				<Text style={styles.category}>{post?.category || 'Post'}</Text>
			</View>
			<Text style={styles.content}>{post?.content || 'No content'}</Text>
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
	content: {
		marginTop: 12,
		fontSize: 16,
		lineHeight: 22,
		color: colors.text,
	},
	metaRow: {
		marginTop: 12,
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
		alignItems: 'center',
	},
});
