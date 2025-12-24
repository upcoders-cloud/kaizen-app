import {StyleSheet, View} from 'react-native';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {getPostStatusMeta} from 'utils/postStatus';

const formatDate = (value) => {
	if (!value) return 'Unknown date';
	const date = new Date(value);
	return date.toLocaleString(undefined, {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
};

const PostHeader = ({post}) => {
	if (!post) return null;
	const statusMeta = getPostStatusMeta(post?.status);
	return (
		<View style={styles.container}>
			<View style={styles.row}>
				<Text style={styles.category}>{post.category || 'Post'}</Text>
				<Text
					style={[
						styles.statusBadge,
						{color: statusMeta.color, backgroundColor: statusMeta.backgroundColor},
					]}
				>
					{statusMeta.label}
				</Text>
				<Text style={styles.badge}>#{post.id}</Text>
			</View>
			<Text style={styles.title}>{post.title || 'Bez tytułu'}</Text>
			<Text style={styles.author}>{post.author?.nickname || 'Anon'}</Text>
			<Text style={styles.meta}>{formatDate(post.created_at)}</Text>
		</View>
	);
};

export default PostHeader;

const styles = StyleSheet.create({
	container: {
		gap: 6,
		padding: 16,
		borderRadius: 14,
		backgroundColor: '#f6f8ff',
		borderWidth: 1,
		borderColor: '#e2e8f4',
		shadowColor: '#1d2b64',
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: {width: 0, height: 6},
		elevation: 3,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	category: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.primary,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
		backgroundColor: '#e7edff',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	statusBadge: {
		fontSize: 11,
		fontWeight: '700',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	badge: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.muted,
	},
	title: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.text,
	},
	author: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	meta: {
		fontSize: 13,
		color: colors.muted,
	},
});
