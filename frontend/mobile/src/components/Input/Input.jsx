import {StyleSheet, TextInput, View} from 'react-native';
import colors from 'theme/colors';
import Text from 'components/Text/Text';

const Input = ({
	label,
	error,
	helperText,
	style,
	inputStyle,
	labelStyle,
	errorStyle,
	helperTextStyle,
	...rest
}) => {
	return (
		<View style={[styles.container, style]}>
			{label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
			<TextInput
				style={[
					styles.input,
					rest.multiline ? styles.inputMultiline : null,
					inputStyle,
					error ? styles.inputError : null,
				]}
				placeholderTextColor={colors.muted}
				{...rest}
			/>
			{error ? (
				<Text style={[styles.error, errorStyle]}>{error}</Text>
			) : helperText ? (
				<Text style={[styles.helperText, helperTextStyle]}>{helperText}</Text>
			) : null}
		</View>
	);
};

export default Input;

const styles = StyleSheet.create({
	container: {
		gap: 6,
	},
	label: {
		fontWeight: '700',
		fontSize: 14,
		color: colors.text,
	},
	input: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: colors.text,
		backgroundColor: colors.surface,
	},
	inputMultiline: {
		minHeight: 120,
		textAlignVertical: 'top',
	},
	inputError: {
		borderColor: colors.danger,
	},
	helperText: {
		color: colors.muted,
		fontSize: 12,
	},
	error: {
		color: colors.danger,
		fontSize: 12,
		fontWeight: '600',
	},
});
