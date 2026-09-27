import {Feather} from '@expo/vector-icons';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import colors from 'theme/colors';
import {radius, spacing, typography} from 'theme/theme';

const ErrorState = ({title = 'Nie udało się wczytać danych', description, onRetry, style}) => (
	<View style={[styles.base, style]}>
		<Feather name="alert-circle" size={28} color={colors.danger} />
		<Text style={styles.title}>{title}</Text>
		{description ? <Text style={styles.description}>{description}</Text> : null}
		{onRetry ? <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button"><Text style={styles.retryText}>Spróbuj ponownie</Text></Pressable> : null}
	</View>
);
export default ErrorState;
const styles = StyleSheet.create({
	base: {alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.sm},
	title: {...typography.subtitle, color: colors.text, textAlign: 'center'},
	description: {...typography.body, color: colors.textMuted, textAlign: 'center'},
	retry: {marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary},
	retryText: {...typography.bodyStrong, color: colors.white},
});
