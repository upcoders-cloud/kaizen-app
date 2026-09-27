import {Pressable, StyleSheet, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';
import {Card} from 'components/ui';

const RewardCard = ({reward, onRedeem, redeeming}) => {
	const soldOut = reward.stock != null && reward.stock <= 0;
	const disabled = soldOut || !reward.affordable || redeeming;
	const iconName = reward.icon && Feather.glyphMap[reward.icon] ? reward.icon : 'gift';
	return (
		<Card style={styles.card} padded={false}>
			<View style={styles.iconWrap}>
				<Feather name={iconName} size={22} color={colors.primary} />
			</View>
			<View style={{flex: 1}}>
				<Text style={styles.name}>{reward.name}</Text>
				{reward.description ? (
					<Text style={styles.desc} numberOfLines={2}>{reward.description}</Text>
				) : null}
				<Text style={styles.meta}>
					{reward.cost_points} pkt
					{reward.stock != null ? ` · zostało ${reward.stock}` : ''}
				</Text>
			</View>
			<Pressable
				onPress={() => onRedeem?.(reward)}
				disabled={disabled}
				style={({pressed}) => [
					styles.btn,
					disabled ? styles.btnDisabled : null,
					pressed && !disabled ? styles.btnPressed : null,
				]}
			>
				<Text style={[styles.btnText, disabled ? styles.btnTextDisabled : null]}>
					{soldOut ? 'Brak' : reward.affordable ? 'Wymień' : 'Za mało pkt'}
				</Text>
			</Pressable>
		</Card>
	);
};

export default RewardCard;

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	iconWrap: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: colors.primarySoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	name: {fontSize: 14, fontWeight: '700', color: colors.text},
	desc: {fontSize: 12, color: colors.muted, marginTop: 2},
	meta: {fontSize: 12, fontWeight: '700', color: colors.primary, marginTop: 4},
	btn: {
		paddingHorizontal: 14,
		paddingVertical: 9,
		borderRadius: 10,
		backgroundColor: colors.primary,
	},
	btnPressed: {opacity: 0.8},
	btnDisabled: {backgroundColor: colors.border},
	btnText: {fontSize: 13, fontWeight: '800', color: colors.white},
	btnTextDisabled: {color: colors.muted},
});
