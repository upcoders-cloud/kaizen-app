import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const CommentInput = ({
	value,
	onChangeText,
	onSubmit,
	loading = false,
	error,
	onFocus,
	replyingTo = null,
	onCancelReply,
}) => {
	const isReply = Boolean(replyingTo);
	return (
		<View style={styles.container}>
			{isReply ? (
				<View style={styles.replyBanner}>
					<Feather name="corner-down-right" size={14} color={colors.primary} />
					<Text style={styles.replyBannerText}>
						Odpowiadasz <Text style={styles.replyBannerNick}>@{replyingTo.nickname}</Text>
					</Text>
					<View style={{flex: 1}} />
					<Pressable onPress={onCancelReply} hitSlop={8} style={styles.replyCancel}>
						<Feather name="x" size={14} color={colors.muted} />
					</Pressable>
				</View>
			) : null}
			<Input
				label={isReply ? 'Twoja odpowiedź' : 'Twój komentarz'}
				value={value}
				onChangeText={onChangeText}
				multiline
				numberOfLines={3}
				placeholder={isReply ? `Odpowiedź do @${replyingTo.nickname}...` : 'Podziel się opinią...'}
				style={styles.inputWrapper}
				inputStyle={styles.input}
				error={error}
				onFocus={onFocus}
			/>
			<Button
				title={isReply ? 'Wyślij odpowiedź' : 'Dodaj komentarz'}
				onPress={onSubmit}
				loading={loading}
				leftIcon={<Feather name="send" size={16} color="#fff" />}
				style={styles.button}
			/>
		</View>
	);
};

export default CommentInput;

const styles = StyleSheet.create({
	container: {
		gap: 12,
		paddingVertical: 8,
	},
	replyBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: colors.placeholderSurface,
		borderWidth: 1,
		borderColor: colors.borderMuted,
	},
	replyBannerText: {
		fontSize: 13,
		color: colors.text,
	},
	replyBannerNick: {
		color: colors.primary,
		fontWeight: '700',
	},
	replyCancel: {
		padding: 4,
	},
	inputWrapper: {
		marginBottom: 0,
	},
	input: {
		minHeight: 80,
	},
	button: {
		alignSelf: 'flex-end',
		paddingHorizontal: 16,
	},
});
