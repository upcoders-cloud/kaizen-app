import {StyleSheet, View} from 'react-native';
import Button from 'components/Button/Button';
import colors from 'theme/colors';

const OptionPills = ({options = [], value, onChange, style}) => (
	<View style={[styles.row, style]}>
		{options.map((option) => {
			const isActive = option.value === value;
			return (
				<Button
					key={option.value}
					title={option.label}
					variant="ghost"
					onPress={() => onChange?.(option.value)}
					style={[styles.button, isActive ? styles.buttonActive : styles.buttonInactive]}
					textStyle={isActive ? styles.textActive : styles.text}
				/>
			);
		})}
	</View>
);

export default OptionPills;

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	button: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		minHeight: 32,
		borderRadius: 999,
		borderWidth: 1,
	},
	buttonInactive: {
		backgroundColor: '#f8fafc',
		borderColor: colors.border,
	},
	buttonActive: {
		backgroundColor: '#eef2ff',
		borderColor: '#c7d2fe',
	},
	text: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.muted,
	},
	textActive: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.primary,
	},
});
