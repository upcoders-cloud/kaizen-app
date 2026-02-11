import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import {useRef} from 'react';
import ConfettiCannon from 'react-native-confetti-cannon';
import colors from 'theme/colors';
import Text from 'components/Text/Text';

const UNIT_LABELS = {DAY: 'Dziennie', WEEK: 'Tygodniowo', MONTH: 'Miesięcznie'};
const UNIT_MULTIPLIER_LABELS = {DAY: '× 22 dni', WEEK: '× 4 tyg.', MONTH: '× 1'};

const SurveyResults = () => {
	const router = useRouter();
	const {id, hours, savings, frequency, unit, people, minutes} = useLocalSearchParams();

	const parsedHours = Number(hours);
	const parsedSavings = Number(savings);
	const hoursLabel = Number.isFinite(parsedHours) ? parsedHours.toFixed(1) : '0.0';
	const savingsLabel = Number.isFinite(parsedSavings)
		? parsedSavings.toLocaleString('pl-PL', {minimumFractionDigits: 0, maximumFractionDigits: 0})
		: '0';

	const hasBreakdown = frequency && people && minutes;

	const confettiFiredRef = useRef(false);
	const shouldShowConfetti = !confettiFiredRef.current;
	if (shouldShowConfetti) {
		confettiFiredRef.current = true;
	}

	const handleClose = () => {
		if (id) {
			router.replace(`/post/${id}`);
			return;
		}
		router.back();
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Podsumowanie',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
					presentation: 'modal',
					headerBackVisible: false,
					headerLeft: () => null,
					headerRight: () => (
						<Pressable onPress={handleClose} style={styles.headerClose}>
							<Feather name="x" size={18} color={colors.primary} />
						</Pressable>
					),
				}}
			/>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
					<View style={styles.successBanner}>
						<View style={styles.successIcon}>
							<Feather name="check" size={24} color="#fff" />
						</View>
						<Text style={styles.successTitle}>Ankieta zapisana</Text>
						<Text style={styles.successSubtitle}>
							Poniżej znajdziesz podsumowanie oszacowanych korzyści.
						</Text>
					</View>

					<View style={styles.resultsCard}>
						<Text style={styles.resultsTitle}>Oszczędności / miesiąc</Text>
						<View style={styles.resultsRow}>
							<View style={styles.resultItem}>
								<Feather name="clock" size={20} color={colors.primary} />
								<Text style={styles.resultValue}>{hoursLabel} h</Text>
								<Text style={styles.resultLabel}>Czas</Text>
							</View>
							<View style={styles.resultDivider} />
							<View style={styles.resultItem}>
								<Feather name="trending-up" size={20} color="#16a34a" />
								<Text style={[styles.resultValue, styles.resultValueGreen]}>
									{savingsLabel} PLN
								</Text>
								<Text style={styles.resultLabel}>Oszczędności</Text>
							</View>
						</View>
					</View>

					{hasBreakdown ? (
						<View style={styles.breakdownCard}>
							<Text style={styles.breakdownTitle}>Jak to wyliczyliśmy?</Text>

							<View style={styles.inputsGrid}>
								<InputRow
									icon="repeat"
									label="Częstotliwość"
									value={`${frequency} razy ${(UNIT_LABELS[unit] || unit || '').toLowerCase()}`}
								/>
								<InputRow
									icon="users"
									label="Dotknięte osoby"
									value={`${people} os.`}
								/>
								<InputRow
									icon="clock"
									label="Stracony czas"
									value={`${minutes} min / zdarzenie`}
								/>
							</View>

							<View style={styles.formulaDivider} />

							<View style={styles.formulaBlock}>
								<Text style={styles.formulaLabel}>Wzór (miesięcznie)</Text>
								<Text style={styles.formulaText}>
									{frequency} × {people} os. × {minutes} min {UNIT_MULTIPLIER_LABELS[unit] || ''}
								</Text>
								<Text style={styles.formulaResult}>
									= {hoursLabel} h × 60 PLN/h = {savingsLabel} PLN
								</Text>
							</View>
						</View>
					) : null}

					<Pressable style={styles.closeButton} onPress={handleClose}>
						<Feather name="arrow-left" size={16} color="#fff" />
						<Text style={styles.closeText}>Wróć do zgłoszenia</Text>
					</Pressable>
				</ScrollView>
				{shouldShowConfetti ? (
					<View pointerEvents="none" style={styles.confettiLayer}>
						<ConfettiCannon
							count={60}
							origin={{x: 0, y: 0}}
							fadeOut
							explosionSpeed={220}
							fallSpeed={1800}
							recycle={false}
						/>
					</View>
				) : null}
			</SafeAreaView>
		</>
	);
};

const InputRow = ({icon, label, value}) => (
	<View style={styles.inputRow}>
		<View style={styles.inputRowIcon}>
			<Feather name={icon} size={13} color={colors.primary} />
		</View>
		<Text style={styles.inputRowLabel}>{label}</Text>
		<Text style={styles.inputRowValue}>{value}</Text>
	</View>
);

export default SurveyResults;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	container: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 32,
		gap: 16,
	},
	successBanner: {
		alignItems: 'center',
		gap: 8,
		paddingTop: 36,
		paddingBottom: 20,
	},
	successIcon: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#16a34a',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	successTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.text,
	},
	successSubtitle: {
		color: colors.muted,
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20,
		paddingHorizontal: 20,
	},
	resultsCard: {
		gap: 14,
		padding: 18,
		borderRadius: 14,
		backgroundColor: '#f0f4ff',
		borderWidth: 1,
		borderColor: '#c7d2fe',
	},
	resultsTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.primary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	resultsRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	resultItem: {
		flex: 1,
		alignItems: 'center',
		gap: 6,
	},
	resultDivider: {
		width: 1,
		height: 48,
		backgroundColor: '#c7d2fe',
	},
	resultValue: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.primary,
	},
	resultValueGreen: {
		color: '#16a34a',
	},
	resultLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.muted,
	},
	breakdownCard: {
		gap: 14,
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	breakdownTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: colors.text,
	},
	inputsGrid: {
		gap: 10,
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	inputRowIcon: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#e0e7ff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	inputRowLabel: {
		flex: 1,
		fontSize: 13,
		fontWeight: '600',
		color: colors.muted,
	},
	inputRowValue: {
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	formulaDivider: {
		height: 1,
		backgroundColor: colors.border,
	},
	formulaBlock: {
		gap: 4,
	},
	formulaLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
		marginBottom: 2,
	},
	formulaText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	formulaResult: {
		fontSize: 14,
		fontWeight: '700',
		color: '#16a34a',
	},
	closeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		alignSelf: 'center',
		paddingVertical: 12,
		paddingHorizontal: 28,
		borderRadius: 10,
		backgroundColor: colors.primary,
		marginTop: 4,
	},
	closeText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 15,
	},
	headerClose: {
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	confettiLayer: {
		...StyleSheet.absoluteFillObject,
	},
});
