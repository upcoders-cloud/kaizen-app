import {useState} from 'react';
import {LayoutAnimation, Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import CommentItem from './CommentItem';
import colors from 'theme/colors';

const CommentsList = ({
	tree = [],
	currentUserId,
	onUpdate,
	onDelete,
	onReply,
	updatingId,
	deletingId,
	onCommentLayout,
	highlightedCommentId,
}) => {
	const [expandedThreads, setExpandedThreads] = useState(() => new Set());

	const toggleThread = (rootId) => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setExpandedThreads((prev) => {
			const next = new Set(prev);
			if (next.has(rootId)) {
				next.delete(rootId);
			} else {
				next.add(rootId);
			}
			return next;
		});
	};

	const findRootIdForComment = (commentId) => {
		if (commentId == null) return null;
		const match = tree.find(
			(group) =>
				String(group.root?.id) === String(commentId) ||
				group.replies?.some((r) => String(r.id) === String(commentId))
		);
		return match?.root?.id ?? null;
	};

	const handleReply = (comment) => {
		const rootId = findRootIdForComment(comment?.id);
		if (rootId != null && !expandedThreads.has(rootId)) {
			setExpandedThreads((prev) => new Set(prev).add(rootId));
		}
		onReply?.(comment);
	};

	if (!tree.length) {
		return (
			<View style={styles.empty}>
				<Text style={styles.emptyText}>Brak komentarzy — bądź pierwszy!</Text>
			</View>
		);
	}

	const renderNode = ({comment, isReply = false, replyToNickname = null}) => {
		const commentId = comment?.id;
		const key = commentId ?? `${comment.created_at}-${Math.random()}`;
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
					onReply={handleReply}
					isUpdating={updatingId === commentId}
					isDeleting={deletingId === commentId}
					isHighlighted={isHighlighted}
					isReply={isReply}
					replyToNickname={replyToNickname}
				/>
			</View>
		);
	};

	return (
		<View style={styles.list}>
			{tree.map((group, groupIndex) => {
				const isLastGroup = groupIndex === tree.length - 1;
				const rootId = group.root?.id;
				const replies = group.replies || [];
				const hasReplies = replies.length > 0;
				const isExpanded = rootId != null && expandedThreads.has(rootId);
				return (
					<View key={rootId ?? groupIndex} style={styles.threadGroup}>
						{renderNode({comment: group.root})}
						{hasReplies ? (
							<Pressable
								onPress={() => toggleThread(rootId)}
								style={({pressed}) => [styles.toggleRow, pressed ? styles.toggleRowPressed : null]}
							>
								<Feather
									name={isExpanded ? 'chevron-up' : 'chevron-down'}
									size={14}
									color={colors.primary}
								/>
								<Text style={styles.toggleText}>
									{isExpanded
										? 'Ukryj odpowiedzi'
										: `Pokaż ${replies.length} ${replies.length === 1 ? 'odpowiedź' : replies.length < 5 ? 'odpowiedzi' : 'odpowiedzi'}`}
								</Text>
							</Pressable>
						) : null}
						{hasReplies && isExpanded
							? replies.map((reply) =>
									renderNode({
										comment: reply,
										isReply: true,
										replyToNickname: reply.replyToNickname,
									})
							  )
							: null}
						{!isLastGroup ? <View style={styles.separator} /> : null}
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
	threadGroup: {
		gap: 0,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 8,
		marginLeft: 16,
		alignSelf: 'flex-start',
	},
	toggleRowPressed: {
		opacity: 0.6,
	},
	toggleText: {
		color: colors.primary,
		fontSize: 13,
		fontWeight: '600',
	},
	separator: {
		height: 1,
		backgroundColor: colors.border,
		marginVertical: 4,
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
