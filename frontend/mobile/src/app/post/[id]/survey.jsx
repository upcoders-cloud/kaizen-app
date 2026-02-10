import {useMemo, useState} from 'react';
import {
	Keyboard,
	Pressable,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather} from '@expo/vector-icons';
import colors from 'theme/colors';
import Input from 'components/Input/Input';
import Button from 'components/Button/Button';
import Text from 'components/Text/Text';
import KeyboardAwareScrollView from 'components/KeyboardAwareScrollView/KeyboardAwareScrollView';
import OptionPills from 'components/OptionPills/OptionPills';
import postsService from 'src/server/services/postsService';

const UNITS = [
	{label: 'Dziennie', value: 'DAY'},
	{label: 'Tygodniowo', value: 'WEEK'},
	{label: 'Miesięcznie', value: 'MONTH'},
];

const UNIT_MULTIPLIERS = {DAY: 22, WEEK: 4, MONTH: 1};
const HOURLY_RATE = 60;

const SurveyScreen = () => {
	const router = useRouter();
	const {id} = useLocalSearchParams();
	const [frequencyValue, setFrequencyValue] = useState('');
	const [frequencyUnit, setFrequencyUnit] = useState(UNITS[0].value);
	const [affectedPeople, setAffectedPeople] = useState('');
	const [timeLostMinutes, setTimeLostMinutes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const preview = useMemo(() => {
		const freq = Number(frequencyValue) || 0;
		const people = Number(affectedPeople) || 0;
		const minutes = Number(timeLostMinutes) || 0;
		const multiplier = UNIT_MULTIPLIERS[frequencyUnit] || 1;

		const totalMinutes = freq * people * minutes * multiplier;
		const hours = totalMinutes / 60;
		const savings = hours * HOURLY_RATE;

		return {
			hours: Math.round(hours * 100) / 100,
			savings: Math.round(savings * 100) / 100,
			hasData: freq > 0 && people > 0 && minutes > 0,
		};
	}, [frequencyValue, frequencyUnit, affectedPeople, timeLostMinutes]);

	const handleClose = () => {
		if (id) {
			router.replace({pathname: '/post/[id]', params: {id, backTo: 'home'}});
			return;
		}
		router.back();
	};

	const handleSubmit = async () => {
		if (!id) return;
		setError(null);

		const payload = {
			frequency_value: Number(frequencyValue),
			frequency_unit: frequencyUnit,
			affected_people: Number(affectedPeople),
			time_lost_minutes: Number(timeLostMinutes),
		};

		if (
			!Number.isFinite(payload.frequency_value) || payload.frequency_value <= 0 ||
			!Number.isFinite(payload.affected_people) || payload.affected_people <= 0 ||
			!Number.isFinite(payload.time_lost_minutes) || payload.time_lost_minutes <= 0
		) {
			setError('Uzupełnij wszystkie pola wartościami większymi od 0.');
			return;
		}

		setLoading(true);
		try {
			let response;
			try {
				response = await postsService.createSurvey(id, payload);
			} catch (err) {
				if (err?.status === 400 && `${err?.message}`.includes('Ankieta')) {
					response = await postsService.updateSurvey(id, payload);
				} else {
					throw err;
				}
			}

			router.replace({
				pathname: `/post/${id}/survey-results`,
				params: {
					hours: response?.estimated_time_savings_hours,
					savings: response?.estimated_financial_savings,
					frequency: frequencyValue,
					unit: frequencyUnit,
					people: affectedPeople,
					minutes: timeLostMinutes,
				},
			});
		} catch (err) {
			setError(err?.message || 'Nie udało się zapisać ankiety.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Ankieta',
					headerShown: true,
					headerTitleAlign: 'center',
					contentStyle: {backgroundColor: colors.background},
					headerLeft: () => null,
					headerRight: () => (
						<Pressable onPress={handleClose} style={styles.deferButton}>
							<Text style={styles.deferText}>Pomiń</Text>
						</Pressable>
					),
				}}
			/>
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
					<KeyboardAwareScrollView
						contentContainerStyle={styles.container}
						keyboardVerticalOffset={12}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.header}>
							<Text style={styles.title}>Oszacuj korzyści</Text>
							<Text style={styles.subtitle}>
								Podaj dane o problemie, a wyliczymy ile czasu i pieniędzy można zaoszczędzić miesięcznie.
							</Text>
						</View>

						<View style={styles.card}>
							<View style={styles.fieldHeader}>
								<Feather name="repeat" size={14} color={colors.primary} />
								<Text style={styles.fieldLabel}>Jak często występuje problem?</Text>
							</View>
							<View style={styles.frequencyRow}>
								<View style={styles.frequencyInput}>
									<Input
										placeholder="np. 3"
										value={frequencyValue}
										onChangeText={setFrequencyValue}
										keyboardType="numeric"
										returnKeyType="done"
									/>
								</View>
								<Text style={styles.frequencyXLabel}>razy</Text>
							</View>
							<OptionPills options={UNITS} value={frequencyUnit} onChange={setFrequencyUnit} />
						</View>

						<View style={styles.card}>
							<View style={styles.fieldHeader}>
								<Feather name="users" size={14} color={colors.primary} />
								<Text style={styles.fieldLabel}>Ile osób dotyczy ten problem?</Text>
							</View>
							<Input
								placeholder="np. 5"
								value={affectedPeople}
								onChangeText={setAffectedPeople}
								keyboardType="numeric"
								returnKeyType="done"
							/>
						</View>

						<View style={styles.card}>
							<View style={styles.fieldHeader}>
								<Feather name="clock" size={14} color={colors.primary} />
								<Text style={styles.fieldLabel}>Ile minut traci każda osoba na jedno zdarzenie?</Text>
							</View>
							<Input
								placeholder="np. 15"
								value={timeLostMinutes}
								onChangeText={setTimeLostMinutes}
								keyboardType="numeric"
								returnKeyType="done"
							/>
						</View>

						{preview.hasData ? (
							<View style={styles.previewCard}>
								<Text style={styles.previewTitle}>Podgląd oszczędności / miesiąc</Text>
								<View style={styles.previewRow}>
									<View style={styles.previewItem}>
										<Feather name="clock" size={18} color={colors.primary} />
										<Text style={styles.previewValue}>{preview.hours.toFixed(1)} h</Text>
									</View>
									<View style={styles.previewDivider} />
									<View style={styles.previewItem}>
										<Feather name="trending-up" size={18} color="#16a34a" />
										<Text style={[styles.previewValue, styles.previewValueGreen]}>
											{preview.savings.toLocaleString('pl-PL', {minimumFractionDigits: 0, maximumFractionDigits: 0})} PLN
										</Text>
									</View>
								</View>
							</View>
						) : null}

						{error ? (
							<View style={styles.errorBanner}>
								<Feather name="alert-circle" size={14} color={colors.danger} />
								<Text style={styles.errorText}>{error}</Text>
							</View>
						) : null}

						<Button
							title="Przelicz i zapisz"
							onPress={handleSubmit}
							loading={loading}
							leftIcon={<Feather name="bar-chart-2" size={16} color="#fff" />}
							style={styles.submitButton}
						/>
					</KeyboardAwareScrollView>
				</TouchableWithoutFeedback>
			</SafeAreaView>
		</>
	);
};

