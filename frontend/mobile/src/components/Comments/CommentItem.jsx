import {StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const formatDate = (value) => {
	if (!value) return '';
	const date = new Date(value);
	return date.toLocaleString(undefined, {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
};

const CommentItem = ({comment}) => {
	if (!comment) return null;
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.authorRow}>
					<Feather name="user" size={14} color={colors.muted} />
					<Text style={styles.author}>{comment.author?.nickname || 'Anon'}</Text>
				</View>
				<Text style={styles.date}>{formatDate(comment.created_at)}</Text>
			</View>
			<Text style={styles.text}>{comment.text}</Text>
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
});
