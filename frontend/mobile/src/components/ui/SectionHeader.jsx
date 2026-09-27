import {StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';
import {spacing, typography} from 'theme/theme';

const SectionHeader = ({title, subtitle, action, style}) => (
	<View style={[styles.base, style]}>
		<View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
		{action || null}
	</View>
);
export default SectionHeader;
const styles = StyleSheet.create({
	base: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md},
	copy: {flex: 1, gap: spacing.xs},
	title: {...typography.subtitle, color: colors.text},
	subtitle: {...typography.caption, color: colors.textMuted},
});
