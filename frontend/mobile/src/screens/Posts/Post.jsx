import {StyleSheet, Text, View} from 'react-native';

const Post = ({post}) => {
	return (
		<View style={styles.card}>
			<Text style={styles.category}>{post?.category || 'Post'}</Text>
			<Text style={styles.content}>{post?.content || 'No content'}</Text>
			<View style={styles.metaRow}>
				<Text style={styles.meta}>Author: {post?.author?.nickname || 'Unknown'}</Text>
				<Text style={styles.meta}>
					Likes: {post?.likes_count ?? post?.likes?.length ?? 0} · Comments:{' '}
					{post?.comments_count ?? post?.comments?.length ?? 0}
				</Text>
			</View>
		</View>
	);
};

export default Post;

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		padding: 14,
		borderRadius: 12,
		borderColor: '#e3e8ef',
		borderWidth: 1,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowOffset: {width: 0, height: 2},
		shadowRadius: 6,
		elevation: 2,
	},
	category: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1d8cf8',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	content: {
		marginTop: 8,
		fontSize: 16,
		lineHeight: 22,
		color: '#1b2a41',
	},
	metaRow: {
		marginTop: 10,
		flexDirection: 'column',
		gap: 4,
	},
	meta: {
		fontSize: 12,
		color: '#6c7a92',
	},
});
