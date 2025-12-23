import {Alert, Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useEffect, useState} from 'react';
import Button from 'components/Button/Button';
import Input from 'components/Input/Input';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

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
	isUpdating = false,
	isDeleting = false,
}) => {
	if (!comment) return null;
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(comment.text ?? '');
	const [error, setError] = useState(null);

	useEffect(() => {
		setDraft(comment.text ?? '');
	}, [comment.text]);

	const handleEditPress = () => {
		setError(null);
		setIsEditing(true);
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
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.authorRow}>
					<Feather name="user" size={14} color={colors.muted} />
					<Text style={styles.author}>{comment.author?.nickname || 'Anon'}</Text>
				</View>
				<View style={styles.metaRow}>
					<Text style={styles.date}>{formatDate(comment.created_at)}</Text>
					{isOwner ? (
						<View style={styles.actions}>
							<Pressable
								onPress={handleEditPress}
								disabled={actionsDisabled}
								style={({pressed}) => [
									styles.iconButton,
									pressed && !actionsDisabled ? styles.iconButtonPressed : null,
								]}
							>
								<Feather name="edit-2" size={14} color={colors.primary} />
							</Pressable>
							<Pressable
								onPress={handleDelete}
								disabled={actionsDisabled}
								style={({pressed}) => [
									styles.iconButton,
									styles.iconButtonDanger,
									pressed && !actionsDisabled ? styles.iconButtonPressed : null,
								]}
							>
								<Feather name="trash-2" size={14} color={colors.danger} />
							</Pressable>
						</View>
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
					<Text style={styles.text}>{comment.text}</Text>
					{error ? <Text style={styles.error}>{error}</Text> : null}
				</>
			)}
		</View>
	);
};

export default CommentItem;

const styles = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderColor: colors.borderMuted,
		borderRadius: 12,
		backgroundColor: colors.surface,
		padding: 12,
		gap: 6,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	authorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	author: {
		fontWeight: '700',
		color: colors.text,
	},
	date: {
		fontSize: 12,
		color: colors.muted,
	},
	text: {
		fontSize: 14,
		color: colors.text,
		lineHeight: 20,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
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
	error: {
		color: colors.danger,
		fontSize: 12,
		fontWeight: '600',
	},
});
