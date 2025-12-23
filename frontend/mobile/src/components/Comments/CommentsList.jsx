import {StyleSheet, View} from 'react-native';
import Text from 'components/Text/Text';
import CommentItem from './CommentItem';
import colors from 'theme/colors';

const CommentsList = ({
	comments = [],
	currentUserId,
	onUpdate,
	onDelete,
	updatingId,
	deletingId,
}) => {
	if (!comments.length) {
		return (
			<View style={styles.empty}>
				<Text style={styles.emptyText}>Brak komentarzy — bądź pierwszy!</Text>
			</View>
		);
	}

	return (
		<View style={styles.list}>
			{comments.map((comment, index) => (
				<CommentItem
					key={comment.id ?? `${comment.created_at}-${index}`}
					comment={comment}
					isOwner={String(comment?.author?.id) === String(currentUserId)}
					onEdit={onUpdate}
					onDelete={onDelete}
					isUpdating={updatingId === comment?.id}
					isDeleting={deletingId === comment?.id}
				/>
			))}
		</View>
	);
};

export default CommentsList;

const styles = StyleSheet.create({
	list: {
		gap: 10,
	},
	empty: {
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: colors.border,
		padding: 12,
		borderRadius: 10,
		backgroundColor: colors.placeholderSurface,
	},
	emptyText: {
		color: colors.muted,
	},
});
