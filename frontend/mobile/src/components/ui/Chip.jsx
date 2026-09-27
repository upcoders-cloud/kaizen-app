import {Pressable, StyleSheet, Text} from 'react-native';
import colors from 'theme/colors';
import {radius, spacing, typography} from 'theme/theme';

const Chip = ({label, selected = false, onPress, style, textStyle, ...props}) => (
	<Pressable accessibilityRole={onPress ? 'button' : 'text'} accessibilityState={onPress ? {selected} : undefined} disabled={!onPress} onPress={onPress}
		style={({pressed}) => [styles.base, selected && styles.selected, pressed && styles.pressed, style]} {...props}>
		<Text style={[styles.label, selected && styles.selectedLabel, textStyle]}>{label}</Text>
	</Pressable>
);
export default Chip;
const styles = StyleSheet.create({
	base: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignSelf: 'flex-start'},
	selected: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
	pressed: {opacity: 0.75},
	label: {...typography.caption, color: colors.textMuted, fontWeight: '700'},
	selectedLabel: {color: colors.primary},
});
