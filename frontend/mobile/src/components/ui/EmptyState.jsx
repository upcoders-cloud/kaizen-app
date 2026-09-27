import {Feather} from '@expo/vector-icons';
import {StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';
import {spacing, typography} from 'theme/theme';

const EmptyState = ({icon = 'inbox', title = 'Nic tu jeszcze nie ma', description, action, style}) => (
	<View style={[styles.base, style]}>
		<View style={styles.icon}><Feather name={icon} size={26} color={colors.primary} /></View>
		<Text style={styles.title}>{title}</Text>
		{description ? <Text style={styles.description}>{description}</Text> : null}
		{action || null}
	</View>
);
export default EmptyState;
const styles = StyleSheet.create({
	base: {alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.sm},
	icon: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: spacing.sm},
	title: {...typography.subtitle, color: colors.text, textAlign: 'center'},
	description: {...typography.body, color: colors.textMuted, textAlign: 'center'},
});
