import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import Text from 'components/Text/Text';
import colors from 'theme/colors';

const Ranking = () => {
	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Text style={styles.title}>Ranking</Text>
				</View>

				<View style={styles.placeholderCard}>
					<View style={styles.iconWrapper}>
						<Feather name="award" size={36} color={colors.primary} />
					</View>
					<Text style={styles.placeholderTitle}>Wkrótce</Text>
					<Text style={styles.placeholderSubtitle}>
						Tu pojawi się ranking najaktywniejszych autorów pomysłów —
						kto zgłasza najwięcej, kto ma najwięcej polubień i wdrożeń.
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default Ranking;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	content: {
		padding: 20,
		gap: 20,
	},
	header: {
		gap: 4,
	},
	title: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.text,
	},
	placeholderCard: {
		backgroundColor: colors.surface,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 28,
		alignItems: 'center',
		gap: 12,
	},
	iconWrapper: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#eef2ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	placeholderTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: colors.text,
		marginTop: 4,
	},
	placeholderSubtitle: {
		fontSize: 14,
		color: colors.muted,
		textAlign: 'center',
		lineHeight: 20,
	},
});
