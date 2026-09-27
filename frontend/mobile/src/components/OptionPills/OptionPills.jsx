import {StyleSheet, View} from 'react-native';
import Button from 'components/Button/Button';
import colors from 'theme/colors';
import {radius} from 'theme/theme';

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
		borderRadius: radius.pill,
		borderWidth: 1,
	},
	buttonInactive: {
		backgroundColor: colors.surfaceAlt,
		borderColor: colors.border,
	},
	buttonActive: {
		backgroundColor: colors.primarySoft,
		borderColor: colors.primary,
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
