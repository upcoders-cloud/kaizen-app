import {Alert, Animated, Easing, LayoutAnimation, Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useEffect, useRef, useState} from 'react';
import Button from 'components/Button/Button';
import Input from 'components/Input/Input';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {splitMentions} from 'utils/mentions';

const MentionText = ({value, style}) => {
	const segments = splitMentions(value);
	if (!segments.length) return <Text style={style}>{value}</Text>;
	return (
		<Text style={style}>
			{segments.map((segment, idx) =>
				segment.type === 'mention' ? (
					<Text key={idx} style={styles.mention}>
						{segment.value}
					</Text>
				) : (
					<Text key={idx}>{segment.value}</Text>
				)
			)}
		</Text>
	);
};

const formatDate = (value) => {
	if (!value) return '';
	const date = new Date(value);
	return date.toLocaleString(undefined, {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
};

const CommentItem = ({
	comment,
	isOwner = false,
	onEdit,
	onDelete,
	onReply,
	isUpdating = false,
	isDeleting = false,
	isHighlighted = false,
	isReply = false,
	replyToNickname = null,
}) => {
	if (!comment) return null;
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(comment.text ?? '');
	const [error, setError] = useState(null);
	const [isPaddingActive, setIsPaddingActive] = useState(false);
	const highlightOpacity = useRef(new Animated.Value(0)).current;
	const highlightInset = isPaddingActive ? 8 : 0;

	useEffect(() => {
		setDraft(comment.text ?? '');
	}, [comment.text]);

	useEffect(() => {
		if (!isHighlighted) return;
		highlightOpacity.stopAnimation();
		highlightOpacity.setValue(1);
		Animated.timing(highlightOpacity, {
			toValue: 0,
			duration: 1500,
			easing: Easing.out(Easing.quad),
			useNativeDriver: true,
		}).start();
		setIsPaddingActive(true);
		const frameId = requestAnimationFrame(() => {
			LayoutAnimation.configureNext({
				duration: 1500,
				update: {type: LayoutAnimation.Types.easeOut},
			});
			setIsPaddingActive(false);
		});
		return () => cancelAnimationFrame(frameId);
	}, [highlightOpacity, isHighlighted]);

	const handleEditPress = () => {
		setError(null);
		setIsEditing(true);
	};

	const handleOpenMenu = () => {
		Alert.alert('Komentarz', null, [
			{text: 'Edytuj', onPress: handleEditPress},
			{text: 'Usuń', style: 'destructive', onPress: handleDelete},
			{text: 'Anuluj', style: 'cancel'},
		]);
	};

	const handleCancel = () => {
		setDraft(comment.text ?? '');
		setError(null);
		setIsEditing(false);
	};

	const handleSave = async () => {
		const text = draft.trim();
		if (!text) {
			setError('Treść komentarza jest wymagana');
			return;
		}
		setError(null);
		const result = await onEdit?.(comment.id, text);
		if (!result?.success) {
			setError(result?.error || 'Nie udało się zaktualizować komentarza');
			return;
		}
		setIsEditing(false);
	};

	const handleDelete = () => {
		if (!onDelete) return;
		Alert.alert('Usuń komentarz', 'Na pewno usunąć ten komentarz?', [
			{text: 'Anuluj', style: 'cancel'},
			{
				text: 'Usuń',
				style: 'destructive',
				onPress: async () => {
					const result = await onDelete(comment.id);
					if (!result?.success) {
						setError(result?.error || 'Nie udało się usunąć komentarza');
					}
				},
			},
		]);
	};

	const actionsDisabled = isUpdating || isDeleting;
	return (
		<View style={[styles.container, isReply ? styles.containerReply : null]}>
			<Animated.View
				style={[
					styles.highlightOverlay,
					{
						opacity: highlightOpacity,
						left: highlightInset,
						right: highlightInset,
					},
				]}
				pointerEvents="none"
			/>
			<View style={[styles.content, {paddingHorizontal: highlightInset}]}>
				<View style={styles.header}>
					<View style={styles.authorBlock}>
						<View style={styles.authorRow}>
							<Feather name="user" size={14} color={colors.muted} />
							<Text style={styles.author} numberOfLines={1}>
								{comment.author?.nickname || 'Anonim'}
							</Text>
							{replyToNickname ? (
								<View style={styles.replyTag}>
									<Feather name="corner-down-right" size={11} color={colors.muted} />
									<Text style={styles.replyTagText} numberOfLines={1}>
										@{replyToNickname}
									</Text>
								</View>
							) : null}
						</View>
						<Text style={styles.date} numberOfLines={1}>
							{formatDate(comment.created_at)}
						</Text>
					</View>
					<View style={styles.metaRow}>
						{onReply ? (
							<Pressable
								onPress={() => onReply(comment)}
								disabled={actionsDisabled}
								hitSlop={8}
								style={({pressed}) => [
									styles.iconButton,
									pressed && !actionsDisabled ? styles.iconButtonPressed : null,
								]}
							>
								<Feather name="message-circle" size={14} color={colors.primary} />
							</Pressable>
						) : null}
						{isOwner ? (
							<Pressable
								onPress={handleOpenMenu}
								disabled={actionsDisabled}
								hitSlop={8}
								style={({pressed}) => [
									styles.iconButton,
									pressed && !actionsDisabled ? styles.iconButtonPressed : null,
								]}
							>
								<Feather name="more-vertical" size={16} color={colors.muted} />
							</Pressable>
						) : null}
					</View>
				</View>
				{isEditing ? (
					<View style={styles.editSection}>
						<Input
							label="Edytuj komentarz"
							value={draft}
							onChangeText={setDraft}
							multiline
							numberOfLines={3}
							error={error}
							style={styles.editInput}
						/>
						<View style={styles.editActions}>
							<Button
								title="Anuluj"
								variant="outline"
								onPress={handleCancel}
								disabled={actionsDisabled}
								style={styles.editButton}
								textStyle={styles.editButtonText}
							/>
							<Button
								title="Zapisz"
								onPress={handleSave}
								loading={isUpdating}
								disabled={actionsDisabled}
								style={styles.editButton}
								textStyle={styles.editButtonText}
							/>
						</View>
					</View>
				) : (
					<>
						<MentionText value={comment.text} style={styles.text} />
						{error ? <Text style={styles.error}>{error}</Text> : null}
					</>
				)}
			</View>
		</View>
	);
};

export default CommentItem;

const styles = StyleSheet.create({
	container: {
		paddingVertical: 12,
		position: 'relative',
	},
	containerReply: {
		paddingLeft: 24,
		borderLeftWidth: 2,
		borderLeftColor: colors.borderMuted,
		marginLeft: 8,
	},
	content: {
		gap: 6,
	},
	mention: {
		color: colors.primary,
		fontWeight: '600',
	},
	replyTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		backgroundColor: colors.placeholderSurface,
		flexShrink: 1,
	},
	replyTagText: {
		fontSize: 11,
		color: colors.muted,
		fontWeight: '600',
		flexShrink: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 8,
	},
	authorBlock: {
		flex: 1,
		gap: 2,
	},
	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 1,
	},
	author: {
		fontWeight: '700',
		color: colors.text,
		flexShrink: 1,
	},
	date: {
		fontSize: 12,
		color: colors.muted,
		marginLeft: 20,
	},
	text: {
		fontSize: 14,
		color: colors.text,
		lineHeight: 20,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		flexShrink: 0,
	},
	actions: {
		flexDirection: 'row',
		gap: 6,
	},
	iconButton: {
		width: 28,
		height: 28,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.borderMuted,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.placeholderSurface,
	},
	iconButtonDanger: {
		borderColor: colors.dangerMuted ?? colors.borderMuted,
		backgroundColor: colors.dangerSurface ?? colors.placeholderSurface,
	},
	iconButtonPressed: {
		opacity: 0.7,
	},
	editSection: {
		gap: 10,
	},
	editInput: {
		marginBottom: 0,
	},
	editActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 8,
	},
	editButton: {
		minHeight: 36,
		paddingHorizontal: 12,
	},
	editButtonText: {
		fontSize: 14,
	},
	highlightOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: '#e7f3ff',
		borderColor: '#c7e2ff',
		borderRadius: 10,
		borderWidth: 1,
	},
	error: {
		color: colors.danger,
		fontSize: 12,
		fontWeight: '600',
	},
});