export default SurveyScreen;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: colors.background,
	},
	container: {
		paddingHorizontal: 16,
		paddingBottom: 32,
		paddingTop: 8,
		gap: 14,
	},
	header: {
		gap: 4,
	},
	title: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.text,
	},
	subtitle: {
		color: colors.muted,
		fontSize: 14,
		lineHeight: 20,
	},
	card: {
		gap: 10,
		padding: 16,
		borderRadius: 14,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	fieldHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	fieldLabel: {
		flex: 1,
		fontSize: 14,
		fontWeight: '700',
		color: colors.text,
	},
	frequencyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	frequencyInput: {
		flex: 1,
	},
	frequencyXLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.muted,
		paddingBottom: 4,
	},
	previewCard: {
		gap: 12,
		padding: 16,
		borderRadius: 14,
		backgroundColor: '#f0f4ff',
		borderWidth: 1,
		borderColor: '#c7d2fe',
	},
	previewTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.primary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	previewRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	previewItem: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		justifyContent: 'center',
	},
	previewDivider: {
		width: 1,
		height: 28,
		backgroundColor: '#c7d2fe',
	},
	previewValue: {
		fontSize: 20,
		fontWeight: '800',
		color: colors.primary,
	},
	previewValueGreen: {
		color: '#16a34a',
	},
	errorBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: 10,
		backgroundColor: '#fef2f2',
		borderWidth: 1,
		borderColor: '#fecaca',
	},
	errorText: {
		flex: 1,
		color: colors.danger,
		fontSize: 13,
		fontWeight: '600',
	},
	submitButton: {
		marginTop: 4,
	},
	deferButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	deferText: {
		fontSize: 13,
		fontWeight: '600',
		color: colors.primary,
	},
});
