import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const PostActions = ({likes = 0, comments = 0, isLiked = false, onLikePress, disabled = false}) => {
	return (
		<View style={styles.container}>
			<Pressable
				onPress={onLikePress}
				disabled={disabled}
				style={({pressed}) => [
					styles.likeButton,
					isLiked ? styles.likeActive : null,
					pressed && !disabled ? styles.likePressed : null,
				]}
			>
				<Feather
					name="heart"
					size={18}
					color={isLiked ? colors.white : colors.danger}
				/>
				<Text style={[styles.likeText, isLiked ? styles.likeTextActive : null]}>{likes}</Text>
			</Pressable>
			<View style={styles.stat}>
				<Feather name="message-circle" size={18} color={colors.primary} />
				<Text style={styles.statText}>{comments} komentarzy</Text>
			</View>
		</View>
	);
};

export default PostActions;

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 12,
		borderRadius: 12,
		backgroundColor: colors.surfaceAlt,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 12,
	},
	likeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.danger,
		backgroundColor: colors.dangerSoft,
	},
	likeActive: {
		backgroundColor: colors.danger,
		borderColor: colors.danger,
	},
	likePressed: {
		transform: [{scale: 0.98}],
		opacity: 0.95,
	},
	likeText: {
		fontWeight: '700',
		color: colors.danger,
	},
	likeTextActive: {
		color: colors.white,
	},
	stat: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	statText: {
		color: colors.muted,
		fontWeight: '600',
	},
});
