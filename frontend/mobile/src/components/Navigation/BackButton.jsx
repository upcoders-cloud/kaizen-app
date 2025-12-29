import {Pressable, StyleSheet, Text} from 'react-native';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';

const BackButton = ({onPress, label = 'Wróć'}) => (
	<Pressable onPress={onPress} style={styles.button}>
		<Feather name="arrow-left" size={18} color={colors.primary} />
		<Text style={styles.text}>{label}</Text>
	</Pressable>
);

export default BackButton;

const styles = StyleSheet.create({
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
	},
	text: {
		color: colors.primary,
		fontWeight: '600',
	},
});
