import {Text as RNText, StyleSheet} from 'react-native';
import colors from 'theme/colors';

const Text = ({style, children, ...rest}) => {
	return (
		<RNText style={[styles.base, style]} {...rest}>
			{children}
		</RNText>
	);
};

export default Text;

const styles = StyleSheet.create({
	base: {
		color: colors.text,
		fontSize: 14,
	},
});
