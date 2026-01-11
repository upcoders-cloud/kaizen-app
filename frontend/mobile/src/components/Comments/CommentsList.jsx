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
	onCommentLayout,
	highlightedCommentId,
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
			{comments.map((comment, index) => {
				const commentId = comment?.id;
				const key = commentId ?? `${comment.created_at}-${index}`;
				const isLast = index === comments.length - 1;
				const isHighlighted =
					highlightedCommentId != null && commentId != null
						? String(commentId) === String(highlightedCommentId)
						: false;
				return (
					<View
						key={key}
						onLayout={
							onCommentLayout && commentId != null
								? (event) => onCommentLayout(commentId, event.nativeEvent.layout.y)
								: undefined
						}
					>
						<CommentItem
							comment={comment}
							isOwner={String(comment?.author?.id) === String(currentUserId)}
							onEdit={onUpdate}
							onDelete={onDelete}
							isUpdating={updatingId === comment?.id}
							isDeleting={deletingId === comment?.id}
							isHighlighted={isHighlighted}
						/>
						{!isLast ? <View style={styles.separator} /> : null}
					</View>
				);
			})}
		</View>
	);
};

export default CommentsList;

const styles = StyleSheet.create({
	list: {
		gap: 0,
	},
	separator: {
		height: 1,
		backgroundColor: colors.border,
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
