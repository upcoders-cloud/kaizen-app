import {Animated, Pressable, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import TextBase from 'components/Text/Text';
import CommentsList from 'components/Comments/CommentsList';
import CommentInput from 'components/Comments/CommentInput';
import {Card} from 'components/ui';
import colors from 'theme/colors';
import styles from './detailStyles';

const COMMENTS_PREVIEW_COUNT = 2;

export default function PostDiscussion({likeScale, handleToggleLike, liking, loading, isLiked, likesCount, scrollToComments, comments, setCommentsLayoutY, commentTree, showAllComments, handleToggleComments, totalCommentsCount, visibleTree, currentUserId, handleUpdateComment, handleDeleteComment, handleStartReply, updatingCommentId, deletingCommentId, handleCommentLayout, highlightCommentId, commentValue, setCommentValue, handleSubmitComment, submittingComment, commentError, handleCommentFocus, replyingTo, handleCancelReply}) {
	return (
		<>
			{/* Actions row */}
			<View style={styles.actionsRow}>
				<Animated.View style={[styles.actionButtonWrapper, {transform: [{scale: likeScale}]}]}>
					<Pressable
						onPress={handleToggleLike}
						disabled={liking || loading}
						style={({pressed}) => [
							styles.actionButton,
							isLiked ? styles.actionButtonActive : null,
							pressed && !(liking || loading) ? styles.actionButtonPressed : null,
						]}
					>
						<Feather name="thumbs-up" size={16} color={isLiked ? colors.white : colors.primary} />
						<TextBase style={[styles.actionButtonText, isLiked ? styles.actionButtonTextActive : null]}>
							Mam to samo
						</TextBase>
						<TextBase style={[styles.actionCount, isLiked ? styles.actionButtonTextActive : null]}>
							{likesCount}
						</TextBase>
					</Pressable>
				</Animated.View>
				<Pressable style={styles.actionButton} onPress={scrollToComments}>
					<Feather name="message-circle" size={16} color={colors.primary} />
					<TextBase style={styles.actionButtonText}>Komentarze</TextBase>
					<TextBase style={styles.actionCount}>{comments.length}</TextBase>
				</Pressable>
			</View>

			{/* Comments card */}
			<Card
				style={styles.commentsCard}
				padded={false}
				onLayout={(event) => setCommentsLayoutY(event.nativeEvent.layout.y)}
			>
				<View style={styles.cardHeader}>
					<View style={styles.cardIconCircle}>
						<Feather name="message-circle" size={14} color={colors.primary} />
					</View>
					<TextBase style={styles.cardTitle}>Komentarze</TextBase>
					{comments.length > 0 ? (
						<View style={styles.countBadge}>
							<TextBase style={styles.countBadgeText}>{comments.length}</TextBase>
						</View>
					) : null}
					<View style={{flex: 1}} />
					{commentTree.length > COMMENTS_PREVIEW_COUNT ? (
						<Pressable onPress={handleToggleComments}>
							<TextBase style={styles.showAllText}>
								{showAllComments ? 'Mniej' : `Wszystkie (${totalCommentsCount})`}
							</TextBase>
						</Pressable>
					) : null}
				</View>
				<CommentsList
					tree={visibleTree}
					currentUserId={currentUserId}
					onUpdate={handleUpdateComment}
					onDelete={handleDeleteComment}
					onReply={handleStartReply}
					updatingId={updatingCommentId}
					deletingId={deletingCommentId}
					onCommentLayout={handleCommentLayout}
					highlightedCommentId={highlightCommentId}
				/>
				<CommentInput
					value={commentValue}
					onChangeText={setCommentValue}
					onSubmit={handleSubmitComment}
					loading={submittingComment}
					error={commentError}
					onFocus={handleCommentFocus}
					replyingTo={replyingTo}
					onCancelReply={handleCancelReply}
				/>
			</Card>
		</>
	);
}
