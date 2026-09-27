import {Feather} from '@expo/vector-icons';
import {StyleSheet, View} from 'react-native';
import colors from 'theme/colors';
import {radius} from 'theme/theme';
import PressableScale from './PressableScale';

const IconButton = ({icon, onPress, accessibilityLabel, color = colors.primary, size = 20, variant = 'ghost', style, disabled, children}) => (
	<PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel || icon} disabled={disabled} style={style}>
		<View style={[styles.base, variant === 'surface' && styles.surface, disabled && styles.disabled]}>
			{children || <Feather name={icon} size={size} color={color} />}
		</View>
	</PressableScale>
);
export default IconButton;
const styles = StyleSheet.create({
	base: {width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
	surface: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
	disabled: {opacity: 0.45},
});
